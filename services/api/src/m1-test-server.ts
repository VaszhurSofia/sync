import Fastify from 'fastify';
import { randomBytes } from 'crypto';
import { TurnLockedError, BoundaryLockedError } from './types/api-client';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// In-memory storage for testing
const sessions = new Map<string, any>();
const messages = new Map<string, any[]>();

// Authentication middleware
async function authMiddleware(request: any, reply: any) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401);
    throw new Error('Authentication required');
  }
  
  const token = authHeader.substring(7);
  const userId = token.split('_')[1] || 'user_123';
  request.user = { id: userId };
}

// Turn-taking validation
async function validateTurnTaking(sessionId: string, sender: 'userA' | 'userB', userId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  
  if (session.boundary_flag) {
    throw new BoundaryLockedError('Session has reached safety boundary, no more messages allowed');
  }
  
  // Check turn-taking for couple mode
  if (session.mode === 'couple') {
    if (session.turn_state === 'awaitingA' && sender !== 'userA') {
      throw new TurnLockedError('It\'s not your turn to speak - waiting for userA');
    }
    if (session.turn_state === 'awaitingB' && sender !== 'userB') {
      throw new TurnLockedError('It\'s not your turn to speak - waiting for userB');
    }
    if (session.turn_state === 'ai_reflect') {
      throw new TurnLockedError('AI is currently processing - please wait');
    }
  }
}

// Boundary detection
function detectBoundaryViolation(content: string): boolean {
  const patterns = [
    /\b(kill|hurt|harm|end|suicide|suicidal)\s+(myself|me|my\s+life)\b/i,
    /\b(hit|hurt|harm|kill|attack|violence|violent)\s+(you|them|him|her|partner|spouse)\b/i,
    /\b(abuse|abusive|manipulate|manipulation|control|controlling)\b/i,
  ];
  
  return patterns.some(pattern => pattern.test(content));
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
  fastify.log.info(`Sending verification code to ${email}`);
  reply.code(204);
  return;
});

fastify.post('/auth/verify-code', async (request, reply) => {
  const { email, code } = request.body as { email: string; code: string };
  
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
  
  const sessionId = `session_${randomBytes(16).toString('hex')}`;
  const turnState = mode === 'couple' ? 'awaitingA' : 'ai_reflect';
  
  const session = {
    id: sessionId,
    mode,
    couple_id: coupleId,
    owner_user_id: mode === 'solo' ? userId : undefined,
    turn_state: turnState,
    boundary_flag: false,
    created_at: new Date(),
  };
  
  sessions.set(sessionId, session);
  messages.set(sessionId, []);
  
  return {
    sessionId,
    mode,
    turnState,
  };
});

// Message endpoints with turn-taking and boundary detection
fastify.post('/sessions/:id/messages', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { id: sessionId } = request.params;
  const { sender, content, clientMessageId } = request.body;
  const userId = request.user.id;
  
  try {
    // Validate turn-taking
    await validateTurnTaking(sessionId, sender, userId);
    
    // Check for boundary violations
    if (detectBoundaryViolation(content)) {
      const session = sessions.get(sessionId);
      if (session) {
        session.boundary_flag = true;
        session.turn_state = 'boundary';
        sessions.set(sessionId, session);
      }
      
      reply.code(409);
      return {
        error: 'BOUNDARY_LOCKED',
        message: 'Content violates safety boundaries. Please reach out to someone you trust or contact emergency services.',
        code: 'BOUNDARY_VIOLATION'
      };
    }
    
    // Create message
    const message = {
      id: `msg_${randomBytes(16).toString('hex')}`,
      session_id: sessionId,
      sender,
      content,
      created_at: new Date(),
      safety_tags: [],
      client_message_id: clientMessageId,
    };
    
    const sessionMessages = messages.get(sessionId) || [];
    sessionMessages.push(message);
    messages.set(sessionId, sessionMessages);
    
    // Update turn state
    const session = sessions.get(sessionId);
    if (session && session.mode === 'couple') {
      if (session.turn_state === 'awaitingA') {
        session.turn_state = 'awaitingB';
      } else if (session.turn_state === 'awaitingB') {
        session.turn_state = 'ai_reflect';
      } else if (session.turn_state === 'ai_reflect') {
        session.turn_state = 'awaitingA';
      }
      sessions.set(sessionId, session);
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

// Get messages
fastify.get('/sessions/:id/messages', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { id: sessionId } = request.params;
  const { after, waitMs = 0 } = request.query as { after?: string; waitMs?: number };
  
  const session = sessions.get(sessionId);
  if (!session) {
    reply.code(404);
    return { error: 'SESSION_NOT_FOUND', message: 'Session not found' };
  }
  
  if (session.boundary_flag) {
    reply.code(409);
    return { 
      error: 'BOUNDARY_LOCKED', 
      message: 'Session has reached safety boundary',
      boundaryTemplate: {
        message: "We've detected content that may indicate you're in distress. Your safety is important to us.",
        resources: ["Crisis Helpline: +800-123-4567", "Emergency Services: 112 (EU)"],
        action: 'pause'
      }
    };
  }
  
  let sessionMessages = messages.get(sessionId) || [];
  
  if (after) {
    const afterDate = new Date(after);
    sessionMessages = sessionMessages.filter(msg => msg.created_at > afterDate);
  }
  
  // Simple long-polling simulation
  if (sessionMessages.length === 0 && waitMs > 0) {
    await new Promise(resolve => setTimeout(resolve, Math.min(waitMs, 25000)));
    sessionMessages = messages.get(sessionId) || [];
  }
  
  return sessionMessages;
});

// Session management
fastify.post('/sessions/:id/end', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { id: sessionId } = request.params;
  
  const session = sessions.get(sessionId);
  if (session) {
    session.ended_at = new Date();
    sessions.set(sessionId, session);
  }
  
  reply.code(204);
  return;
});

fastify.delete('/sessions/:id', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { id: sessionId } = request.params;
  
  sessions.delete(sessionId);
  messages.delete(sessionId);
  
  reply.code(204);
  return;
});

// Feedback
fastify.post('/sessions/:id/feedback', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { id: sessionId } = request.params;
  const { rating } = request.body as { rating: 'angry' | 'neutral' | 'happy' };
  
  fastify.log.info({ sessionId, rating }, 'Feedback submitted');
  reply.code(204);
  return;
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
    fastify.log.info(`M1 Test Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
