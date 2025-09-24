import Fastify from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { AIResponseSchema, SafetyContext, SafetyStatus, FrontendLock, SafetyRateLimit, SurveyResponse, SurveyAnalytics, DeleteRequest, DeleteResult } from '@sync/types';
import { validateContentSafety } from './safety/boundary-detector';
import { safetyConfig } from './safety/config';
import { submitSurvey, getSurveyAnalytics, getAIInsights, clearSurveyResponses } from './survey/survey-system';
import { requestHardDelete, confirmHardDelete, executeHardDelete, getDeleteRequestStatus, getAuditLogs, initializeDeleteData, clearAllData, deleteConfig } from './delete/hard-delete';
import { rateLimiters, createDynamicRateLimit, getRateLimitStatus, resetRateLimit, rateLimitConfigs } from './middleware/rate-limit';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// In-memory storage for simplicity (re-initialized for M7)
const users = new Map();
const couples = new Map();
const invites = new Map();
const verificationCodes = new Map();
const sessions = new Map();
const messages = new Map();
const messageSubscribers = new Map(); // For long-polling
const safetyViolations = new Map<string, number>(); // Track safety violations per user

// Simple encryption for testing
function encrypt(text: string): string {
  if (!text) return '';
  return Buffer.from(text).toString('base64');
}

function decrypt(encrypted: string): string {
  if (!encrypted) return '';
  return Buffer.from(encrypted, 'base64').toString('utf8');
}

// AI Service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3002';

// Health check
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(), 
    features: ['M1', 'M2', 'M3', 'M4', 'M5', 'M7'], 
    safety: 'enabled', 
    survey: 'enabled', 
    delete: 'enabled',
    rateLimiting: 'enabled',
    accessibility: 'enabled'
  };
});

// Rate limit status endpoint
fastify.get('/rate-limit/status', async (request, reply) => {
  const status = getRateLimitStatus(request);
  reply.send(status);
});

// Admin endpoint to reset rate limits (in production, this would be protected)
fastify.post('/admin/rate-limit/reset', async (request, reply) => {
  const { clientId } = request.body as { clientId: string };
  const reset = resetRateLimit(clientId);
  reply.send({ success: reset, message: reset ? 'Rate limits reset' : 'No rate limits found for client' });
});

// Auth routes with rate limiting
fastify.post('/auth/request-code', {
  preHandler: rateLimiters.auth
}, async (request, reply) => {
  const { email } = request.body as { email: string };
  const code = '123456';
  verificationCodes.set(email, code);
  reply.code(204).send();
});

fastify.post('/auth/verify-code', {
  preHandler: rateLimiters.auth
}, async (request, reply) => {
  const { email, code } = request.body as { email: string; code: string };
  if (verificationCodes.get(email) !== code) {
    reply.code(401).send({ error: 'Invalid or expired code' });
    return;
  }
  verificationCodes.delete(email);

  let user = users.get(email);
  if (!user) {
    const displayName = email.split('@')[0];
    user = {
      id: `user_${Date.now()}`,
      email,
      displayName: displayName,
      displayNameEnc: encrypt(displayName)
    };
    users.set(email, user);
    // Initialize data for hard delete system demo
    initializeDeleteData(user.id, `couple_${user.id}`, `session_${user.id}`);
  }

  const token = `token_${user.id}_${Date.now()}`;
  user.token = token;
  reply.send({ accessToken: token });
});

fastify.get('/auth/me', {
  preHandler: rateLimiters.general
}, async (request, reply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.substring(7);
  const user = Array.from(users.values()).find((u: any) => u.token === token);

  if (!user) {
    reply.code(401).send({ error: 'Invalid token' });
    return;
  }
  reply.send({ id: user.id, email: user.email, displayName: decrypt(user.displayNameEnc) });
});

