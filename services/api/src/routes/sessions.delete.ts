/**
 * Hard Delete Session Route
 * Transactionally removes messages, session_feedback, then sessions
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SessionModel } from '../models/sessions';
import { logger } from '../logger';

interface DeleteSessionRequest {
  Params: { id: string };
}

interface DeleteSessionResponse {
  success: boolean;
  message: string;
  deletedCounts: {
    messages: number;
    sessionFeedback: number;
    sessions: number;
  };
}

export async function sessionDeleteRoutes(fastify: FastifyInstance) {
  const sessionModel = new SessionModel(fastify.pg);

  // Hard delete session
  fastify.delete<DeleteSessionRequest, DeleteSessionResponse>('/sessions/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            deletedCounts: {
              type: 'object',
              properties: {
                messages: { type: 'number' },
                sessionFeedback: { type: 'number' },
                sessions: { type: 'number' }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: sessionId } = request.params as { id: string };
    const user = (request as any).user;

    try {
      // Verify session exists and user has access
      const session = await sessionModel.getById(sessionId);
      if (!session) {
        return reply.code(404).send({
          success: false,
          message: 'Session not found'
        });
      }

      // Check if user is part of the couple
      const coupleQuery = `
        SELECT user_a_id, user_b_id FROM couples WHERE id = $1
      `;
      const coupleResult = await fastify.pg.query(coupleQuery, [session.coupleId]);
      
      if (coupleResult.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Couple not found'
        });
      }

      const { user_a_id: userAId, user_b_id: userBId } = coupleResult.rows[0];
      
      if (user.id !== userAId && user.id !== userBId) {
        return reply.code(403).send({
          success: false,
          message: 'User not authorized to delete this session'
        });
      }

      // Start transaction for hard delete
      const client = await fastify.pg.connect();
      
      try {
        await client.query('BEGIN');

        // 1. Delete messages first (due to foreign key constraints)
        const deleteMessagesQuery = `
          DELETE FROM messages WHERE session_id = $1
        `;
        const messagesResult = await client.query(deleteMessagesQuery, [sessionId]);
        const deletedMessagesCount = messagesResult.rowCount || 0;

        // 2. Delete session feedback
        const deleteFeedbackQuery = `
          DELETE FROM session_feedback WHERE session_id = $1
        `;
        const feedbackResult = await client.query(deleteFeedbackQuery, [sessionId]);
        const deletedFeedbackCount = feedbackResult.rowCount || 0;

        // 3. Delete boundary audit entries
        const deleteAuditQuery = `
          DELETE FROM boundary_audit WHERE session_id = $1
        `;
        await client.query(deleteAuditQuery, [sessionId]);

        // 4. Delete session last
        const deleteSessionQuery = `
          DELETE FROM sessions WHERE id = $1
        `;
        const sessionResult = await client.query(deleteSessionQuery, [sessionId]);
        const deletedSessionsCount = sessionResult.rowCount || 0;

        if (deletedSessionsCount === 0) {
          throw new Error('Session deletion failed');
        }

        // Commit transaction
        await client.query('COMMIT');

        logger.info('Session hard deleted', {
          sessionId,
          userId: user.id,
          deletedCounts: {
            messages: deletedMessagesCount,
            sessionFeedback: deletedFeedbackCount,
            sessions: deletedSessionsCount
          }
        });

        return reply.send({
          success: true,
          message: 'Session and all associated data deleted successfully',
          deletedCounts: {
            messages: deletedMessagesCount,
            sessionFeedback: deletedFeedbackCount,
            sessions: deletedSessionsCount
          }
        });

      } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Failed to delete session', {
        error: error instanceof Error ? error.message : "Unknown error",
        sessionId,
        userId: user.id
      });

      return reply.code(500).send({
        success: false,
        message: 'Internal server error during deletion'
      });
    }
  });

  // Verify session deletion (should return 404)
  fastify.get<{ Params: { id: string } }>('/sessions/:id/verify-deleted', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: sessionId } = request.params as { id: string };

    try {
      // Check if session still exists
      const session = await sessionModel.getById(sessionId);
      
      if (session) {
        return reply.code(200).send({
          exists: true,
          message: 'Session still exists'
        });
      } else {
        return reply.code(404).send({
          exists: false,
          message: 'Session successfully deleted'
        });
      }
    } catch (error) {
      logger.error('Failed to verify session deletion', {
        error: error instanceof Error ? error.message : "Unknown error",
        sessionId
      });

      return reply.code(500).send({
        exists: false,
        message: 'Error checking session status'
      });
    }
  });

  // Get deletion proof (for compliance)
  fastify.get<{ Params: { id: string } }>('/sessions/:id/deletion-proof', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: sessionId } = request.params as { id: string };
    const user = (request as any).user;

    try {
      // Check if session exists
      const session = await sessionModel.getById(sessionId);
      
      if (session) {
        return reply.code(200).send({
          exists: true,
          message: 'Session still exists - not deleted'
        });
      }

      // Verify no residual data exists
      const messagesQuery = `
        SELECT COUNT(*) as count FROM messages WHERE session_id = $1
      `;
      const feedbackQuery = `
        SELECT COUNT(*) as count FROM session_feedback WHERE session_id = $1
      `;
      const auditQuery = `
        SELECT COUNT(*) as count FROM boundary_audit WHERE session_id = $1
      `;

      const [messagesResult, feedbackResult, auditResult] = await Promise.all([
        fastify.pg.query(messagesQuery, [sessionId]),
        fastify.pg.query(feedbackQuery, [sessionId]),
        fastify.pg.query(auditQuery, [sessionId])
      ]);

      const messagesCount = parseInt(messagesResult.rows[0].count);
      const feedbackCount = parseInt(feedbackResult.rows[0].count);
      const auditCount = parseInt(auditResult.rows[0].count);

      const isFullyDeleted = messagesCount === 0 && feedbackCount === 0 && auditCount === 0;

      return reply.send({
        sessionId,
        deleted: true,
        fullyDeleted: isFullyDeleted,
        residualData: {
          messages: messagesCount,
          sessionFeedback: feedbackCount,
          boundaryAudit: auditCount
        },
        deletionProof: {
          timestamp: new Date().toISOString(),
          verifiedBy: user.id,
          status: isFullyDeleted ? 'complete' : 'partial'
        }
      });

    } catch (error) {
      logger.error('Failed to get deletion proof', {
        error: error instanceof Error ? error.message : "Unknown error",
        sessionId,
        userId: user.id
      });

      return reply.code(500).send({
        sessionId,
        deleted: false,
        error: 'Failed to verify deletion status'
      });
    }
  });
}
