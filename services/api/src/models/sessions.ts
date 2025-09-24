import { Pool } from 'pg';
import { getEncryption } from '../crypto/aes-gcm';
import { logger } from '../logger';

export type TurnState = 'awaitingA' | 'awaitingB' | 'ai_reflect' | 'boundary';

export interface Session {
  id: string;
  coupleId: string;
  startedAt: Date;
  endedAt?: Date;
  turnState: TurnState;
  boundaryFlag: boolean;
  summaryText?: string;
  summaryTextEnc?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionData {
  coupleId: string;
  userId: string;
}

export interface UpdateSessionData {
  turnState?: TurnState;
  boundaryFlag?: boolean;
  summaryText?: string;
  endedAt?: Date;
}

export class SessionModel {
  constructor(private db: Pool) {}

  /**
   * Create a new session
   */
  async create(data: CreateSessionData): Promise<Session> {
    const encryption = getEncryption();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const query = `
      INSERT INTO sessions (id, couple_id, started_at, turn_state, boundary_flag, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const now = new Date();
    const values = [
      sessionId,
      data.coupleId,
      now,
      'awaitingA', // Default turn state
      false, // Default boundary flag
      now,
      now
    ];
    
    try {
      const result = await this.db.query(query, values);
      const session = this.mapRowToSession(result.rows[0]);
      
      logger.info('Session created', {
        sessionId: session.id,
        coupleId: session.coupleId,
        turnState: session.turnState
      });
      
      return session;
    } catch (error) {
      logger.error('Failed to create session', { error: error instanceof Error ? error.message : "Unknown error", data });
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getById(sessionId: string): Promise<Session | null> {
    const query = `
      SELECT * FROM sessions WHERE id = $1
    `;
    
    try {
      const result = await this.db.query(query, [sessionId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToSession(result.rows[0]);
    } catch (error) {
      logger.error('Failed to get session', { error: error instanceof Error ? error.message : "Unknown error", sessionId });
      throw error;
    }
  }

  /**
   * Update session
   */
  async update(sessionId: string, data: UpdateSessionData): Promise<Session | null> {
    const encryption = getEncryption();
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.turnState !== undefined) {
      updates.push(`turn_state = $${paramCount++}`);
      values.push(data.turnState);
    }

    if (data.boundaryFlag !== undefined) {
      updates.push(`boundary_flag = $${paramCount++}`);
      values.push(data.boundaryFlag);
    }

    if (data.summaryText !== undefined) {
      const encryptedSummary = await encryption.encryptField('sessions.summary_text', data.summaryText);
      updates.push(`summary_text_enc = $${paramCount++}`);
      values.push(encryptedSummary);
    }

    if (data.endedAt !== undefined) {
      updates.push(`ended_at = $${paramCount++}`);
      values.push(data.endedAt);
    }

    if (updates.length === 0) {
      return this.getById(sessionId);
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    values.push(sessionId); // WHERE clause parameter

    const query = `
      UPDATE sessions 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const session = this.mapRowToSession(result.rows[0]);
      
      logger.info('Session updated', {
        sessionId: session.id,
        updates: Object.keys(data)
      });
      
      return session;
    } catch (error) {
      logger.error('Failed to update session', { error: error instanceof Error ? error.message : "Unknown error", sessionId, data });
      throw error;
    }
  }

  /**
   * Update turn state
   */
  async updateTurnState(sessionId: string, turnState: TurnState): Promise<Session | null> {
    return this.update(sessionId, { turnState });
  }

  /**
   * Set boundary flag
   */
  async setBoundaryFlag(sessionId: string, boundaryFlag: boolean = true): Promise<Session | null> {
    return this.update(sessionId, { 
      boundaryFlag,
      turnState: boundaryFlag ? 'boundary' : 'awaitingA'
    });
  }

  /**
   * End session
   */
  async endSession(sessionId: string): Promise<Session | null> {
    return this.update(sessionId, { endedAt: new Date() });
  }