// Middleware to authenticate requests
fastify.addHook('preHandler', (request, reply, done) => {
  if (request.url.startsWith('/auth') || 
      request.url.startsWith('/health') || 
      request.url.startsWith('/safety/status') || 
      request.url.startsWith('/delete/status') ||
      request.url.startsWith('/rate-limit/status') ||
      request.url.startsWith('/admin/')) {
    done();
    return;
  }
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.substring(7);
  const user = Array.from(users.values()).find((u: any) => u.token === token);
  if (!user) {
    reply.code(401).send({ error: 'Invalid token' });
    return;
  }
  (request as any).user = user;
  (request as any).safetyViolations = safetyViolations.get(user.id) || 0;
  done();
});

// Couple routes with rate limiting
fastify.post('/couples', {
  preHandler: rateLimiters.general
}, async (request, reply) => {
  const user = (request as any).user;
  // Check if user already has a couple
  const existingCouple = Array.from(couples.values()).find((c: any) => c.userAId === user.id || c.userBId === user.id);
  if (existingCouple) {
    reply.code(400).send({ error: 'User already has a couple' });
    return;
  }

  const coupleId = `couple_${Date.now()}`;
  const couple = { id: coupleId, userAId: user.id, userBId: null, createdAt: new Date().toISOString() };
  couples.set(coupleId, couple);
  user.coupleId = coupleId; // Assign coupleId to user
  reply.code(201).send({ coupleId });
});

fastify.post('/invites', {
  preHandler: rateLimiters.general
}, async (request, reply) => {
  const user = (request as any).user;
  const couple = Array.from(couples.values()).find((c: any) => c.userAId === user.id || c.userBId === user.id);
  if (!couple) {
    reply.code(404).send({ error: 'Couple not found' });
    return;
  }
  const inviteCode = `INV${Date.now().toString().slice(-6)}`;
  invites.set(inviteCode, { code: inviteCode, coupleId: couple.id, expiresAt: new Date(Date.now() + 3600000).toISOString(), acceptedBy: null });
  reply.code(201).send({ code: inviteCode, link: `http://localhost:3001/invites/${inviteCode}/accept` });
});

fastify.post('/invites/:code/accept', {
  preHandler: rateLimiters.general
}, async (request, reply) => {
  const user = (request as any).user;
  const { code } = request.params as { code: string };
  const invite = invites.get(code);
  if (!invite || invite.acceptedBy) {
    reply.code(404).send({ error: 'Invite not found or already accepted' });
    return;
  }
  const couple = couples.get(invite.coupleId);
  if (!couple) {
    reply.code(404).send({ error: 'Couple not found' });
    return;
  }
  if (couple.userAId === user.id) {
    reply.code(400).send({ error: 'Cannot accept own invite' });
    return;
  }
  couple.userBId = user.id;
  invite.acceptedBy = user.id;
  user.coupleId = couple.id; // Assign coupleId to user
  reply.code(204).send();
});

fastify.get('/couples/me', {
  preHandler: rateLimiters.general
}, async (request, reply) => {
  const user = (request as any).user;
  const couple = Array.from(couples.values()).find((c: any) => c.userAId === user.id || c.userBId === user.id);
  if (!couple) {
    reply.code(404).send({ error: 'Couple not found' });
    return;
  }
  reply.send(couple);
});

// Session routes with dynamic rate limiting
fastify.post('/sessions', {
  preHandler: createDynamicRateLimit(rateLimitConfigs.general)
}, async (request, reply) => {
  const user = (request as any).user;

  if (!user || !user.coupleId) {
    reply.code(400).send({ error: 'User is not part of a couple' });
    return;
  }

  const sessionId = `session_${Date.now()}`;
  const session = {
    id: sessionId,
    coupleId: user.coupleId,
    startedAt: new Date(),
    endedAt: null,
    boundaryFlag: false,
    messages: [],
    turn: user.id, // User who creates session starts
    aiResponses: [], // Store AI responses
  };

  sessions.set(sessionId, session);

  reply.code(201).send({ sessionId });
});

