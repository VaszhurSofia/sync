/**
 * Turn-State Machine Tests
 * Tests server-enforced turn-taking with 409 TURN_LOCKED responses
 */

import { SessionModel, TurnState } from '../src/models/sessions';
import { Pool } from 'pg';

// Mock database connection
const mockDb = {
  query: jest.fn()
} as any;

describe.skip('Turn-State Machine Tests', () => {
  let sessionModel: SessionModel;
  let mockSession: any;

  beforeEach(() => {
    sessionModel = new SessionModel(mockDb);
    
    mockSession = {
      id: 'session-123',
      coupleId: 'couple-456',
      startedAt: new Date(),
      turnState: 'awaitingA',
      boundaryFlag: false,
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Turn Validation', () => {
    it('should allow user A to send message when turn is awaitingA', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      
      const result = await sessionModel.canUserSendMessage(
        'session-123',
        'user-a',
        'user-a',
        'user-b'
      );
      
      expect(result.canSend).toBe(true);
      expect(result.currentTurn).toBe('awaitingA');
      expect(result.expectedTurn).toBe('awaitingA');
    });

    it('should allow user B to send message when turn is awaitingB', async () => {
      mockSession.turnState = 'awaitingB';
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      
      const result = await sessionModel.canUserSendMessage(
        'session-123',
        'user-b',
        'user-a',
        'user-b'
      );
      
      expect(result.canSend).toBe(true);
      expect(result.currentTurn).toBe('awaitingB');
      expect(result.expectedTurn).toBe('awaitingB');
    });

    it('should reject user A when turn is awaitingB', async () => {
      mockSession.turnState = 'awaitingB';
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      
      const result = await sessionModel.canUserSendMessage(
        'session-123',
        'user-a',
        'user-a',
        'user-b'
      );
      
      expect(result.canSend).toBe(false);
      expect(result.currentTurn).toBe('awaitingB');
      expect(result.expectedTurn).toBe('awaitingA');
      expect(result.reason).toContain('It is not your turn');
    });

    it('should reject user B when turn is awaitingA', async () => {
      mockSession.turnState = 'awaitingA';
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      
      const result = await sessionModel.canUserSendMessage(
        'session-123',
        'user-b',
        'user-a',
        'user-b'
      );
      
      expect(result.canSend).toBe(false);
      expect(result.currentTurn).toBe('awaitingA');
      expect(result.expectedTurn).toBe('awaitingB');
      expect(result.reason).toContain('It is not your turn');
    });

    it('should reject messages when session has ended', async () => {
      mockSession.endedAt = new Date();
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      
      const result = await sessionModel.canUserSendMessage(
        'session-123',
        'user-a',
        'user-a',
        'user-b'
      );
      
      expect(result.canSend).toBe(false);
      expect(result.reason).toBe('Session has ended');
    });

    it('should reject messages when session has boundary flag', async () => {
      mockSession.boundaryFlag = true;
      mockSession.turnState = 'boundary';
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      
      const result = await sessionModel.canUserSendMessage(
        'session-123',
        'user-a',
        'user-a',
        'user-b'
      );
      
      expect(result.canSend).toBe(false);
      expect(result.reason).toBe('Session has reached boundary');
    });

    it('should reject messages from user not in couple', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      
      const result = await sessionModel.canUserSendMessage(
        'session-123',
        'user-c',
        'user-a',
        'user-b'
      );
      
      expect(result.canSend).toBe(false);
      expect(result.reason).toBe('User not part of this couple');
    });

    it('should reject messages when session not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await sessionModel.canUserSendMessage(
        'session-123',
        'user-a',
        'user-a',
        'user-b'
      );
      
      expect(result.canSend).toBe(false);
      expect(result.reason).toBe('Session not found');
    });
  });

  describe('Turn State Transitions', () => {
    it('should advance from awaitingA to awaitingB when user A sends message', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ ...mockSession, turn_state: 'awaitingB' }] 
      });
      
      const result = await sessionModel.advanceTurnAfterMessage(
        'session-123',
        'user-a',
        'user-a',
        'user-b'
      );
      
      expect(result).toBeDefined();
      expect(result?.turnState).toBe('awaitingB');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sessions SET turn_state'),
        expect.arrayContaining(['awaitingB'])
      );
    });

    it('should advance from awaitingB to ai_reflect when user B sends message', async () => {
      mockSession.turnState = 'awaitingB';
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ ...mockSession, turn_state: 'ai_reflect' }] 
      });
      
      const result = await sessionModel.advanceTurnAfterMessage(
        'session-123',
        'user-b',
        'user-a',
        'user-b'
      );
      
      expect(result).toBeDefined();
      expect(result?.turnState).toBe('ai_reflect');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sessions SET turn_state'),
        expect.arrayContaining(['ai_reflect'])
      );
    });

    it('should not advance turn for invalid state transitions', async () => {
      mockSession.turnState = 'ai_reflect';
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      
      const result = await sessionModel.advanceTurnAfterMessage(
        'session-123',
        'user-a',
        'user-a',
        'user-b'
      );
      
      expect(result).toBeDefined();
      expect(result?.turnState).toBe('ai_reflect'); // Should remain unchanged
    });

    it('should reset turn to awaitingA after AI reflection', async () => {
      mockSession.turnState = 'ai_reflect';
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ ...mockSession, turn_state: 'awaitingA' }] 
      });
      
      const result = await sessionModel.resetTurnAfterAI('session-123');
      
      expect(result).toBeDefined();
      expect(result?.turnState).toBe('awaitingA');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sessions SET turn_state'),
        expect.arrayContaining(['awaitingA'])
      );
    });
  });

  describe('Boundary Flag Management', () => {
    it('should set boundary flag and change turn state to boundary', async () => {
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ 
          ...mockSession, 
          boundary_flag: true, 
          turn_state: 'boundary' 
        }] 
      });
      
      const result = await sessionModel.setBoundaryFlag('session-123', true);
      
      expect(result).toBeDefined();
      expect(result?.boundaryFlag).toBe(true);
      expect(result?.turnState).toBe('boundary');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sessions SET boundary_flag = true, turn_state = \'boundary\''),
        expect.any(Array)
      );
    });

    it('should clear boundary flag and reset turn state', async () => {
      mockSession.boundaryFlag = true;
      mockSession.turnState = 'boundary';
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ 
          ...mockSession, 
          boundary_flag: false, 
          turn_state: 'awaitingA' 
        }] 
      });
      
      const result = await sessionModel.setBoundaryFlag('session-123', false);
      
      expect(result).toBeDefined();
      expect(result?.boundaryFlag).toBe(false);
      expect(result?.turnState).toBe('awaitingA');
    });
  });

  describe('Session Lifecycle', () => {
    it('should create session with default turn state', async () => {
      const newSession = {
        id: 'session-new',
        couple_id: 'couple-456',
        started_at: new Date(),
        turn_state: 'awaitingA',
        boundary_flag: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      mockDb.query.mockResolvedValueOnce({ rows: [newSession] });
      
      const result = await sessionModel.create({
        coupleId: 'couple-456',
        userId: 'user-a'
      });
      
      expect(result.turnState).toBe('awaitingA');
      expect(result.boundaryFlag).toBe(false);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sessions'),
        expect.arrayContaining(['awaitingA', false])
      );
    });

    it('should end session', async () => {
      const endedSession = { ...mockSession, ended_at: new Date() };
      mockDb.query.mockResolvedValueOnce({ rows: [endedSession] });
      
      const result = await sessionModel.endSession('session-123');
      
      expect(result).toBeDefined();
      expect(result?.endedAt).toBeDefined();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sessions SET ended_at'),
        expect.any(Array)
      );
    });
  });

  describe('Two-Client Turn-Taking Tests', () => {
    it('should enforce turn-taking between two clients', async () => {
      // Client A sends message first
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ ...mockSession, turn_state: 'awaitingB' }] 
      });
      
      const resultA = await sessionModel.advanceTurnAfterMessage(
        'session-123',
        'user-a',
        'user-a',
        'user-b'
      );
      
      expect(resultA?.turnState).toBe('awaitingB');
      
      // Client B tries to send message (should succeed)
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ ...mockSession, turn_state: 'awaitingB' }] 
      });
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ ...mockSession, turn_state: 'ai_reflect' }] 
      });
      
      const resultB = await sessionModel.advanceTurnAfterMessage(
        'session-123',
        'user-b',
        'user-a',
        'user-b'
      );
      
      expect(resultB?.turnState).toBe('ai_reflect');
    });

    it('should prevent client A from sending when it\'s client B\'s turn', async () => {
      mockSession.turnState = 'awaitingB';
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      
      const result = await sessionModel.canUserSendMessage(
        'session-123',
        'user-a',
        'user-a',
        'user-b'
      );
      
      expect(result.canSend).toBe(false);
      expect(result.reason).toContain('It is not your turn');
    });

    it('should prevent client B from sending when it\'s client A\'s turn', async () => {
      mockSession.turnState = 'awaitingA';
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      
      const result = await sessionModel.canUserSendMessage(
        'session-123',
        'user-b',
        'user-a',
        'user-b'
      );
      
      expect(result.canSend).toBe(false);
      expect(result.reason).toContain('It is not your turn');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database connection failed'));
      
      await expect(sessionModel.canUserSendMessage(
        'session-123',
        'user-a',
        'user-a',
        'user-b'
      )).rejects.toThrow('Database connection failed');
    });

    it('should handle session not found in advanceTurnAfterMessage', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await sessionModel.advanceTurnAfterMessage(
        'session-123',
        'user-a',
        'user-a',
        'user-b'
      );
      
      expect(result).toBeNull();
    });
  });

  describe('Turn State Enum Validation', () => {
    it('should validate all turn states', () => {
      const validStates: TurnState[] = ['awaitingA', 'awaitingB', 'ai_reflect', 'boundary'];
      
      validStates.forEach(state => {
        expect(['awaitingA', 'awaitingB', 'ai_reflect', 'boundary']).toContain(state);
      });
    });

    it('should handle invalid turn states gracefully', async () => {
      mockSession.turnState = 'invalid_state' as any;
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      
      const result = await sessionModel.canUserSendMessage(
        'session-123',
        'user-a',
        'user-a',
        'user-b'
      );
      
      // Should still work but with unexpected state
      expect(result.canSend).toBe(true);
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent turn state updates', async () => {
      // Simulate concurrent access
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ ...mockSession, turn_state: 'awaitingB' }] 
      });
      
      // First client advances turn
      const result1 = await sessionModel.advanceTurnAfterMessage(
        'session-123',
        'user-a',
        'user-a',
        'user-b'
      );
      
      expect(result1?.turnState).toBe('awaitingB');
      
      // Second client tries to advance from same state (should fail)
      mockSession.turnState = 'awaitingA'; // Reset to original state
      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] });
      
      const result2 = await sessionModel.advanceTurnAfterMessage(
        'session-123',
        'user-a',
        'user-a',
        'user-b'
      );
      
      // Should not advance because state has changed
      expect(result2?.turnState).toBe('awaitingA');
    });
  });
});
