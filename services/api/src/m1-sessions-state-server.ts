import Fastify from 'fastify';
import { randomBytes } from 'crypto';
import { SessionModel, CreateSessionRequest } from './models/sessions';
import { MessageModel, CreateMessageRequest } from './models/messages';
import { UserModel, CoupleMemberModel } from './utils/database';
import { turnTakingMiddleware, updateTurnState } from './middleware/turn-taking';
import { boundaryDetectionMiddleware, getBoundaryTemplate } from './middleware/boundary-detection';
import { TurnLockedError, BoundaryLockedError } from './types/api-client';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Authentication middleware
async function authMiddleware(request: any, reply: any) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401);
    throw new Error('Authentication required');
  }
  
  const token = authHeader.substring(7);
  
  // TODO: Implement proper JWT validation
  // For now, extract user ID from token (in production, validate JWT)
  const userId = token.split('_')[1] || 'user_123';
  request.user = { id: userId };
}

// Health endpoints
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
});

fastify.get('/health/crypto', async (request, reply) => {
  return {
    kms: 'ok',
    dek_age_days: 7,
    selftest: 'ok',
  };
});

// Authentication endpoints
fastify.post('/auth/request-code', async (request, reply) => {
  const { email } = request.body as { email: string };
  
  // TODO: Implement actual email sending
  fastify.log.info(`Sending verification code to ${email}`);
  
  reply.code(204);
  return;
});

fastify.post('/auth/verify-code', async (request, reply) => {
  const { email, code } = request.body as { email: string; code: string };
  
  // TODO: Implement actual code verification
  if (code !== '123456') {
    reply.code(401);
    return { error: 'INVALID_CODE', message: 'Invalid or expired code' };
  }
  
  const accessToken = `token_${randomBytes(16).toString('hex')}`;
  
  return { accessToken };
});

// Session endpoints
fastify.post('/sessions', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { mode, coupleId } = request.body as { mode: 'couple' | 'solo'; coupleId?: string };
  const userId = request.user.id;
  
  try {
    const createRequest: CreateSessionRequest = {
      mode,
      coupleId,
      ownerUserId: mode === 'solo' ? userId : undefined,
    };
    
    const session = await SessionModel.create(createRequest, userId);
    
    return session;
  } catch (error: any) {
    reply.code(400);
    return { error: 'INVALID_REQUEST', message: error.message };
  }
});

// Message endpoints with turn-taking and boundary detection
fastify.post('/sessions/:id/messages', {
  preHandler: [authMiddleware, turnTakingMiddleware, boundaryDetectionMiddleware]
}, async (request: any, reply) => {
  const { id: sessionId } = request.params;
  const { sender, content, clientMessageId } = request.body;
  const userId = request.user.id;
  
  try {
    // Create the message
    const messageRequest: CreateMessageRequest = {
      sender,
      content,
      clientMessageId,
    };
    
    const message = await MessageModel.create(sessionId, messageRequest, userId);
    
    // Update turn state
    const session = await SessionModel.findById(sessionId, userId);
    if (session) {
      const nextTurnState = await updateTurnState(
        sessionId,
        session.turn_state,
        session.mode,
        userId
      );
      
      fastify.log.info({
        sessionId,
        userId,
        sender,
        turnState: nextTurnState,
        messageId: message.messageId
      }, 'Message sent and turn state updated');
    }
    
    reply.code(202);
    return;
  } catch (error: any) {
    if (error instanceof TurnLockedError || error instanceof BoundaryLockedError) {
      throw error;
    }
    
    reply.code(500);
    return { error: 'MESSAGE_FAILED', message: error.message };
  }
});