fastify.post('/sessions/:id/messages', {
  preHandler: createDynamicRateLimit(rateLimitConfigs.messages)
}, async (request, reply) => {
  const { id } = request.params as { id: string };
  const { content, client_message_id } = request.body as { content: string; client_message_id: string };
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.substring(7);
  const user = Array.from(users.values()).find((u: any) => u.token === token);

  if (!user) {
    reply.code(404).send({ error: 'User not found' });
    return;
  }

  const session = sessions.get(id);
  if (!session) {
    reply.code(404).send({ error: 'Session not found' });
    return;
  }

  if (session.endedAt) {
    reply.code(400).send({ error: 'Session has ended' });
    return;
  }

  if (session.boundaryFlag) {
    reply.code(409).send({ error: 'Session has reached boundary, no more messages allowed' });
    return;
  }

  // M4: Safety validation
  const violations = safetyViolations.get(user.id) || 0;
  const context: SafetyContext = {
    userId: user.id,
    sessionId: id,
    messageCount: Array.from(messages.values()).filter((m: any) => m.sender === user.role).length,
    previousViolations: violations
  };

  // Apply safety validation directly
  const validation = validateContentSafety(content);

  if (!validation.isValid) {
    const { boundaryResult, safetyResponse } = validation;

    // Log the safety violation
    console.log('🚨 Safety boundary violation detected:', {
      userId: user.id,
      sessionId: id,
      riskLevel: boundaryResult.riskLevel,
      concerns: boundaryResult.concerns,
      content: content.substring(0, 100) + '...'
    });

    // Track safety violation
    const currentViolations = safetyViolations.get(user.id) || 0;
    safetyViolations.set(user.id, currentViolations + 1);

    // Return appropriate response based on risk level
    if (boundaryResult.riskLevel === 'high') {
      reply.code(403).send({
        error: 'Content blocked for safety reasons',
        message: safetyResponse?.message || 'This content cannot be processed due to safety concerns.',
        resources: safetyResponse?.resources || [],
        action: safetyResponse?.action || 'block',
        boundaryResult: {
          riskLevel: boundaryResult.riskLevel,
          concerns: boundaryResult.concerns
        }
      });
      return;
    }

    if (boundaryResult.riskLevel === 'medium') {
      reply.code(422).send({
        error: 'Content flagged for review',
        message: safetyResponse?.message || 'This content has been flagged for safety review.',
        resources: safetyResponse?.resources || [],
        action: safetyResponse?.action || 'warn',
        boundaryResult: {
          riskLevel: boundaryResult.riskLevel,
          concerns: boundaryResult.concerns
        }
      });
      return;
    }
  }

  // Check for idempotent message
  const existingMessage = Array.from(messages.values()).find(
    (msg: any) => msg.sessionId === id && msg.clientMessageId === client_message_id
  );
  if (existingMessage) {
    reply.code(202).send({ messageId: existingMessage.id, status: 'accepted', note: 'Idempotent message' });
    return;
  }

  const couple = couples.get(session.coupleId);
  let senderRole: 'userA' | 'userB';
  if (user.id === couple.userAId) {
    senderRole = 'userA';
  } else if (user.id === couple.userBId) {
    senderRole = 'userB';
  } else {
    reply.code(403).send({ error: 'User not part of this couple' });
    return;
  }

  if (session.turn !== user.id) {
    reply.code(400).send({ error: 'It is not your turn to send a message' });
    return;
  }

  const message = {
    id: uuidv4(),
    sessionId: id,
    sender: senderRole,
    contentEnc: encrypt(content),
    createdAt: new Date(),
    safetyTags: validation.boundaryResult.concerns, // Add safety tags
    clientMessageId: client_message_id,
  };
  messages.set(message.id, message); // Store messages by their ID
  session.messages.push(message.id); // Store message IDs in session

  // Toggle turn
  session.turn = (user.id === couple.userAId) ? couple.userBId : couple.userAId;

  // --- M3: Call AI Orchestrator after both partners have spoken ---
  const sessionMessages = session.messages.map((msgId: string) => messages.get(msgId));
  const partnerAMessages = sessionMessages.filter((m: any) => m.sender === 'userA');
  const partnerBMessages = sessionMessages.filter((m: any) => m.sender === 'userB');

  if (partnerAMessages.length > 0 && partnerBMessages.length > 0 && partnerAMessages.length === partnerBMessages.length) {
    const lastMessageA = partnerAMessages[partnerAMessages.length - 1];
    const lastMessageB = partnerBMessages[partnerBMessages.length - 1];

    const conversationHistoryForAI = sessionMessages.map((m: any) => ({
      role: m.sender,
      content: decrypt(m.contentEnc),
    }));

    try {
      const aiResponse = await axios.post(`${AI_SERVICE_URL}/orchestrate`, {
        partnerA: decrypt(lastMessageA.contentEnc),
        partnerB: decrypt(lastMessageB.contentEnc),
        conversationHistory: conversationHistoryForAI,
      });

      const validatedAIResponse = AIResponseSchema.parse(aiResponse.data);

      const aiMessageContent = JSON.stringify(validatedAIResponse);
      const aiMessage = {
        id: uuidv4(),
        sessionId: id,
        sender: 'ai',
        contentEnc: encrypt(aiMessageContent),
        createdAt: new Date(),
        safetyTags: aiResponse.data.safety?.concerns || [],
        clientMessageId: uuidv4(),
      };
      messages.set(aiMessage.id, aiMessage);
      session.messages.push(aiMessage.id);
      session.aiResponses.push(aiMessage.id); // Store AI response IDs separately

      // Notify long-polling subscribers about the AI message
      if (messageSubscribers.has(id)) {
        messageSubscribers.get(id).forEach((resolve: any) => resolve(aiMessage));
        messageSubscribers.delete(id);
      }

    } catch (aiError) {
      fastify.log.error('Error calling AI service:', aiError);
      // Fallback AI response
      const fallbackAIResponse = {
        mirror: {
          partnerA: "I heard you expressing your thoughts and feelings.",
          partnerB: "I heard you sharing your perspective as well.",
        },
        clarify: "Can you help me understand what's most important to each of you right now?",
        micro_actions: ["Take a moment to breathe", "Share one specific thing you appreciate about your partner"],
        check: "Did I get that right?",
      };
      const fallbackAIMessage = {
        id: uuidv4(),
        sessionId: id,
        sender: 'ai',
        contentEnc: encrypt(JSON.stringify(fallbackAIResponse)),
        createdAt: new Date(),
        safetyTags: ['AI_SERVICE_ERROR'],
        clientMessageId: uuidv4(),
      };
      messages.set(fallbackAIMessage.id, fallbackAIMessage);
      session.messages.push(fallbackAIMessage.id);
      session.aiResponses.push(fallbackAIMessage.id);
    }
  }

  // Notify long-polling subscribers about the user message
  if (messageSubscribers.has(id)) {
    messageSubscribers.get(id).forEach((resolve: any) => resolve(message));
    messageSubscribers.delete(id);
  }

  reply.code(202).send({ messageId: message.id, status: 'accepted' });
});

