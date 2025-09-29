import Fastify from 'fastify';
import { randomBytes } from 'crypto';
import { SyncApiClient, SyncApiError, TurnLockedError, BoundaryLockedError } from './types/api-client';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Basic health endpoints
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
fastify.post('/sessions', async (request, reply) => {
  const { mode, coupleId } = request.body as { mode: 'couple' | 'solo'; coupleId?: string };
  
  // Validate mode
  if (!['couple', 'solo'].includes(mode)) {
    reply.code(400);
    return { error: 'INVALID_MODE', message: 'Mode must be "couple" or "solo"' };
  }
  
  // For couple mode, coupleId is required
  if (mode === 'couple' && !coupleId) {
    reply.code(400);
    return { error: 'MISSING_COUPLE_ID', message: 'coupleId is required for couple mode' };
  }
  
  const sessionId = `session_${randomBytes(16).toString('hex')}`;
  const turnState = mode === 'couple' ? 'awaitingA' : 'ai_reflect';
  
  return {
    sessionId,
    mode,
    turnState,
  };
});

// Message endpoints
fastify.post('/sessions/:id/messages', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { sender, content, clientMessageId } = request.body as { 
    sender: 'userA' | 'userB'; 
    content: string; 
    clientMessageId: string; 
  };
  
  // Basic validation
  if (!content || content.length > 4000) {
    reply.code(400);
    return { error: 'INVALID_CONTENT', message: 'Content must be 1-4000 characters' };
  }
  
  // TODO: Implement turn-taking logic
  // TODO: Implement safety checks
  // TODO: Implement AI processing
  
  reply.code(202);
  return;
});

fastify.get('/sessions/:id/messages', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { after, waitMs = 0 } = request.query as { after?: string; waitMs?: number };
  
  // TODO: Implement long-polling
  // TODO: Implement message retrieval
  
  return [];
});

// Session management
fastify.post('/sessions/:id/end', async (request, reply) => {
  const { id } = request.params as { id: string };
  
  // TODO: Implement session ending
  reply.code(204);
  return;
});

fastify.delete('/sessions/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  
  // TODO: Implement session deletion
  reply.code(204);
  return;
});

// Feedback
fastify.post('/sessions/:id/feedback', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { rating } = request.body as { rating: 'angry' | 'neutral' | 'happy' };
  
  // TODO: Implement feedback submission
  reply.code(204);
  return;
});

// Solo to Couple conversion
fastify.post('/sessions/:id/convert-to-couple', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { consent, redactedSummary } = request.body as { 
    consent: boolean; 
    redactedSummary: string; 
  };
  
  if (!consent) {
    reply.code(400);
    return { error: 'CONSENT_REQUIRED', message: 'Explicit consent is required for conversion' };
  }
  
  const newCoupleSessionId = `session_${randomBytes(16).toString('hex')}`;
  
  return { newCoupleSessionId };
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
  
  if (error instanceof SyncApiError) {
    reply.code(error.statusCode || 400);
    return {
      error: error.error,
      message: error.message,
      code: error.code,
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
    fastify.log.info(`M0 Scaffold Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