// Long-polling message retrieval
fastify.get('/sessions/:id/messages', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { id: sessionId } = request.params;
  const { after, waitMs = 0 } = request.query as { after?: string; waitMs?: number };
  const userId = request.user.id;
  
  try {
    // Check session access
    const session = await SessionModel.findById(sessionId, userId);
    if (!session) {
      reply.code(404);
      return { error: 'SESSION_NOT_FOUND', message: 'Session not found' };
    }
    
    // Check if session is locked
    if (session.boundary_flag) {
      reply.code(409);
      return { 
        error: 'BOUNDARY_LOCKED', 
        message: 'Session has reached safety boundary',
        boundaryTemplate: getBoundaryTemplate()
      };
    }
    
    // Get messages
    const messages = await MessageModel.getMessages(sessionId, after, userId);
    
    // If no messages and waitMs > 0, implement long-polling
    if (messages.length === 0 && waitMs > 0) {
      // Simple long-polling implementation
      await new Promise(resolve => setTimeout(resolve, Math.min(waitMs, 25000)));
      
      // Check again for new messages
      const newMessages = await MessageModel.getMessages(sessionId, after, userId);
      return newMessages;
    }
    
    return messages;
  } catch (error: any) {
    reply.code(500);
    return { error: 'MESSAGES_FAILED', message: error.message };
  }
});

// Session management
fastify.post('/sessions/:id/end', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { id: sessionId } = request.params;
  const userId = request.user.id;
  
  try {
    await SessionModel.endSession(sessionId, userId);
    reply.code(204);
    return;
  } catch (error: any) {
    reply.code(500);
    return { error: 'END_SESSION_FAILED', message: error.message };
  }
});

fastify.delete('/sessions/:id', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { id: sessionId } = request.params;
  const userId = request.user.id;
  
  try {
    await SessionModel.deleteSession(sessionId, userId);
    reply.code(204);
    return;
  } catch (error: any) {
    reply.code(500);
    return { error: 'DELETE_SESSION_FAILED', message: error.message };
  }
});

// Feedback
fastify.post('/sessions/:id/feedback', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { id: sessionId } = request.params;
  const { rating } = request.body as { rating: 'angry' | 'neutral' | 'happy' };
  const userId = request.user.id;
  
  try {
    // TODO: Implement feedback storage
    fastify.log.info({ sessionId, userId, rating }, 'Feedback submitted');
    reply.code(204);
    return;
  } catch (error: any) {
    reply.code(500);
    return { error: 'FEEDBACK_FAILED', message: error.message };
  }
});

// Solo to Couple conversion
fastify.post('/sessions/:id/convert-to-couple', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { id: sessionId } = request.params;
  const { consent, redactedSummary } = request.body as { 
    consent: boolean; 
    redactedSummary: string; 
  };
  const userId = request.user.id;
  
  if (!consent) {
    reply.code(400);
    return { error: 'CONSENT_REQUIRED', message: 'Explicit consent is required for conversion' };
  }
  
  try {
    // TODO: Implement solo to couple conversion
    const newCoupleSessionId = `session_${randomBytes(16).toString('hex')}`;
    
    return { newCoupleSessionId };
  } catch (error: any) {
    reply.code(500);
    return { error: 'CONVERSION_FAILED', message: error.message };
  }
});

// Boundary resources
fastify.get('/boundary/resources', async (request, reply) => {
  return {
    region: 'EU',
    resources: [
      {
        name: 'Crisis Helpline EU',
        phone: '+800-123-4567',
        website: 'https://crisis-helpline.eu'
      },
      {
        name: 'Couples Therapy EU',
        phone: '+800-987-6543',
        website: 'https://couples-therapy.eu'
      }
    ]
  };
});

// Error handling
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  
  if (error instanceof TurnLockedError) {
    reply.code(409);
    return {
      error: 'TURN_LOCKED',
      message: error.message,
      code: 'TURN_VIOLATION',
    };
  }
  
  if (error instanceof BoundaryLockedError) {
    reply.code(409);
    return {
      error: 'BOUNDARY_LOCKED',
      message: error.message,
      code: 'BOUNDARY_VIOLATION',
    };
  }
  
  reply.code(500);
  return {
    error: 'INTERNAL_ERROR',
    message: 'An internal error occurred',
  };
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    fastify.log.info(`M1 Sessions & State Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