fastify.get('/sessions/:id/messages', {
  preHandler: rateLimiters.general
}, async (request, reply) => {
  const user = (request as any).user;
  const { id } = request.params as { id: string };
  const { waitMs } = request.query as { waitMs?: string };

  const session = sessions.get(id);
  if (!session) {
    reply.code(404).send({ error: 'Session not found' });
    return;
  }

  const couple = couples.get(session.coupleId);
  if (user.id !== couple.userAId && user.id !== couple.userBId) {
    reply.code(403).send({ error: 'User not part of this couple' });
    return;
  }

  const lastMessageId = request.headers['x-last-message-id'] as string | undefined;
  let newMessages = session.messages.map((msgId: string) => messages.get(msgId));

  if (lastMessageId) {
    const lastMessageIndex = newMessages.findIndex((m: any) => m.id === lastMessageId);
    if (lastMessageIndex !== -1) {
      newMessages = newMessages.slice(lastMessageIndex + 1);
    }
  }

  if (newMessages.length > 0) {
    reply.send(newMessages.map((m: any) => ({ ...m, content: decrypt(m.contentEnc) })));
    return;
  }

  // Long-polling
  if (waitMs) {
    const timeout = parseInt(waitMs, 10);
    if (isNaN(timeout) || timeout <= 0) {
      reply.code(400).send({ error: 'Invalid waitMs parameter' });
      return;
    }

    await new Promise(resolve => {
      if (!messageSubscribers.has(id)) {
        messageSubscribers.set(id, []);
      }
      messageSubscribers.get(id).push(resolve);
      setTimeout(() => {
        if (messageSubscribers.has(id)) {
          messageSubscribers.set(id, messageSubscribers.get(id).filter((r: any) => r !== resolve));
        }
        resolve(null); // Resolve after timeout even if no message
      }, timeout);
    });

    // Re-check for new messages after waiting
    if (lastMessageId) {
      const lastMessageIndex = newMessages.findIndex((m: any) => m.id === lastMessageId);
      if (lastMessageIndex !== -1) {
        newMessages = newMessages.slice(lastMessageIndex + 1);
      }
    } else {
      newMessages = session.messages.map((msgId: string) => messages.get(msgId));
    }
    reply.send(newMessages.map((m: any) => ({ ...m, content: decrypt(m.contentEnc) })));
    return;
  }

  reply.send([]);
});