  /**
   * Delete session
   */
  async delete(sessionId: string): Promise<boolean> {
    const query = `DELETE FROM sessions WHERE id = $1`;
    
    try {
      const result = await this.db.query(query, [sessionId]);
      
      logger.info('Session deleted', { sessionId });
      
      return result.rowCount > 0;
    } catch (error) {
      logger.error('Failed to delete session', { error: error instanceof Error ? error.message : "Unknown error", sessionId });
      throw error;
    }
  }

  /**
   * Get sessions by couple ID
   */
  async getByCoupleId(coupleId: string, limit: number = 50): Promise<Session[]> {
    const query = `
      SELECT * FROM sessions 
      WHERE couple_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    
    try {
      const result = await this.db.query(query, [coupleId, limit]);
      
      return result.rows.map(row => this.mapRowToSession(row));
    } catch (error) {
      logger.error('Failed to get sessions by couple', { error: error instanceof Error ? error.message : "Unknown error", coupleId });
      throw error;
    }
  }

  /**
   * Check if user can send message (turn validation)
   */
  async canUserSendMessage(sessionId: string, userId: string, userAId: string, userBId: string): Promise<{
    canSend: boolean;
    currentTurn: TurnState;
    expectedTurn: TurnState;
    reason?: string;
  }> {
    const session = await this.getById(sessionId);
    
    if (!session) {
      return {
        canSend: false,
        currentTurn: 'awaitingA',
        expectedTurn: 'awaitingA',
        reason: 'Session not found'
      };
    }

    if (session.endedAt) {
      return {
        canSend: false,
        currentTurn: session.turnState,
        expectedTurn: session.turnState,
        reason: 'Session has ended'
      };
    }

    if (session.boundaryFlag) {
      return {
        canSend: false,
        currentTurn: session.turnState,
        expectedTurn: session.turnState,
        reason: 'Session has reached boundary'
      };
    }

    // Determine expected turn based on user
    let expectedTurn: TurnState;
    if (userId === userAId) {
      expectedTurn = 'awaitingA';
    } else if (userId === userBId) {
      expectedTurn = 'awaitingB';
    } else {
      return {
        canSend: false,
        currentTurn: session.turnState,
        expectedTurn: 'awaitingA',
        reason: 'User not part of this couple'
      };
    }

    // Check if it's the user's turn
    if (session.turnState === expectedTurn) {
      return {
        canSend: true,
        currentTurn: session.turnState,
        expectedTurn
      };
    } else {
      return {
        canSend: false,
        currentTurn: session.turnState,
        expectedTurn,
        reason: `It is not your turn - currently ${session.turnState}`
      };
    }
  }

  /**
   * Advance turn state after message
   */
  async advanceTurnAfterMessage(sessionId: string, userId: string, userAId: string, userBId: string): Promise<Session | null> {
    const session = await this.getById(sessionId);
    
    if (!session) {
      return null;
    }

    let nextTurnState: TurnState;
    
    if (session.turnState === 'awaitingA' && userId === userAId) {
      nextTurnState = 'awaitingB';
    } else if (session.turnState === 'awaitingB' && userId === userBId) {
      nextTurnState = 'ai_reflect';
    } else {
      // Invalid state transition
      return session;
    }

    return this.updateTurnState(sessionId, nextTurnState);
  }

  /**
   * Reset turn state after AI reflection
   */
  async resetTurnAfterAI(sessionId: string): Promise<Session | null> {
    return this.updateTurnState(sessionId, 'awaitingA');
  }

  /**
   * Map database row to Session object
   */
  private mapRowToSession(row: any): Session {
    return {
      id: row.id,
      coupleId: row.couple_id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      turnState: row.turn_state,
      boundaryFlag: row.boundary_flag,
      summaryTextEnc: row.summary_text_enc,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Decrypt session summary text
   */
  async getDecryptedSummary(session: Session): Promise<string | undefined> {
    if (!session.summaryTextEnc) {
      return undefined;
    }

    try {
      const encryption = getEncryption();
      return await encryption.decryptField('sessions.summary_text', session.summaryTextEnc);
    } catch (error) {
      logger.error('Failed to decrypt session summary', { 
        error: error instanceof Error ? error.message : "Unknown error", 
        sessionId: session.id 
      });
      return undefined;
    }
  }
}
