/**
 * Session History Routes
 * Handles consented session summaries
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SessionHistoryModel } from '../models/session-history';

interface GetHistoryParams {
  userId: string;
}

interface UpdateConsentBody {
  historyId: string;
  consentGiven: boolean;
}

interface DeleteHistoryParams {
  historyId: string;
}

export async function sessionHistoryRoutes(fastify: FastifyInstance) {
  const sessionHistoryModel = new SessionHistoryModel((fastify as any).pg);

  // Get user's session history (consented entries only)
  fastify.get<{
    Params: GetHistoryParams;
  }>('/users/:userId/history', {
    schema: {
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        },
        required: ['userId']
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as GetHistoryParams;
    const user = (request as any).user;

    // Ensure user can only access their own history
    if (user.id !== userId) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'You can only access your own session history'
      });
    }

    try {
      const history = await sessionHistoryModel.getByUserId(userId);
      
      reply.code(200).send({
        history,
        count: history.length
      });
    } catch (error) {
      fastify.log.error({
        userId,
        error: error instanceof Error ? error.message : "Unknown error"
      }, 'Failed to get session history');
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve session history'
      });
    }
  });

  // Get pending consent requests
  fastify.get<{
    Params: GetHistoryParams;
  }>('/users/:userId/history/pending', {
    schema: {
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        },
        required: ['userId']
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as GetHistoryParams;
    const user = (request as any).user;

    // Ensure user can only access their own history
    if (user.id !== userId) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'You can only access your own session history'
      });
    }

    try {
      const pending = await sessionHistoryModel.getPendingConsent(userId);
      
      reply.code(200).send({
        pending,
        count: pending.length
      });
    } catch (error) {
      fastify.log.error({
        userId,
        error: error instanceof Error ? error.message : "Unknown error"
      }, 'Failed to get pending consent');
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve pending consent requests'
      });
    }
  });

  // Update consent status
  fastify.patch<{
    Body: UpdateConsentBody;
  }>('/history/consent', {
    schema: {
      body: {
        type: 'object',
        properties: {
          historyId: { type: 'string' },
          consentGiven: { type: 'boolean' }
        },
        required: ['historyId', 'consentGiven']
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { historyId, consentGiven } = request.body as UpdateConsentBody;
    const user = (request as any).user;

    try {
      const updated = await sessionHistoryModel.updateConsent({
        historyId,
        userId: user.id,
        consentGiven
      });

      if (!updated) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'History entry not found or you do not have permission to update it'
        });
      }

      reply.code(200).send({
        message: consentGiven ? 'Consent granted' : 'Consent withdrawn',
        history: updated
      });
    } catch (error) {
      fastify.log.error({
        historyId,
        userId: user.id,
        error: error instanceof Error ? error.message : "Unknown error"
      }, 'Failed to update consent');
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update consent status'
      });
    }
  });

  // Delete history entry
  fastify.delete<{
    Params: DeleteHistoryParams;
  }>('/history/:historyId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          historyId: { type: 'string' }
        },
        required: ['historyId']
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { historyId } = request.params as DeleteHistoryParams;
    const user = (request as any).user;

    try {
      const deleted = await sessionHistoryModel.delete(historyId, user.id);

      if (!deleted) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'History entry not found or you do not have permission to delete it'
        });
      }

      reply.code(200).send({
        message: 'History entry deleted successfully'
      });
    } catch (error) {
      fastify.log.error({
        historyId,
        userId: user.id,
        error: error instanceof Error ? error.message : "Unknown error"
      }, 'Failed to delete history entry');
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete history entry'
      });
    }
  });
}
