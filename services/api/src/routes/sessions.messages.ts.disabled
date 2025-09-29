import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SessionModel, TurnState } from '../models/sessions';
import { getEncryption } from '../crypto/aes-gcm';
import { logger } from '../logger';
import { getLongPollManager } from '../lib/longpoll';
import { v4 as uuidv4 } from 'uuid';
import { safetyMiddleware, SafetyContext } from '../middleware/safety';
import { boundaryLockMiddleware, BoundaryLockContext } from '../middleware/boundary-lock';
import { TurnStateMachine, createTurnStateMiddleware } from '../middleware/turn-state-machine';

interface SendMessageRequest {
  content: string;
  client_message_id: string;
}

interface SendMessageResponse {
  messageId: string;
  status: 'accepted' | 'rejected';
  reason?: string;
  turnState?: TurnState;
}

interface GetMessagesRequest {
  after?: string;
  waitMs?: string;
}

export async function sessionMessagesRoutes(fastify: FastifyInstance) {
  const sessionModel = new SessionModel((fastify as any).pg);
  const encryption = getEncryption();
  const longPollManager = getLongPollManager();

  // Send message to session
  fastify.post<{
    Params: { id: string };
    Body: SendMessageRequest;
    Reply: SendMessageResponse;
  }>('/sessions/:id/messages', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          content: { type: 'string', minLength: 1, maxLength: 2000 },
          client_message_id: { type: 'string' }
        },
        required: ['content', 'client_message_id']
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: sessionId } = request.params as { id: string };
    const { content, client_message_id } = request.body as SendMessageRequest;
    const user = (request as any).user;

    try {
      // Pre-LLM safety short-circuit
      const safetyContext: SafetyContext = {
        userId: user.id,
        sessionId,
        messageCount: 0, // Would be fetched from session
        previousViolations: 0 // Would be fetched from user profile
      };
      
      await safetyMiddleware(request, reply, safetyContext);
      
      // If safety middleware sent a response, return early
      if (reply.sent) {
        return;
      }
      // Get session
      const session = await sessionModel.getById(sessionId);
      if (!session) {
        return reply.code(404).send({
          messageId: '',
          status: 'rejected',
          reason: 'Session not found'
        });
      }

      // Check boundary lock
      const boundaryContext: BoundaryLockContext = {
        sessionId,
        userId: user.id,
        userRole: user.id === session.userAId ? 'userA' : 'userB'
      };
      
      await boundaryLockMiddleware(request, reply, boundaryContext);
      
      // If boundary lock middleware sent a response, return early
      if (reply.sent) {
        return;
      }

      // Validate turn state (409 on wrong turn)
      const turnValidation = TurnStateMachine.validateTurn(
        session.turnState || 'awaitingA',
        user.id,
        session.userAId,
        session.userBId
      );

      if (!turnValidation.isValid) {
        return reply.code(409).send({
          messageId: '',
          status: 'rejected',
          reason: turnValidation.error,
          turnState: {
            current: turnValidation.currentState,
            expected: turnValidation.expectedState
          }
        });
      }

      // Get couple information
      const coupleQuery = `
        SELECT user_a_id, user_b_id FROM couples WHERE id = $1
      `;
      const coupleResult = await (fastify as any).pg.query(coupleQuery, [session.coupleId]);
      
      if (coupleResult.rows.length === 0) {
        return reply.code(404).send({
          messageId: '',
          status: 'rejected',
          reason: 'Couple not found'
        });
      }

      const { user_a_id: userAId, user_b_id: userBId } = coupleResult.rows[0];

      // Check turn-taking
      const turnCheck = await sessionModel.canUserSendMessage(
        sessionId, 
        user.id, 
        userAId, 
        userBId
      );

      if (!turnCheck.canSend) {
        logger.warn('Turn-taking violation', {
          sessionId,
          userId: user.id,
          currentTurn: turnCheck.currentTurn,
          expectedTurn: turnCheck.expectedTurn,
          reason: turnCheck.reason
        });

        return reply.code(409).send({
          messageId: '',
          status: 'rejected',
          reason: 'TURN_LOCKED',
          turnState: turnCheck.currentTurn
        });
      }

      // Check for idempotent message
      const existingMessageQuery = `
        SELECT id FROM messages 
        WHERE session_id = $1 AND client_message_id = $2
      `;
      const existingResult = await (fastify as any).pg.query(existingMessageQuery, [sessionId, client_message_id]);
      
      if (existingResult.rows.length > 0) {
        return reply.code(202).send({
          messageId: existingResult.rows[0].id,
          status: 'accepted',
          reason: 'Idempotent message'
        });
      }

      // Encrypt message content
      const encryptedContent = await encryption.encryptField('messages.content', content);

      // Determine sender role
      let senderRole: 'userA' | 'userB';
      if (user.id === userAId) {
        senderRole = 'userA';
      } else if (user.id === userBId) {
        senderRole = 'userB';
      } else {
        return reply.code(403).send({
          messageId: '',
          status: 'rejected',
          reason: 'User not part of this couple'
        });
      }

      // Insert message
      const messageId = uuidv4();
      const insertMessageQuery = `
        INSERT INTO messages (id, session_id, sender, content_enc, created_at, client_message_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      
      await (fastify as any).pg.query(insertMessageQuery, [
        messageId,
        sessionId,
        senderRole,
        encryptedContent,
        new Date(),
        client_message_id
      ]);

      // Check if safety violation occurred and create boundary lock
      if (request.safetyContext && !request.safetyContext.isValid) {
        const { BoundaryAuditModel } = await import('../models/boundary-audit');
        const boundaryAuditModel = new BoundaryAuditModel((fastify as any).pg);
        
        // Create boundary lock
        await boundaryAuditModel.create({
          sessionId,
          userId: user.id,
          boundaryType: 'safety',
          triggerReason: 'Content safety violation detected',
          riskLevel: request.safetyContext.boundaryResult.riskLevel as 'low' | 'medium' | 'high',
          concerns: request.safetyContext.boundaryResult.concerns,
          action: 'boundary_lock',
          metadata: {
            messageId,
            contentLength: content.length,
            timestamp: new Date().toISOString(),
            tier1Result: request.safetyContext.boundaryResult.tier1Result,
            tier2Result: request.safetyContext.boundaryResult.tier2Result
          }
        });
        
        // Set session boundary flag
        await sessionModel.setBoundaryFlag(sessionId, true);
        
        logger.warn('Boundary lock created due to safety violation', {
          sessionId,
          userId: user.id,
          messageId,
          riskLevel: request.safetyContext.boundaryResult.riskLevel,
          concerns: request.safetyContext.boundaryResult.concerns
        });
      }

      // Advance turn state
      const updatedSession = await sessionModel.advanceTurnAfterMessage(
        sessionId,
        user.id,
        userAId,
        userBId
      );

      // Create message object for long-polling
      const messageForPolling = {
        id: messageId,
        sender: senderRole,
        content,
        createdAt: new Date(),
        clientMessageId: client_message_id
      };

      // Deliver message to waiting long-polls
      longPollManager.deliverMessage(sessionId, messageForPolling);

      logger.info('Message sent', {
        messageId,
        sessionId,
        userId: user.id,
        senderRole,
        turnState: updatedSession?.turnState
      });

      return reply.code(202).send({
        messageId,
        status: 'accepted',
        turnState: updatedSession?.turnState
      });

    } catch (error) {
      logger.error('Failed to send message', {
        error: error instanceof Error ? error.message : "Unknown error",
        sessionId,
        userId: user.id
      });

      return reply.code(500).send({
        messageId: '',
        status: 'rejected',
        reason: 'Internal server error'
      });
    }
  });

  // Get messages from session
  fastify.get<{
    Params: { id: string };
    Querystring: GetMessagesRequest;
  }>('/sessions/:id/messages', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          after: { type: 'string' },
          waitMs: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: sessionId } = request.params as { id: string };
    const { after, waitMs } = request.query as GetMessagesRequest;
    const user = (request as any).user;

    try {
      // Get session
      const session = await sessionModel.getById(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      // Check if user is part of the couple
      const coupleQuery = `
        SELECT user_a_id, user_b_id FROM couples WHERE id = $1
      `;
      const coupleResult = await (fastify as any).pg.query(coupleQuery, [session.coupleId]);
      
      if (coupleResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Couple not found' });
      }

      const { user_a_id: userAId, user_b_id: userBId } = coupleResult.rows[0];
      
      if (user.id !== userAId && user.id !== userBId) {
        return reply.code(403).send({ error: 'User not part of this couple' });
      }

      // Build query
      let query = `
        SELECT id, sender, content_enc, created_at, client_message_id
        FROM messages 
        WHERE session_id = $1
      `;
      const values: any[] = [sessionId];

      if (after) {
        query += ` AND created_at > $${values.length + 1}`;
        values.push(after);
      }

      query += ` ORDER BY created_at ASC`;

      // Execute query
      const result = await (fastify as any).pg.query(query, values);
      
      // Decrypt messages
      const messages = await Promise.all(
        result.rows.map(async (row: any) => {
          const decryptedContent = await encryption.decryptField('messages.content', row.content_enc);
          return {
            id: row.id,
            sender: row.sender,
            content: decryptedContent,
            createdAt: row.created_at,
            clientMessageId: row.client_message_id
          };
        })
      );

      // Handle long-polling if waitMs is specified
      if (waitMs) {
        const waitTime = parseInt(waitMs, 10);
        if (isNaN(waitTime) || waitTime <= 0 || waitTime > 30000) {
          return reply.code(400).send({ error: 'Invalid waitMs parameter' });
        }

        // Generate client ID for long-polling
        const clientId = `${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
          // Start long-poll
          const longPollResult = await longPollManager.startPoll(
            sessionId,
            clientId,
            waitTime,
            after
          );

          // Return the result from long-polling
          return reply.send(longPollResult.messages || []);
        } catch (error) {
          if (error instanceof Error && error.message === 'Client aborted long-poll') {
            return reply.code(200).send({ aborted: true });
          }
          
          logger.error('Long-poll error', {
            error: error instanceof Error ? error.message : "Unknown error",
            sessionId,
            userId: user.id
          });
          
          return reply.code(500).send({ error: 'Long-poll error' });
        }
      }

      return reply.send(messages);

    } catch (error) {
      logger.error('Failed to get messages', {
        error: error instanceof Error ? error.message : "Unknown error",
        sessionId,
        userId: user.id
      });

      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Abort long-poll
  fastify.post<{
    Params: { id: string };
    Body: { clientId: string };
  }>('/sessions/:id/messages/abort', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          clientId: { type: 'string' }
        },
        required: ['clientId']
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: sessionId } = request.params as { id: string };
    const { clientId } = request.body as { clientId: string };
    const user = (request as any).user;

    try {
      // Verify user has access to session
      const session = await sessionModel.getById(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      // Check if user is part of the couple
      const coupleQuery = `
        SELECT user_a_id, user_b_id FROM couples WHERE id = $1
      `;
      const coupleResult = await (fastify as any).pg.query(coupleQuery, [session.coupleId]);
      
      if (coupleResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Couple not found' });
      }

      const { user_a_id: userAId, user_b_id: userBId } = coupleResult.rows[0];
      
      if (user.id !== userAId && user.id !== userBId) {
        return reply.code(403).send({ error: 'User not part of this couple' });
      }

      // Abort the long-poll
      const aborted = longPollManager.abortPoll(sessionId, clientId);

      if (aborted) {
        logger.info('Long-poll aborted', {
          sessionId,
          clientId,
          userId: user.id
        });
        
        return reply.code(200).send({ aborted: true });
      } else {
        return reply.code(404).send({ error: 'Long-poll not found' });
      }

    } catch (error) {
      logger.error('Failed to abort long-poll', {
        error: error instanceof Error ? error.message : "Unknown error",
        sessionId,
        clientId,
        userId: user.id
      });

      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // End session
  fastify.post<{
    Params: { id: string };
  }>('/sessions/:id/end', {
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
      // Get session
      const session = await sessionModel.getById(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      // Check if user is part of the couple
      const coupleQuery = `
        SELECT user_a_id, user_b_id FROM couples WHERE id = $1
      `;
      const coupleResult = await (fastify as any).pg.query(coupleQuery, [session.coupleId]);
      
      if (coupleResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Couple not found' });
      }

      const { user_a_id: userAId, user_b_id: userBId } = coupleResult.rows[0];
      
      if (user.id !== userAId && user.id !== userBId) {
        return reply.code(403).send({ error: 'User not authorized to end this session' });
      }

      // End session
      await sessionModel.endSession(sessionId);

      logger.info('Session ended', {
        sessionId,
        userId: user.id
      });

      return reply.code(204).send();

    } catch (error) {
      logger.error('Failed to end session', {
        error: error instanceof Error ? error.message : "Unknown error",
        sessionId,
        userId: user.id
      });

      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
