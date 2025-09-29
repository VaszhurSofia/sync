import Fastify from 'fastify';
import { randomBytes } from 'crypto';
import { longPollManager } from './lib/longpoll';
import { TurnLockedError, BoundaryLockedError } from './types/api-client';

// Mock AI orchestrator for testing
class MockAIOrchestrator {
  async generateResponse(
    mode: 'couple' | 'solo',
    messages: any[],
    context: any
  ): Promise<{ content: string; metadata: any }> {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    if (mode === 'couple') {
      return {
        content: `I hear that you're feeling ${this.extractEmotion(messages)}. It sounds like there's something important you want to share. What's really going on for you right now?`,
        metadata: {
          mode: 'couple',
          prompt_version: 'couple_v2.0',
          validation_status: 'passed',
          latency_ms: 1500,
          tokens_used: 45
        }
      };
    } else {
      return {
        content: `I can sense the ${this.extractEmotion(messages)} in what you're sharing. This seems like a significant moment for you. What would it mean to you if you could find a way forward with this?`,
        metadata: {
          mode: 'solo',
          prompt_version: 'solo_v1.0',
          validation_status: 'passed',
          latency_ms: 1200,
          tokens_used: 38
        }
      };
    }
  }

  private extractEmotion(messages: any[]): string {
    const lastMessage = messages[messages.length - 1]?.content || '';
    if (lastMessage.includes('angry') || lastMessage.includes('mad')) return 'anger';
    if (lastMessage.includes('sad') || lastMessage.includes('hurt')) return 'sadness';
    if (lastMessage.includes('happy') || lastMessage.includes('excited')) return 'joy';
    if (lastMessage.includes('confused') || lastMessage.includes('lost')) return 'confusion';
    return 'uncertainty';
  }

  async validateResponse(
    mode: 'couple' | 'solo',
    response: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    // Mock validation
    const errors: string[] = [];
    
    if (response.length < 10) {
      errors.push('Response too short');
    }
    
    if (response.length > 500) {
      errors.push('Response too long');
    }
    
    if (mode === 'couple' && !response.includes('?')) {
      errors.push('Couple responses should include questions');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// In-memory storage for testing
const sessions = new Map<string, any>();
const messages = new Map<string, any[]>();
const aiOrchestrator = new MockAIOrchestrator();

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

// AI response generation
async function generateAIResponse(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  const sessionMessages = messages.get(sessionId) || [];
  
  if (!session || session.boundary_flag) {
    return;
  }

  try {
    // Generate AI response
    const aiResponse = await aiOrchestrator.generateResponse(
      session.mode,
      sessionMessages,
      { sessionId, mode: session.mode }
    );

    // Validate response
    const validation = await aiOrchestrator.validateResponse(session.mode, aiResponse.content);
    
    if (!validation.valid) {
      fastify.log.warn({ sessionId, errors: validation.errors }, 'AI response validation failed');
      // Use fallback response
      aiResponse.content = session.mode === 'couple' 
        ? "I'm here to help you both communicate. What would you like to explore together?"
        : "I'm here to support you. What's on your mind right now?";
    }

    // Create AI message
    const aiMessage = {
      id: `msg_${randomBytes(16).toString('hex')}`,
      session_id: sessionId,
      sender: 'ai',
      content: aiResponse.content,
      created_at: new Date(),
      safety_tags: [],
      client_message_id: `ai_${Date.now()}`,
      metadata: aiResponse.metadata
    };

    // Add AI message to session
    sessionMessages.push(aiMessage);
    messages.set(sessionId, sessionMessages);

    // Update session state
    if (session.mode === 'couple') {
      session.turn_state = 'awaitingA';
    } else {
      session.turn_state = 'ai_reflect';
    }
    sessions.set(sessionId, session);

    // Notify long-polling clients
    longPollManager.notifyNewMessages(sessionId, [aiMessage]);

    fastify.log.info({
      sessionId,
      mode: session.mode,
      responseLength: aiResponse.content.length,
      latency: aiResponse.metadata.latency_ms,
      tokens: aiResponse.metadata.tokens_used
    }, 'AI response generated');

  } catch (error: any) {
    fastify.log.error({ sessionId, error: error.message }, 'AI response generation failed');
    
    // Send fallback response
    const fallbackMessage = {
      id: `msg_${randomBytes(16).toString('hex')}`,
      session_id: sessionId,
      sender: 'ai',
      content: "I'm having trouble processing that right now. Could you try rephrasing your message?",
      created_at: new Date(),
      safety_tags: ['fallback'],
      client_message_id: `fallback_${Date.now()}`
    };

    const sessionMessages = messages.get(sessionId) || [];
    sessionMessages.push(fallbackMessage);
    messages.set(sessionId, sessionMessages);

    longPollManager.notifyNewMessages(sessionId, [fallbackMessage]);
  }
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
  
  // For solo sessions, generate initial AI response
  if (mode === 'solo') {
    setTimeout(() => generateAIResponse(sessionId), 100);
  }
  
  return {
    sessionId,
    mode,
    turnState,
  };
});

// Message endpoints with AI integration
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
    
    // Create user message
    const userMessage = {
      id: `msg_${randomBytes(16).toString('hex')}`,
      session_id: sessionId,
      sender,
      content,
      created_at: new Date(),
      safety_tags: [],
      client_message_id: clientMessageId,
    };
    
    const sessionMessages = messages.get(sessionId) || [];
    sessionMessages.push(userMessage);
    messages.set(sessionId, sessionMessages);
    
    // Update turn state
    const session = sessions.get(sessionId);
    if (session && session.mode === 'couple') {
      if (session.turn_state === 'awaitingA') {
        session.turn_state = 'awaitingB';
      } else if (session.turn_state === 'awaitingB') {
        session.turn_state = 'ai_reflect';
        // Trigger AI response generation
        setTimeout(() => generateAIResponse(sessionId), 100);
      }
      sessions.set(sessionId, session);
    } else if (session && session.mode === 'solo') {
      session.turn_state = 'ai_reflect';
      sessions.set(sessionId, session);
      // Trigger AI response generation
      setTimeout(() => generateAIResponse(sessionId), 100);
    }
    
    // Notify long-polling clients
    longPollManager.notifyNewMessages(sessionId, [userMessage]);
    
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
    const session = sessions.get(sessionId);
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
        boundaryTemplate: {
          message: "We've detected content that may indicate you're in distress. Your safety is important to us.",
          resources: ["Crisis Helpline: +800-123-4567", "Emergency Services: 112 (EU)"],
          action: 'pause'
        }
      };
    }
    
    // Get current messages
    let sessionMessages = messages.get(sessionId) || [];
    
    if (after) {
      const afterDate = new Date(after);
      sessionMessages = sessionMessages.filter(msg => msg.created_at > afterDate);
    }
    
    // If no messages and waitMs > 0, start long-polling
    if (sessionMessages.length === 0 && waitMs > 0) {
      await longPollManager.startLongPoll(
        sessionId,
        after,
        {
          waitMs: Math.min(waitMs, 25000), // Max 25 seconds
          timeout: 30000, // 30 second timeout
          checkInterval: 1000 // Check every second
        },
        request,
        reply
      );
      return; // Long-polling will handle the response
    }
    
    return sessionMessages;
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
    fastify.log.info(`M3 AI Integration Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
