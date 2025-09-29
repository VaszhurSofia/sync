import Fastify from 'fastify';
import { randomBytes } from 'crypto';
import { longPollManager } from './lib/longpoll';
import { safetyPrivacyManager, SafetyClassification, PrivacySettings, AuditLog } from './lib/safety-privacy';
import { TurnLockedError, BoundaryLockedError } from './types/api-client';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// In-memory storage for testing
const sessions = new Map<string, any>();
const messages = new Map<string, any[]>();
const userData = new Map<string, any>();

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

// Enhanced safety classification
async function enhancedSafetyCheck(
  content: string,
  sessionId: string,
  userId: string,
  context: any
): Promise<SafetyClassification> {
  return await safetyPrivacyManager.classifyContent(content, sessionId, userId, context);
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

// Health endpoints
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    privacy: safetyPrivacyManager.getPrivacySettings()
  };
});

fastify.get('/health/crypto', async (request, reply) => {
  return {
    kms: 'ok',
    dek_age_days: 7,
    selftest: 'ok',
    encryption_level: safetyPrivacyManager.getPrivacySettings().encryptionLevel
  };
});

// Privacy and safety endpoints
fastify.get('/privacy/settings', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const settings = safetyPrivacyManager.getPrivacySettings();
  return {
    ...settings,
    userId: request.user.id
  };
});

fastify.put('/privacy/settings', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { dataRetention, auditLogging, dataAnonymization } = request.body as Partial<PrivacySettings>;
  
  safetyPrivacyManager.updatePrivacySettings({
    dataRetention,
    auditLogging,
    dataAnonymization
  });
  
  return { success: true };
});

fastify.get('/privacy/audit-logs', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
  const userId = request.user.id;
  
  const logs = safetyPrivacyManager.getAuditLogs(userId, startDate, endDate);
  return { logs, count: logs.length };
});