fastify.post('/sessions/:id/end', {
  preHandler: rateLimiters.general
}, async (request, reply) => {
  const user = (request as any).user;
  const { id } = request.params as { id: string };
  const session = sessions.get(id);
  if (!session) {
    reply.code(404).send({ error: 'Session not found' });
    return;
  }
  const couple = couples.get(session.coupleId);
  if (user.id !== couple.userAId && user.id !== couple.userBId) {
    reply.code(403).send({ error: 'User not authorized to end this session' });
    return;
  }
  session.endedAt = new Date();
  reply.code(204).send();
});

fastify.delete('/sessions/:id', {
  preHandler: rateLimiters.general
}, async (request, reply) => {
  const user = (request as any).user;
  const { id } = request.params as { id: string };
  const session = sessions.get(id);
  if (!session) {
    reply.code(404).send({ error: 'Session not found' });
    return;
  }
  const couple = couples.get(session.coupleId);
  if (user.id !== couple.userAId && user.id !== couple.userBId) {
    reply.code(403).send({ error: 'User not authorized to delete this session' });
    return;
  }
  sessions.delete(id);
  // Also delete associated messages
  Array.from(messages.values()).forEach((msg: any) => {
    if (msg.sessionId === id) {
      messages.delete(msg.id);
    }
  });
  reply.code(204).send();
});

// M4: Safety Status Endpoint
fastify.get('/safety/status', {
  preHandler: rateLimiters.general
}, async (request, reply) => {
  const user = (request as any).user; // User might not be authenticated for this public endpoint

  let userId = 'anonymous';
  if (user) {
    userId = user.id;
  }

  const violations = safetyViolations.get(userId) || 0;

  const rateLimit: SafetyRateLimit = {
    maxRequests: safetyConfig.rateLimit.maxRequests,
    windowMs: safetyConfig.rateLimit.windowMs,
    message: `You can send ${safetyConfig.rateLimit.maxRequests} messages per ${safetyConfig.rateLimit.windowMs / 1000} seconds.`,
  };

  const frontendLock: FrontendLock = {
    isLocked: violations >= safetyConfig.maxViolationsBeforeLock,
    reason: violations >= safetyConfig.maxViolationsBeforeLock ? 'Too many safety violations' : 'normal',
    message: violations >= safetyConfig.maxViolationsBeforeLock
      ? safetyConfig.safetyTemplates.frontend_lock.response.message
      : 'No frontend lock active.',
    resources: violations >= safetyConfig.maxViolationsBeforeLock
      ? safetyConfig.safetyTemplates.frontend_lock.response.resources
      : [],
    unlockConditions: violations >= safetyConfig.maxViolationsBeforeLock
      ? ['Contact support', 'Review safety guidelines']
      : [],
  };

  const safetyStatus: SafetyStatus = {
    userId: userId,
    violations: violations,
    rateLimit: rateLimit,
    frontendLock: frontendLock,
    safetyGuidelines: safetyConfig.safetyGuidelines,
  };

  reply.send(safetyStatus);
});

