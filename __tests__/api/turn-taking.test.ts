/**
 * Turn-Taking State Machine Tests
 * Tests the session turn-taking functionality with two simulated clients
 */

import { FastifyInstance } from 'fastify';
import { SessionModel, TurnState } from '../../services/api/src/models/sessions';
import { getEncryption } from '../../services/api/src/crypto/aes-gcm';

// Mock database for testing
class MockDatabase {
  private sessions = new Map<string, any>();
  private couples = new Map<string, any>();
  private messages = new Map<string, any>();

  async query(sql: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
    // Simple mock implementation for testing
    if (sql.includes('INSERT INTO sessions')) {
      const session = {
        id: params[0],
        couple_id: params[1],
        started_at: params[2],
        turn_state: params[3],
        boundary_flag: params[4],
        created_at: params[5],
        updated_at: params[6]
      };
      this.sessions.set(params[0], session);
      return { rows: [session], rowCount: 1 };
    }
    
    if (sql.includes('SELECT * FROM sessions WHERE id =')) {
      const session = this.sessions.get(params[0]);
      return { rows: session ? [session] : [], rowCount: session ? 1 : 0 };
    }
    
    if (sql.includes('UPDATE sessions')) {
      const session = this.sessions.get(params[params.length - 1]);
      if (session) {
        // Update session based on parameters
        if (params.includes('awaitingA') || params.includes('awaitingB') || params.includes('ai_reflect') || params.includes('boundary')) {
          session.turn_state = params.find(p => ['awaitingA', 'awaitingB', 'ai_reflect', 'boundary'].includes(p));
        }
        if (params.includes(true) || params.includes(false)) {
          session.boundary_flag = params.find(p => typeof p === 'boolean');
        }
        session.updated_at = new Date();
        this.sessions.set(session.id, session);
        return { rows: [session], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
    
    if (sql.includes('SELECT user_a_id, user_b_id FROM couples WHERE id =')) {
      const couple = this.couples.get(params[0]);
      return { rows: couple ? [couple] : [], rowCount: couple ? 1 : 0 };
    }
    
    if (sql.includes('INSERT INTO messages')) {
      const message = {
        id: params[0],
        session_id: params[1],
        sender: params[2],
        content_enc: params[3],
        created_at: params[4],
        client_message_id: params[5]
      };
      this.messages.set(params[0], message);
      return { rows: [message], rowCount: 1 };
    }
    
    if (sql.includes('SELECT id FROM messages WHERE session_id =') && sql.includes('client_message_id =')) {
      const message = Array.from(this.messages.values()).find(m => 
        m.session_id === params[0] && m.client_message_id === params[1]
      );
      return { rows: message ? [message] : [], rowCount: message ? 1 : 0 };
    }
    
    return { rows: [], rowCount: 0 };
  }

  // Helper methods for test setup
  createCouple(id: string, userAId: string, userBId: string) {
    this.couples.set(id, {
      id,
      user_a_id: userAId,
      user_b_id: userBId
    });
  }
}

describe('Turn-Taking State Machine', () => {
  let sessionModel: SessionModel;
  let mockDb: MockDatabase;
  let userAId: string;
  let userBId: string;
  let coupleId: string;

  beforeEach(async () => {
    mockDb = new MockDatabase();
    sessionModel = new SessionModel(mockDb as any);
    
    // Setup test users and couple
    userAId = 'user_a_123';
    userBId = 'user_b_456';
    coupleId = 'couple_789';
    
    mockDb.createCouple(coupleId, userAId, userBId);
  });

  describe('Session Creation', () => {
    it('should create session with awaitingA turn state', async () => {
      const session = await sessionModel.create({
        coupleId,
        userId: userAId
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.coupleId).toBe(coupleId);
      expect(session.turnState).toBe('awaitingA');
      expect(session.boundaryFlag).toBe(false);
      expect(session.endedAt).toBeUndefined();
    });
  });

  describe('Turn Validation', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await sessionModel.create({
        coupleId,
        userId: userAId
      });
      sessionId = session.id;
    });

    it('should allow userA to send message when turn state is awaitingA', async () => {
      const result = await sessionModel.canUserSendMessage(sessionId, userAId, userAId, userBId);

      expect(result.canSend).toBe(true);
      expect(result.currentTurn).toBe('awaitingA');
      expect(result.expectedTurn).toBe('awaitingA');
      expect(result.reason).toBeUndefined();
    });

    it('should block userB from sending message when turn state is awaitingA', async () => {
      const result = await sessionModel.canUserSendMessage(sessionId, userBId, userAId, userBId);

      expect(result.canSend).toBe(false);
      expect(result.currentTurn).toBe('awaitingA');
      expect(result.expectedTurn).toBe('awaitingB');
      expect(result.reason).toBe('It is not your turn - currently awaitingA');
    });

    it('should allow userB to send message when turn state is awaitingB', async () => {
      // First advance to awaitingB
      await sessionModel.updateTurnState(sessionId, 'awaitingB');

      const result = await sessionModel.canUserSendMessage(sessionId, userBId, userAId, userBId);

      expect(result.canSend).toBe(true);
      expect(result.currentTurn).toBe('awaitingB');
      expect(result.expectedTurn).toBe('awaitingB');
    });

    it('should block userA from sending message when turn state is awaitingB', async () => {
      // First advance to awaitingB
      await sessionModel.updateTurnState(sessionId, 'awaitingB');

      const result = await sessionModel.canUserSendMessage(sessionId, userAId, userAId, userBId);

      expect(result.canSend).toBe(false);
      expect(result.currentTurn).toBe('awaitingB');
      expect(result.expectedTurn).toBe('awaitingA');
      expect(result.reason).toBe('It is not your turn - currently awaitingB');
    });

    it('should block all users when turn state is ai_reflect', async () => {
      await sessionModel.updateTurnState(sessionId, 'ai_reflect');

      const resultA = await sessionModel.canUserSendMessage(sessionId, userAId, userAId, userBId);
      const resultB = await sessionModel.canUserSendMessage(sessionId, userBId, userAId, userBId);

      expect(resultA.canSend).toBe(false);
      expect(resultA.reason).toBe('It is not your turn - currently ai_reflect');
      expect(resultB.canSend).toBe(false);
      expect(resultB.reason).toBe('It is not your turn - currently ai_reflect');
    });

    it('should block all users when turn state is boundary', async () => {
      await sessionModel.updateTurnState(sessionId, 'boundary');

      const resultA = await sessionModel.canUserSendMessage(sessionId, userAId, userAId, userBId);
      const resultB = await sessionModel.canUserSendMessage(sessionId, userBId, userAId, userBId);

      expect(resultA.canSend).toBe(false);
      expect(resultA.reason).toBe('It is not your turn - currently boundary');
      expect(resultB.canSend).toBe(false);
      expect(resultB.reason).toBe('It is not your turn - currently boundary');
    });

    it('should block user not part of couple', async () => {
      const result = await sessionModel.canUserSendMessage(sessionId, 'unknown_user', userAId, userBId);

      expect(result.canSend).toBe(false);
      expect(result.reason).toBe('User not part of this couple');
    });

    it('should block when session has ended', async () => {
      await sessionModel.endSession(sessionId);

      const result = await sessionModel.canUserSendMessage(sessionId, userAId, userAId, userBId);

      expect(result.canSend).toBe(false);
      expect(result.reason).toBe('Session has ended');
    });

    it('should block when session has boundary flag', async () => {
      await sessionModel.setBoundaryFlag(sessionId, true);

      const result = await sessionModel.canUserSendMessage(sessionId, userAId, userAId, userBId);

      expect(result.canSend).toBe(false);
      expect(result.reason).toBe('Session has reached boundary');
    });
  });

  describe('Turn State Transitions', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await sessionModel.create({
        coupleId,
        userId: userAId
      });
      sessionId = session.id;
    });

    it('should advance from awaitingA to awaitingB when userA sends message', async () => {
      const updatedSession = await sessionModel.advanceTurnAfterMessage(sessionId, userAId, userAId, userBId);

      expect(updatedSession).toBeDefined();
      expect(updatedSession?.turnState).toBe('awaitingB');
    });

    it('should advance from awaitingB to ai_reflect when userB sends message', async () => {
      // First advance to awaitingB
      await sessionModel.updateTurnState(sessionId, 'awaitingB');

      const updatedSession = await sessionModel.advanceTurnAfterMessage(sessionId, userBId, userAId, userBId);

      expect(updatedSession).toBeDefined();
      expect(updatedSession?.turnState).toBe('ai_reflect');
    });

    it('should reset to awaitingA after AI reflection', async () => {
      // First advance to ai_reflect
      await sessionModel.updateTurnState(sessionId, 'ai_reflect');

      const updatedSession = await sessionModel.resetTurnAfterAI(sessionId);

      expect(updatedSession).toBeDefined();
      expect(updatedSession?.turnState).toBe('awaitingA');
    });

    it('should not advance turn for invalid user', async () => {
      const updatedSession = await sessionModel.advanceTurnAfterMessage(sessionId, userBId, userAId, userBId);

      expect(updatedSession).toBeDefined();
      expect(updatedSession?.turnState).toBe('awaitingA'); // Should remain unchanged
    });

    it('should not advance turn for wrong state', async () => {
      // Set to awaitingB
      await sessionModel.updateTurnState(sessionId, 'awaitingB');

      // Try to advance with userA (should not work)
      const updatedSession = await sessionModel.advanceTurnAfterMessage(sessionId, userAId, userAId, userBId);

      expect(updatedSession).toBeDefined();
      expect(updatedSession?.turnState).toBe('awaitingB'); // Should remain unchanged
    });
  });

  describe('Boundary Flag', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await sessionModel.create({
        coupleId,
        userId: userAId
      });
      sessionId = session.id;
    });

    it('should set boundary flag and change turn state to boundary', async () => {
      const updatedSession = await sessionModel.setBoundaryFlag(sessionId, true);

      expect(updatedSession).toBeDefined();
      expect(updatedSession?.boundaryFlag).toBe(true);
      expect(updatedSession?.turnState).toBe('boundary');
    });

    it('should unset boundary flag and reset turn state', async () => {
      // First set boundary flag
      await sessionModel.setBoundaryFlag(sessionId, true);

      // Then unset it
      const updatedSession = await sessionModel.setBoundaryFlag(sessionId, false);

      expect(updatedSession).toBeDefined();
      expect(updatedSession?.boundaryFlag).toBe(false);
      expect(updatedSession?.turnState).toBe('awaitingA');
    });
  });

  describe('Two-Client Simulation', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await sessionModel.create({
        coupleId,
        userId: userAId
      });
      sessionId = session.id;
    });

    it('should handle complete conversation flow', async () => {
      // UserA sends first message
      const turnCheck1 = await sessionModel.canUserSendMessage(sessionId, userAId, userAId, userBId);
      expect(turnCheck1.canSend).toBe(true);

      const session1 = await sessionModel.advanceTurnAfterMessage(sessionId, userAId, userAId, userBId);
      expect(session1?.turnState).toBe('awaitingB');

      // UserB sends response
      const turnCheck2 = await sessionModel.canUserSendMessage(sessionId, userBId, userAId, userBId);
      expect(turnCheck2.canSend).toBe(true);

      const session2 = await sessionModel.advanceTurnAfterMessage(sessionId, userBId, userAId, userBId);
      expect(session2?.turnState).toBe('ai_reflect');

      // AI processes and resets turn
      const session3 = await sessionModel.resetTurnAfterAI(sessionId);
      expect(session3?.turnState).toBe('awaitingA');

      // UserA can send again
      const turnCheck3 = await sessionModel.canUserSendMessage(sessionId, userAId, userAId, userBId);
      expect(turnCheck3.canSend).toBe(true);
    });

    it('should prevent simultaneous typing', async () => {
      // UserA starts typing (turn state is awaitingA)
      const turnCheckA = await sessionModel.canUserSendMessage(sessionId, userAId, userAId, userBId);
      expect(turnCheckA.canSend).toBe(true);

      // UserB tries to type simultaneously (should be blocked)
      const turnCheckB = await sessionModel.canUserSendMessage(sessionId, userBId, userAId, userBId);
      expect(turnCheckB.canSend).toBe(false);
      expect(turnCheckB.reason).toBe('It is not your turn - currently awaitingA');

      // UserA sends message
      await sessionModel.advanceTurnAfterMessage(sessionId, userAId, userAId, userBId);

      // Now UserB can type
      const turnCheckB2 = await sessionModel.canUserSendMessage(sessionId, userBId, userAId, userBId);
      expect(turnCheckB2.canSend).toBe(true);

      // But UserA is now blocked
      const turnCheckA2 = await sessionModel.canUserSendMessage(sessionId, userAId, userAId, userBId);
      expect(turnCheckA2.canSend).toBe(false);
      expect(turnCheckA2.reason).toBe('It is not your turn - currently awaitingB');
    });

    it('should handle boundary scenario', async () => {
      // Normal flow starts
      await sessionModel.advanceTurnAfterMessage(sessionId, userAId, userAId, userBId);
      expect((await sessionModel.getById(sessionId))?.turnState).toBe('awaitingB');

      // Boundary is hit
      await sessionModel.setBoundaryFlag(sessionId, true);
      expect((await sessionModel.getById(sessionId))?.turnState).toBe('boundary');

      // Both users are now blocked
      const turnCheckA = await sessionModel.canUserSendMessage(sessionId, userAId, userAId, userBId);
      const turnCheckB = await sessionModel.canUserSendMessage(sessionId, userBId, userAId, userBId);

      expect(turnCheckA.canSend).toBe(false);
      expect(turnCheckA.reason).toBe('Session has reached boundary');
      expect(turnCheckB.canSend).toBe(false);
      expect(turnCheckB.reason).toBe('Session has reached boundary');
    });
  });

  describe('Session Management', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await sessionModel.create({
        coupleId,
        userId: userAId
      });
      sessionId = session.id;
    });

    it('should end session', async () => {
      const updatedSession = await sessionModel.endSession(sessionId);

      expect(updatedSession).toBeDefined();
      expect(updatedSession?.endedAt).toBeDefined();
    });

    it('should delete session', async () => {
      const deleted = await sessionModel.delete(sessionId);

      expect(deleted).toBe(true);

      const session = await sessionModel.getById(sessionId);
      expect(session).toBeNull();
    });

    it('should get sessions by couple ID', async () => {
      // Create another session
      const session2 = await sessionModel.create({
        coupleId,
        userId: userAId
      });

      const sessions = await sessionModel.getByCoupleId(coupleId);

      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.id)).toContain(sessionId);
      expect(sessions.map(s => s.id)).toContain(session2.id);
    });
  });

  describe('Encryption Integration', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await sessionModel.create({
        coupleId,
        userId: userAId
      });
      sessionId = session.id;
    });

    it('should encrypt and decrypt session summary', async () => {
      const summaryText = 'This is a session summary with sensitive information';
      
      // Update session with summary
      const updatedSession = await sessionModel.update(sessionId, { summaryText });
      expect(updatedSession).toBeDefined();
      expect(updatedSession?.summaryTextEnc).toBeDefined();
      expect(updatedSession?.summaryTextEnc).not.toBe(summaryText);

      // Decrypt summary
      const decryptedSummary = await sessionModel.getDecryptedSummary(updatedSession!);
      expect(decryptedSummary).toBe(summaryText);
    });
  });
});
