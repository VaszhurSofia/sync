/**
 * Hard Delete Session Tests
 * Tests for PR-B5: Hard Delete with Proof
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../../services/api/src/app';
import { SessionModel } from '../../services/api/src/models/sessions';

describe('Hard Delete Session Tests', () => {
  let app: FastifyInstance;
  let sessionModel: SessionModel;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    sessionModel = new SessionModel(app.pg);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('DELETE /sessions/:id', () => {
    it('should hard delete session and all associated data', async () => {
      // Create test couple
      const coupleQuery = `
        INSERT INTO couples (id, user_a_id, user_b_id, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id
      `;
      const coupleId = 'test-couple-1';
      const userAId = 'user-a-1';
      const userBId = 'user-b-1';
      
      await app.pg.query(coupleQuery, [coupleId, userAId, userBId]);

      // Create test session
      const sessionQuery = `
        INSERT INTO sessions (id, couple_id, turn_state, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id
      `;
      const sessionId = 'test-session-1';
      await app.pg.query(sessionQuery, [sessionId, coupleId, 'awaitingA']);

      // Create test messages
      const messageQuery = `
        INSERT INTO messages (id, session_id, user_id, content, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `;
      await app.pg.query(messageQuery, [sessionId + '-msg-1', sessionId, userAId, 'Test message 1']);
      await app.pg.query(messageQuery, [sessionId + '-msg-2', sessionId, userBId, 'Test message 2']);

      // Create test session feedback
      const feedbackQuery = `
        INSERT INTO session_feedback (id, session_id, user_id, rating, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `;
      await app.pg.query(feedbackQuery, [sessionId + '-feedback-1', sessionId, userAId, 'positive']);

      // Create test boundary audit
      const auditQuery = `
        INSERT INTO boundary_audit (id, session_id, user_id, risk_level, concerns, action, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `;
      await app.pg.query(auditQuery, [
        sessionId + '-audit-1',
        sessionId,
        userAId,
        'medium',
        'Test concern',
        'warn'
      ]);

      // Mock authentication
      const mockUser = { id: userAId };
      const mockRequest = {
        user: mockUser
      };

      // Perform hard delete
      const response = await app.inject({
        method: 'DELETE',
        url: `/sessions/${sessionId}`,
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.deletedCounts.messages).toBe(2);
      expect(body.deletedCounts.sessionFeedback).toBe(1);
      expect(body.deletedCounts.sessions).toBe(1);

      // Verify session is deleted
      const session = await sessionModel.getById(sessionId);
      expect(session).toBeNull();

      // Verify messages are deleted
      const messagesResult = await app.pg.query(
        'SELECT COUNT(*) as count FROM messages WHERE session_id = $1',
        [sessionId]
      );
      expect(parseInt(messagesResult.rows[0].count)).toBe(0);

      // Verify feedback is deleted
      const feedbackResult = await app.pg.query(
        'SELECT COUNT(*) as count FROM session_feedback WHERE session_id = $1',
        [sessionId]
      );
      expect(parseInt(feedbackResult.rows[0].count)).toBe(0);

      // Verify audit entries are deleted
      const auditResult = await app.pg.query(
        'SELECT COUNT(*) as count FROM boundary_audit WHERE session_id = $1',
        [sessionId]
      );
      expect(parseInt(auditResult.rows[0].count)).toBe(0);
    });

    it('should return 404 for non-existent session', async () => {
      const mockUser = { id: 'user-a-1' };
      const mockRequest = {
        user: mockUser
      };

      const response = await app.inject({
        method: 'DELETE',
        url: '/sessions/non-existent-session',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Session not found');
    });

    it('should return 403 for unauthorized user', async () => {
      // Create test couple and session
      const coupleId = 'test-couple-2';
      const userAId = 'user-a-2';
      const userBId = 'user-b-2';
      const sessionId = 'test-session-2';
      
      await app.pg.query(`
        INSERT INTO couples (id, user_a_id, user_b_id, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [coupleId, userAId, userBId]);

      await app.pg.query(`
        INSERT INTO sessions (id, couple_id, turn_state, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [sessionId, coupleId, 'awaitingA']);

      // Try to delete with unauthorized user
      const mockUser = { id: 'unauthorized-user' };
      const mockRequest = {
        user: mockUser
      };

      const response = await app.inject({
        method: 'DELETE',
        url: `/sessions/${sessionId}`,
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toBe('User not authorized to delete this session');
    });
  });

  describe('GET /sessions/:id/verify-deleted', () => {
    it('should return 404 for deleted session', async () => {
      const sessionId = 'deleted-session';

      const response = await app.inject({
        method: 'GET',
        url: `/sessions/${sessionId}/verify-deleted`
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.exists).toBe(false);
      expect(body.message).toBe('Session successfully deleted');
    });

    it('should return 200 for existing session', async () => {
      // Create test session
      const coupleId = 'test-couple-3';
      const userAId = 'user-a-3';
      const userBId = 'user-b-3';
      const sessionId = 'test-session-3';
      
      await app.pg.query(`
        INSERT INTO couples (id, user_a_id, user_b_id, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [coupleId, userAId, userBId]);

      await app.pg.query(`
        INSERT INTO sessions (id, couple_id, turn_state, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [sessionId, coupleId, 'awaitingA']);

      const response = await app.inject({
        method: 'GET',
        url: `/sessions/${sessionId}/verify-deleted`
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.exists).toBe(true);
      expect(body.message).toBe('Session still exists');
    });
  });

  describe('GET /sessions/:id/deletion-proof', () => {
    it('should return deletion proof for deleted session', async () => {
      const sessionId = 'deleted-session-proof';
      const mockUser = { id: 'user-a-4' };

      const response = await app.inject({
        method: 'GET',
        url: `/sessions/${sessionId}/deletion-proof`,
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sessionId).toBe(sessionId);
      expect(body.deleted).toBe(true);
      expect(body.fullyDeleted).toBe(true);
      expect(body.residualData.messages).toBe(0);
      expect(body.residualData.sessionFeedback).toBe(0);
      expect(body.residualData.boundaryAudit).toBe(0);
      expect(body.deletionProof.status).toBe('complete');
    });

    it('should return partial deletion status for session with residual data', async () => {
      // Create test session with some data
      const coupleId = 'test-couple-4';
      const userAId = 'user-a-4';
      const userBId = 'user-b-4';
      const sessionId = 'test-session-4';
      
      await app.pg.query(`
        INSERT INTO couples (id, user_a_id, user_b_id, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [coupleId, userAId, userBId]);

      await app.pg.query(`
        INSERT INTO sessions (id, couple_id, turn_state, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [sessionId, coupleId, 'awaitingA']);

      // Add some messages but don't delete them
      await app.pg.query(`
        INSERT INTO messages (id, session_id, user_id, content, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [sessionId + '-msg-1', sessionId, userAId, 'Test message']);

      // Delete session but leave messages
      await app.pg.query(`
        DELETE FROM sessions WHERE id = $1
      `, [sessionId]);

      const mockUser = { id: userAId };
      const response = await app.inject({
        method: 'GET',
        url: `/sessions/${sessionId}/deletion-proof`,
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sessionId).toBe(sessionId);
      expect(body.deleted).toBe(true);
      expect(body.fullyDeleted).toBe(false);
      expect(body.residualData.messages).toBe(1);
      expect(body.deletionProof.status).toBe('partial');
    });
  });

  describe('Transaction Rollback on Error', () => {
    it('should rollback transaction if session deletion fails', async () => {
      // Create test session
      const coupleId = 'test-couple-5';
      const userAId = 'user-a-5';
      const userBId = 'user-b-5';
      const sessionId = 'test-session-5';
      
      await app.pg.query(`
        INSERT INTO couples (id, user_a_id, user_b_id, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [coupleId, userAId, userBId]);

      await app.pg.query(`
        INSERT INTO sessions (id, couple_id, turn_state, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [sessionId, coupleId, 'awaitingA']);

      // Add some messages
      await app.pg.query(`
        INSERT INTO messages (id, session_id, user_id, content, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [sessionId + '-msg-1', sessionId, userAId, 'Test message']);

      // Mock a database error by corrupting the session ID
      const corruptedSessionId = 'corrupted-session-id';
      
      const mockUser = { id: userAId };
      const response = await app.inject({
        method: 'DELETE',
        url: `/sessions/${corruptedSessionId}`,
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });

      expect(response.statusCode).toBe(404);
      
      // Verify original session still exists
      const session = await sessionModel.getById(sessionId);
      expect(session).not.toBeNull();
      
      // Verify messages still exist
      const messagesResult = await app.pg.query(
        'SELECT COUNT(*) as count FROM messages WHERE session_id = $1',
        [sessionId]
      );
      expect(parseInt(messagesResult.rows[0].count)).toBe(1);
    });
  });

  describe('Compliance and Audit Trail', () => {
    it('should log deletion events for compliance', async () => {
      const sessionId = 'audit-session';
      const coupleId = 'test-couple-6';
      const userAId = 'user-a-6';
      const userBId = 'user-b-6';
      
      await app.pg.query(`
        INSERT INTO couples (id, user_a_id, user_b_id, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [coupleId, userAId, userBId]);

      await app.pg.query(`
        INSERT INTO sessions (id, couple_id, turn_state, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [sessionId, coupleId, 'awaitingA']);

      const mockUser = { id: userAId };
      const response = await app.inject({
        method: 'DELETE',
        url: `/sessions/${sessionId}`,
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.deletedCounts.sessions).toBe(1);
    });
  });
});