fastify.post('/privacy/export-data', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const userId = request.user.id;
  const userData = safetyPrivacyManager.exportUserData(userId);
  
  return {
    exportId: `export_${randomBytes(16).toString('hex')}`,
    downloadUrl: `/privacy/download/${userData.exportId}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  };
});

fastify.delete('/privacy/delete-data', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const userId = request.user.id;
  const success = await safetyPrivacyManager.deleteUserData(userId);
  
  if (success) {
    // Delete user sessions and messages
    for (const [sessionId, session] of sessions.entries()) {
      if (session.owner_user_id === userId) {
        sessions.delete(sessionId);
        messages.delete(sessionId);
      }
    }
    
    return { success: true, message: 'User data deleted successfully' };
  } else {
    reply.code(500);
    return { error: 'DELETE_FAILED', message: 'Failed to delete user data' };
  }
});

// Safety classification endpoint
fastify.post('/safety/classify', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { content, sessionId } = request.body as { content: string; sessionId: string };
  const userId = request.user.id;
  
  const context = {
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
    sessionMessageCount: messages.get(sessionId)?.length || 0,
    recentBoundaryViolations: 0 // Would be calculated from audit logs
  };
  
  const classification = await enhancedSafetyCheck(content, sessionId, userId, context);
  
  return {
    classification,
    recommendations: getSafetyRecommendations(classification)
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

// Session endpoints with enhanced safety
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
    safety_level: 'low',
    created_at: new Date(),
  };
  
  sessions.set(sessionId, session);
  messages.set(sessionId, []);
  
  // Log session creation
  if (safetyPrivacyManager.getPrivacySettings().auditLogging) {
    console.log('AUDIT: Session created', {
      sessionId,
      userId,
      mode,
      timestamp: new Date().toISOString()
    });
  }
  
  return {
    sessionId,
    mode,
    turnState,
    safetyLevel: 'low'
  };
});

// Enhanced message endpoints with safety classification
fastify.post('/sessions/:id/messages', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { id: sessionId } = request.params;
  const { sender, content, clientMessageId } = request.body;
  const userId = request.user.id;
  
  try {
    // Validate turn-taking
    await validateTurnTaking(sessionId, sender, userId);
    
    // Enhanced safety classification
    const context = {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      sessionMessageCount: messages.get(sessionId)?.length || 0,
      recentBoundaryViolations: 0
    };
    
    const safetyClassification = await enhancedSafetyCheck(content, sessionId, userId, context);
    
    // Handle safety actions
    if (safetyClassification.action === 'emergency') {
      const session = sessions.get(sessionId);
      if (session) {
        session.boundary_flag = true;
        session.turn_state = 'boundary';
        session.safety_level = 'critical';
        sessions.set(sessionId, session);
      }
      
      reply.code(409);
      return {
        error: 'SAFETY_EMERGENCY',
        message: 'Content indicates immediate safety concern. Please contact emergency services.',
        safetyLevel: 'critical',
        resources: [
          'Emergency Services: 112 (EU)',
          'Crisis Helpline: +800-123-4567',
          'National Suicide Prevention: +800-273-8255'
        ]
      };
    }
    
    if (safetyClassification.action === 'block') {
      reply.code(409);
      return {
        error: 'SAFETY_BLOCKED',
        message: 'Content violates safety guidelines. Please rephrase your message.',
        safetyLevel: safetyClassification.level,
        categories: safetyClassification.categories
      };
    }
    
    // Create message with safety tags
    const message = {
      id: `msg_${randomBytes(16).toString('hex')}`,
      session_id: sessionId,
      sender,
      content,
      created_at: new Date(),
      safety_tags: safetyClassification.categories,
      safety_level: safetyClassification.level,
      client_message_id: clientMessageId,
    };
    
    const sessionMessages = messages.get(sessionId) || [];
    sessionMessages.push(message);
    messages.set(sessionId, sessionMessages);
    
    // Update session safety level
    const session = sessions.get(sessionId);
    if (session) {
      session.safety_level = safetyClassification.level;
      sessions.set(sessionId, session);
    }
    
    // Update turn state
    if (session && session.mode === 'couple') {
      if (session.turn_state === 'awaitingA') {
        session.turn_state = 'awaitingB';
      } else if (session.turn_state === 'awaitingB') {
        session.turn_state = 'ai_reflect';
      } else if (session.turn_state === 'ai_reflect') {
        session.turn_state = 'awaitingA';
      }
      sessions.set(sessionId, session);
    } else if (session && session.mode === 'solo') {
      session.turn_state = 'ai_reflect';
      sessions.set(sessionId, session);
    }
    
    // Notify long-polling clients
    longPollManager.notifyNewMessages(sessionId, [message]);
    
    reply.code(202);
    return {
      messageId: message.id,
      safetyLevel: safetyClassification.level,
      flagged: safetyClassification.action === 'flag'
    };
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
        safetyLevel: session.safety_level,
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
    
    return {
      messages: sessionMessages,
      safetyLevel: session.safety_level,
      privacy: {
        dataRetention: safetyPrivacyManager.getPrivacySettings().dataRetention,
        encryptionLevel: safetyPrivacyManager.getPrivacySettings().encryptionLevel
      }
    };
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

// Feedback with safety context
fastify.post('/sessions/:id/feedback', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { id: sessionId } = request.params;
  const { rating, safetyFeedback } = request.body as { 
    rating: 'angry' | 'neutral' | 'happy'; 
    safetyFeedback?: string;
  };
  
  const session = sessions.get(sessionId);
  const safetyLevel = session?.safety_level || 'low';
  
  fastify.log.info({ 
    sessionId, 
    rating, 
    safetyLevel,
    safetyFeedback 
  }, 'Feedback submitted with safety context');
  
  reply.code(204);
  return;
});

// Solo to Couple conversion with privacy controls
fastify.post('/sessions/:id/convert-to-couple', {
  preHandler: [authMiddleware]
}, async (request: any, reply) => {
  const { id: sessionId } = request.params;
  const { consent, redactedSummary, privacySettings } = request.body as { 
    consent: boolean; 
    redactedSummary: string;
    privacySettings?: Partial<PrivacySettings>;
  };
  
  if (!consent) {
    reply.code(400);
    return { error: 'CONSENT_REQUIRED', message: 'Explicit consent is required for conversion' };
  }
  
  // Apply privacy settings if provided
  if (privacySettings) {
    safetyPrivacyManager.updatePrivacySettings(privacySettings);
  }
  
  const newCoupleSessionId = `session_${randomBytes(16).toString('hex')}`;
  return { 
    newCoupleSessionId,
    privacy: safetyPrivacyManager.getPrivacySettings()
  };
});

// Boundary resources with enhanced safety
fastify.get('/boundary/resources', async (request, reply) => {
  return {
    region: 'EU',
    safetyLevel: 'enhanced',
    resources: [
      {
        name: 'Crisis Helpline EU',
        phone: '+800-123-4567',
        website: 'https://crisis-helpline.eu',
        available: '24/7'
      },
      {
        name: 'Couples Therapy EU',
        phone: '+800-987-6543',
        website: 'https://couples-therapy.eu',
        available: 'Mon-Fri 9-17'
      },
      {
        name: 'Emergency Services',
        phone: '112',
        website: 'https://emergency.eu',
        available: '24/7'
      }
    ],
    privacy: {
      dataRetention: safetyPrivacyManager.getPrivacySettings().dataRetention,
      encryptionLevel: safetyPrivacyManager.getPrivacySettings().encryptionLevel
    }
  };
});

// Helper function to get safety recommendations
function getSafetyRecommendations(classification: SafetyClassification): string[] {
  const recommendations: string[] = [];
  
  if (classification.level === 'critical') {
    recommendations.push('Contact emergency services immediately');
    recommendations.push('Reach out to a trusted friend or family member');
    recommendations.push('Consider professional mental health support');
  } else if (classification.level === 'high') {
    recommendations.push('Consider taking a break from the conversation');
    recommendations.push('Reach out to someone you trust');
    recommendations.push('Consider professional support');
  } else if (classification.level === 'medium') {
    recommendations.push('Take time to reflect on your feelings');
    recommendations.push('Consider discussing with a trusted person');
  }
  
  return recommendations;
}

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
    fastify.log.info(`M4 Safety & Privacy Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
