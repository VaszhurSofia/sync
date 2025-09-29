import { query, transaction, setUserContext } from '../utils/database';
import { encrypt, decrypt, EncryptedData } from '../utils/crypto';

export type SessionMode = 'couple' | 'solo';
export type TurnState = 'awaitingA' | 'awaitingB' | 'ai_reflect' | 'boundary';

export interface Session {
  id: string;
  mode: SessionMode;
  couple_id?: string;
  owner_user_id?: string;
  started_at: Date;
  ended_at?: Date;
  boundary_flag: boolean;
  turn_state: TurnState;
  share_token?: string;
}

export interface CreateSessionRequest {
  mode: SessionMode;
  coupleId?: string;
  ownerUserId?: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  mode: SessionMode;
  turnState: TurnState;
}

export class SessionModel {
  static async create(request: CreateSessionRequest, userId: string): Promise<CreateSessionResponse> {
    return await transaction(async (client) => {
      await setUserContext(client, userId);
      
      const { mode, coupleId, ownerUserId } = request;
      
      // Validate mode-specific requirements
      if (mode === 'couple' && !coupleId) {
        throw new Error('coupleId is required for couple mode');
      }
      
      if (mode === 'solo' && !ownerUserId) {
        throw new Error('ownerUserId is required for solo mode');
      }
      
      // Check access permissions
      if (mode === 'couple') {
        const roleResult = await client.query(
          'SELECT role FROM couple_members WHERE user_id = $1 AND couple_id = $2',
          [userId, coupleId]
        );
        
        if (roleResult.rows.length === 0) {
          throw new Error('User is not a member of this couple');
        }
      }
      
      if (mode === 'solo' && ownerUserId !== userId) {
        throw new Error('User can only create solo sessions for themselves');
      }
      
      // Determine initial turn state
      const turnState: TurnState = mode === 'couple' ? 'awaitingA' : 'ai_reflect';
      
      // Create session
      const result = await client.query(
        `INSERT INTO sessions (mode, couple_id, owner_user_id, turn_state) 
         VALUES ($1, $2, $3, $4) RETURNING id, mode, turn_state`,
        [mode, coupleId || null, ownerUserId || null, turnState]
      );
      
      const session = result.rows[0];
      
      return {
        sessionId: session.id,
        mode: session.mode,
        turnState: session.turn_state,
      };
    });
  }
  
  static async findById(id: string, userId: string): Promise<Session | null> {
    const result = await query(
      'SELECT * FROM sessions WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const session = result.rows[0];
    
    // Check access permissions
    if (session.mode === 'couple') {
      const roleResult = await query(
        'SELECT role FROM couple_members WHERE user_id = $1 AND couple_id = $2',
        [userId, session.couple_id]
      );
      
      if (roleResult.rows.length === 0) {
        throw new Error('Access denied: User is not a member of this couple');
      }
    } else if (session.mode === 'solo') {
      if (session.owner_user_id !== userId) {
        throw new Error('Access denied: User can only access their own solo sessions');
      }
    }
    
    return session;
  }
  
  static async updateTurnState(id: string, turnState: TurnState, userId: string): Promise<void> {
    await query(
      'UPDATE sessions SET turn_state = $1 WHERE id = $2',
      [turnState, id]
    );
  }
  
  static async setBoundaryFlag(id: string, flag: boolean, userId: string): Promise<void> {
    await query(
      'UPDATE sessions SET boundary_flag = $1, turn_state = $2 WHERE id = $2',
      [flag, flag ? 'boundary' : 'awaitingA', id]
    );
  }
  
  static async endSession(id: string, userId: string): Promise<void> {
    await query(
      'UPDATE sessions SET ended_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }
  
  static async deleteSession(id: string, userId: string): Promise<void> {
    return await transaction(async (client) => {
      await setUserContext(client, userId);
      
      // Delete all related data
      await client.query('DELETE FROM session_feedback WHERE session_id = $1', [id]);
      await client.query('DELETE FROM messages WHERE session_id = $1', [id]);
      await client.query('DELETE FROM sessions WHERE id = $1', [id]);
    });
  }
  
  static async getTurnState(id: string, userId: string): Promise<TurnState> {
    const session = await this.findById(id, userId);
    if (!session) {
      throw new Error('Session not found');
    }
    return session.turn_state;
  }
  
  static async canUserSendMessage(id: string, userId: string, sender: 'userA' | 'userB'): Promise<boolean> {
    const session = await this.findById(id, userId);
    if (!session) {
      return false;
    }
    
    // Check if session is locked
    if (session.boundary_flag) {
      return false;
    }
    
    // Check turn-taking for couple mode
    if (session.mode === 'couple') {
      const roleResult = await query(
        'SELECT role FROM couple_members WHERE user_id = $1 AND couple_id = $2',
        [userId, session.couple_id]
      );
      
      if (roleResult.rows.length === 0) {
        return false;
      }
      
      const userRole = roleResult.rows[0].role;
      
      // Check if it's the user's turn
      if (session.turn_state === 'awaitingA' && userRole === 'userA') {
        return true;
      }
      if (session.turn_state === 'awaitingB' && userRole === 'userB') {
        return true;
      }
      
      return false;
    }
    
    // Solo mode: owner can always send messages
    if (session.mode === 'solo' && session.owner_user_id === userId) {
      return true;
    }
    
    return false;
  }
  
  static async getNextTurnState(currentState: TurnState, mode: SessionMode): Promise<TurnState> {
    if (mode === 'solo') {
      return 'ai_reflect';
    }
    
    switch (currentState) {
      case 'awaitingA':
        return 'awaitingB';
      case 'awaitingB':
        return 'ai_reflect';
      case 'ai_reflect':
        return 'awaitingA';
      case 'boundary':
        return 'boundary';
      default:
        return 'awaitingA';
    }
  }
}