// M4: EU Resources Endpoint
fastify.get('/safety/eu-resources', {
  preHandler: rateLimiters.general
}, async (request, reply) => {
  reply.send(safetyConfig.euResources);
});

// M5: Survey Endpoints with rate limiting
fastify.post('/sessions/:id/survey', {
  preHandler: rateLimiters.survey
}, async (request, reply) => {
  const user = (request as any).user;
  const { id: sessionId } = request.params as { id: string };
  const { rating, feedback } = request.body as { rating: 'angry' | 'neutral' | 'happy'; feedback?: string };

  const session = sessions.get(sessionId);
  if (!session) {
    reply.code(404).send({ error: 'Session not found' });
    return;
  }
  // In a real app, check if session has ended and if within grace period
  // For demo, allow submission if user is part of the session's couple
  const couple = couples.get(session.coupleId);
  if (user.id !== couple.userAId && user.id !== couple.userBId) {
    reply.code(403).send({ error: 'User not authorized to submit survey for this session' });
    return;
  }

  try {
    const surveyResponse = submitSurvey(sessionId, user.id, rating, feedback);
    reply.code(201).send(surveyResponse);
  } catch (error: any) {
    reply.code(400).send({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

fastify.get('/survey/analytics', {
  preHandler: rateLimiters.general
}, async (request, reply) => {
  const user = (request as any).user;
  // In a real app, coupleId would be derived from user or passed as query param
  const analytics = getSurveyAnalytics(user?.coupleId);
  const insights = getAIInsights(analytics);
  reply.send({ ...analytics, insights });
});

// M5: Hard Delete Endpoints with strict rate limiting
fastify.post('/delete/request', {
  preHandler: rateLimiters.delete
}, async (request, reply) => {
  const user = (request as any).user;
  const { reason } = request.body as { reason: DeleteRequest['reason'] };
  try {
    const deleteRequest = requestHardDelete(user.id, reason);
    reply.code(202).send(deleteRequest);
  } catch (error: any) {
    reply.code(400).send({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

fastify.post('/delete/:requestId/confirm', {
  preHandler: rateLimiters.delete
}, async (request, reply) => {
  const user = (request as any).user;
  const { requestId } = request.params as { requestId: string };
  try {
    const deleteRequest = confirmHardDelete(requestId, user.id);
    reply.code(202).send(deleteRequest);
  } catch (error: any) {
    reply.code(400).send({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

fastify.post('/delete/:requestId/execute', {
  preHandler: rateLimiters.delete
}, async (request, reply) => {
  const user = (request as any).user; // Admin or system user in real scenario
  const { requestId } = request.params as { requestId: string };
  // For demo, allow any authenticated user to "execute"
  try {
    const deleteResult = executeHardDelete(requestId);
    reply.code(200).send(deleteResult);
  } catch (error: any) {
    reply.code(400).send({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

fastify.get('/delete/:requestId/status', {
  preHandler: rateLimiters.general
}, async (request, reply) => {
  const { requestId } = request.params as { requestId: string };
  const status = getDeleteRequestStatus(requestId);
  if (!status) {
    reply.code(404).send({ error: 'Delete request not found' });
    return;
  }
  reply.send(status);
});

fastify.get('/delete/audit-logs', {
  preHandler: rateLimiters.general
}, async (request, reply) => {
  // In a real app, this would be an admin-only endpoint
  reply.send(getAuditLogs());
});

// Start server
async function start() {
  try {
    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`🚀 Sync API server (M7 Enhanced with Rate Limiting) running on http://${host}:${port}`);
    console.log(`📚 API documentation available at http://${host}:${port}/docs`);
    console.log(`🛡️ Safety & Boundary features enabled`);
    console.log(`📊 Survey system enabled`);
    console.log(`🗑️ Hard delete system enabled`);
    console.log(`⚡ Rate limiting enabled`);
    console.log(`♿ Accessibility features enabled`);
    console.log(`🧪 Ready for testing! Use the test client: node test-m7-enhanced.js`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down API service gracefully...');
  await fastify.close();
  process.exit(0);
});

start();
