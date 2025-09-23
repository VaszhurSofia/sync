import Fastify from 'fastify';
import { safetyMiddleware, getSafetyRateLimit, getFrontendLock, SafetyContext } from './middleware/safety';
import { validateContentSafety } from './safety/boundary-detector';
import { 
  SurveyResponse, 
  SurveyAnalytics, 
  validateSurveyResponse, 
  calculateSurveyAnalytics, 
  generateSurveyInsights,
  createSurveyResponse,
  formatSurveyResponse,
  getSurveyConfig 
} from './survey/survey-system';
import { 
  DeleteRequest, 
  DeleteScope, 
  DeleteResult, 
  validateDeleteRequest, 
  createDeleteRequest, 
  calculateDeleteScope, 
  executeHardDelete, 
  getDeleteConfig, 
  isDeleteAllowed, 
  generateDeleteConfirmation 
} from './delete/hard-delete';

const fastify = Fastify({
  logger: true,
});

// Simple in-memory storage for testing
const users = new Map();
const couples = new Map();
const invites = new Map();
const verificationCodes = new Map();
const sessions = new Map();
const messages = new Map();
const messageSubscribers = new Map();
const safetyViolations = new Map();
const surveyResponses = new Map(); // M5: Survey responses
const deleteRequests = new Map(); // M5: Delete requests
const auditLogs = new Map(); // M5: Audit logs

// Simple encryption for testing
function encrypt(text: string): string {
  if (!text) return '';
  return Buffer.from(text).toString('base64');
}

function decrypt(encrypted: string): string {
  if (!encrypted) return '';
  return Buffer.from(encrypted, 'base64').toString('utf8');
}

// AI Orchestrator integration
async function callAIOrchestrator(partnerA: string, partnerB: string, context?: any) {
  try {
    const response = await fetch('http://localhost:3002/orchestrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        partnerA,
        partnerB,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI orchestrator call failed:', error);
    // Fallback response
    return {
      mirror: {
        partnerA: "I heard you expressing your thoughts and feelings.",
        partnerB: "I heard you sharing your perspective as well.",
      },
      clarify: "Can you help me understand what's most important to each of you right now?",
      micro_actions: ["Take a moment to breathe", "Share one specific thing you appreciate about your partner"],
      check: "Did I get that right?",
      safety: {
        isSafe: true,
        riskLevel: 'low',
        concerns: [],
      },
    };
  }
}

// Health check
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    features: ['M1', 'M2', 'M3', 'M4', 'M5'],
    safety: 'enabled',
    survey: 'enabled',
    delete: 'enabled'
  };
});

// ===== M1-M4: EXISTING ENDPOINTS =====
// (Auth, couples, sessions, messages, safety - same as before)

// Request verification code
fastify.post('/auth/request-code', async (request, reply) => {
  const { email } = request.body as { email: string };
  const code = '123456'; // Fixed for testing
  verificationCodes.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
  
  console.log(`🔑 Verification code for ${email}: ${code}`);
  reply.code(204).send();
});

// Verify code and get token
fastify.post('/auth/verify-code', async (request, reply) => {
  const { email, code } = request.body as { email: string; code: string };
  
  const stored = verificationCodes.get(email);
  if (!stored || stored.code !== code || stored.expiresAt < Date.now()) {
    reply.code(401).send({ error: 'Invalid or expired code' });
    return;
  }
  
  verificationCodes.delete(email);
  
  // Create or get user
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
  }
  
  // Generate simple token
  const token = `token_${user.id}_${Date.now()}`;
  user.token = token;
  
  reply.send({ accessToken: token });
});

// Get current user
fastify.get('/auth/me', async (request, reply) => {
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
  
  reply.send({
    id: user.id,
    email: user.email,
    displayName: decrypt(user.displayNameEnc),
  });
});

// Create couple
fastify.post('/couples', async (request, reply) => {
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
  
  if (user.coupleId) {
    reply.code(400).send({ error: 'User already has a couple' });
    return;
  }
  
  const coupleId = `couple_${Date.now()}`;
  const couple = { id: coupleId, members: [{ userId: user.id, role: 'userA' }] };
  couples.set(coupleId, couple);
  
  user.coupleId = coupleId;
  user.role = 'userA';
  users.set(user.email, user);
  
  reply.code(201).send({ coupleId });
});

// Create invite
fastify.post('/invites', async (request, reply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  const user = Array.from(users.values()).find((u: any) => u.token === token);
  
  if (!user || !user.coupleId) {
    reply.code(400).send({ error: 'User is not part of a couple' });
    return;
  }
  
  const couple = couples.get(user.coupleId);
  if (couple.members.length >= 2) {
    reply.code(400).send({ error: 'Couple is already full' });
    return;
  }
  
  const code = `INV${Date.now().toString().slice(-6)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  invites.set(code, {
    code,
    coupleId: user.coupleId,
    expiresAt,
    acceptedBy: null,
  });
  
  reply.code(201).send({
    code,
    link: `http://localhost:3001/invites/${code}`,
    expiresAt: expiresAt.toISOString(),
  });
});

// Accept invite
fastify.post('/invites/:code/accept', async (request, reply) => {
  const { code } = request.params as { code: string };
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
  
  if (user.coupleId) {
    reply.code(400).send({ error: 'User already has a couple' });
    return;
  }
  
  const invite = invites.get(code);
  if (!invite || invite.expiresAt < new Date() || invite.acceptedBy) {
    reply.code(400).send({ error: 'Invalid or expired invite' });
    return;
  }
  
  const couple = couples.get(invite.coupleId);
  if (couple.members.length >= 2) {
    reply.code(400).send({ error: 'Couple is already full' });
    return;
  }
  
  couple.members.push({ userId: user.id, role: 'userB' });
  couples.set(invite.coupleId, couple);
  
  user.coupleId = invite.coupleId;
  user.role = 'userB';
  users.set(user.email, user);
  
  invite.acceptedBy = user.id;
  invites.set(code, invite);
  
  reply.code(204).send();
});

// Get couple info
fastify.get('/couples/me', async (request, reply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  const user = Array.from(users.values()).find((u: any) => u.token === token);
  
  if (!user || !user.coupleId) {
    reply.code(404).send({ error: 'User is not part of a couple' });
    return;
  }
  
  const couple = couples.get(user.coupleId);
  const members = couple.members.map((member: any) => {
    const memberUser = Array.from(users.values()).find((u: any) => u.id === member.userId);
    return {
      id: memberUser.id,
      email: memberUser.email,
      displayName: decrypt(memberUser.displayNameEnc),
      role: member.role,
    };
  });
  
  reply.send({
    id: couple.id,
    createdAt: new Date().toISOString(),
    members,
  });
});

// Create session
fastify.post('/sessions', async (request, reply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  const user = Array.from(users.values()).find((u: any) => u.token === token);
  
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
  };
  
  sessions.set(sessionId, session);
  
  reply.code(201).send({ sessionId });
});

// Send message with safety validation
fastify.post('/sessions/:id/messages', async (request, reply) => {
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
    reply.code(202).send();
    return;
  }
  
  // Create message
  const messageId = `msg_${Date.now()}`;
  const message = {
    id: messageId,
    sessionId: id,
    sender: user.role,
    contentEnc: encrypt(content),
    createdAt: new Date(),
    safetyTags: validation.boundaryResult?.concerns || [],
    clientMessageId: client_message_id,
  };
  
  messages.set(messageId, message);
  
  // Check if we should trigger AI response
  const sessionMessages = Array.from(messages.values())
    .filter((msg: any) => msg.sessionId === id)
    .sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime());
  
  const userAMessages = sessionMessages.filter((msg: any) => msg.sender === 'userA');
  const userBMessages = sessionMessages.filter((msg: any) => msg.sender === 'userB');
  
  // Trigger AI response if both partners have sent at least one message
  if (userAMessages.length > 0 && userBMessages.length > 0) {
    const latestUserA = userAMessages[userAMessages.length - 1];
    const latestUserB = userBMessages[userBMessages.length - 1];
    
    const partnerA = decrypt(latestUserA.contentEnc);
    const partnerB = decrypt(latestUserB.contentEnc);
    
    // Call AI orchestrator
    const aiResponse = await callAIOrchestrator(partnerA, partnerB, {
      sessionId: id,
      messageCount: sessionMessages.length,
    });
    
    // Create AI response message
    const aiMessageId = `ai_${Date.now()}`;
    const aiMessage = {
      id: aiMessageId,
      sessionId: id,
      sender: 'ai',
      contentEnc: encrypt(JSON.stringify(aiResponse)),
      createdAt: new Date(),
      safetyTags: aiResponse.safety?.concerns || [],
      clientMessageId: `ai_${Date.now()}`,
    };
    
    messages.set(aiMessageId, aiMessage);
    
    console.log('🤖 AI Response generated:', {
      sessionId: id,
      safety: aiResponse.safety,
      actions: aiResponse.micro_actions.length,
    });
  }
  
  // Notify subscribers for long-polling
  const subscribers = messageSubscribers.get(id) || [];
  subscribers.forEach((subscriber: any) => {
    if (!subscriber.resolved) {
      subscriber.resolved = true;
      subscriber.reply.send([{
        id: message.id,
        session_id: message.sessionId,
        sender: message.sender,
        content_enc: message.contentEnc,
        created_at: message.createdAt,
        safety_tags: message.safetyTags,
        client_message_id: message.clientMessageId,
      }]);
    }
  });
  messageSubscribers.delete(id);
  
  reply.code(202).send();
});

// Get messages (with long-polling)
fastify.get('/sessions/:id/messages', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { after, waitMs } = request.query as { after?: string; waitMs?: string };
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
  
  // Get messages after timestamp
  const afterDate = after ? new Date(after) : new Date(0);
  const sessionMessages = Array.from(messages.values())
    .filter((msg: any) => msg.sessionId === id && msg.createdAt > afterDate)
    .sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime());
  
  if (sessionMessages.length > 0) {
    const response = sessionMessages.map((msg: any) => ({
      id: msg.id,
      session_id: msg.sessionId,
      sender: msg.sender,
      content_enc: msg.contentEnc,
      created_at: msg.createdAt,
      safety_tags: msg.safetyTags,
      client_message_id: msg.clientMessageId,
    }));
    
    reply.send(response);
  } else if (waitMs && parseInt(waitMs) > 0) {
    const waitTime = Math.min(parseInt(waitMs), 25000);
    
    const subscriber = {
      reply,
      resolved: false,
    };
    
    messageSubscribers.set(id, [subscriber]);
    
    setTimeout(() => {
      if (!subscriber.resolved) {
        subscriber.resolved = true;
        reply.send([]);
        messageSubscribers.delete(id);
      }
    }, waitTime);
  } else {
    reply.send([]);
  }
});

// End session
fastify.post('/sessions/:id/end', async (request, reply) => {
  const { id } = request.params as { id: string };
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
  
  session.endedAt = new Date();
  sessions.set(id, session);
  
  reply.code(204).send();
});

// Delete session
fastify.delete('/sessions/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
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
  
  sessions.delete(id);
  Array.from(messages.entries()).forEach(([msgId, msg]: [string, any]) => {
    if (msg.sessionId === id) {
      messages.delete(msgId);
    }
  });
  
  reply.code(204).send();
});

// ===== M5: SURVEY ENDPOINTS =====

// Submit survey response
fastify.post('/sessions/:id/survey', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { rating, feedback } = request.body as { rating: 'angry' | 'neutral' | 'happy'; feedback?: string };
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
  
  // Check if survey already exists for this session and user
  const existingSurvey = Array.from(surveyResponses.values()).find(
    (survey: any) => survey.sessionId === id && survey.userId === user.id
  );
  
  if (existingSurvey) {
    reply.code(409).send({ error: 'Survey already submitted for this session' });
    return;
  }
  
  // Validate survey response
  const surveyData = {
    sessionId: id,
    userId: user.id,
    rating,
    feedback,
  };
  
  const validation = validateSurveyResponse(surveyData);
  if (!validation.isValid) {
    reply.code(400).send({ 
      error: 'Invalid survey response', 
      details: validation.errors 
    });
    return;
  }
  
  // Create survey response
  const surveyResponse = createSurveyResponse(id, user.id, rating, feedback);
  surveyResponses.set(surveyResponse.id, surveyResponse);
  
  console.log('📊 Survey response submitted:', {
    sessionId: id,
    userId: user.id,
    rating,
    hasFeedback: !!feedback,
  });
  
  reply.code(201).send({
    id: surveyResponse.id,
    message: 'Survey response submitted successfully',
  });
});

// Get survey analytics (admin endpoint)
fastify.get('/survey/analytics', async (request, reply) => {
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
  
  // For simplicity, allow any authenticated user to view analytics
  // In production, this would be restricted to admin users
  
  const allResponses = Array.from(surveyResponses.values()) as SurveyResponse[];
  const analytics = calculateSurveyAnalytics(allResponses);
  const insights = generateSurveyInsights(analytics);
  
  reply.send({
    analytics,
    insights,
    config: getSurveyConfig(),
  });
});

// ===== M5: DELETE ENDPOINTS =====

// Request account deletion
fastify.post('/account/delete', async (request, reply) => {
  const { reason, confirmation } = request.body as { 
    reason: 'user_request' | 'privacy_compliance' | 'account_closure' | 'data_breach';
    confirmation: boolean;
  };
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
  
  // Check if delete is allowed
  const deleteCheck = isDeleteAllowed(user.id, reason);
  if (!deleteCheck.allowed) {
    reply.code(403).send({ 
      error: 'Delete not allowed', 
      message: deleteCheck.message 
    });
    return;
  }
  
  // Validate delete request
  const deleteData = {
    userId: user.id,
    reason,
  };
  
  const validation = validateDeleteRequest(deleteData);
  if (!validation.isValid) {
    reply.code(400).send({ 
      error: 'Invalid delete request', 
      details: validation.errors 
    });
    return;
  }
  
  // Calculate delete scope
  const userData = {
    hasSessions: Array.from(sessions.values()).some((s: any) => s.userId === user.id),
    hasMessages: Array.from(messages.values()).some((m: any) => m.sender === user.role),
    hasSurveyResponses: Array.from(surveyResponses.values()).some((sr: any) => sr.userId === user.id),
    hasSafetyViolations: safetyViolations.has(user.id),
    hasAnalytics: false, // Simplified for testing
  };
  
  const scope = calculateDeleteScope(user.id, userData);
  
  // Generate confirmation if required
  const config = getDeleteConfig();
  if (config.confirmationRequired && !confirmation) {
    const estimatedRecords = Object.values(userData).filter(Boolean).length * 10; // Rough estimate
    const confirmationData = generateDeleteConfirmation(user.id, scope, estimatedRecords);
    
    reply.code(202).send({
      confirmationRequired: true,
      confirmation: confirmationData,
      message: 'Please confirm the deletion request',
    });
    return;
  }
  
  // Create delete request
  const deleteRequest = createDeleteRequest(user.id, reason, scope);
  deleteRequests.set(deleteRequest.id, deleteRequest);
  
  // Execute delete immediately (in production, this might be queued)
  const dataStores = {
    users,
    couples,
    sessions,
    messages,
    surveyResponses,
    safetyViolations,
    analytics: new Map(), // Simplified for testing
    auditLogs,
  };
  
  const deleteResult = await executeHardDelete(deleteRequest, scope, dataStores);
  
  console.log('🗑️ Account deletion completed:', {
    userId: user.id,
    reason,
    success: deleteResult.success,
    deletedRecords: deleteResult.deletedRecords,
  });
  
  if (deleteResult.success) {
    reply.code(200).send({
      message: 'Account deleted successfully',
      deleteRequestId: deleteRequest.id,
      result: deleteResult,
    });
  } else {
    reply.code(500).send({
      error: 'Delete operation failed',
      details: deleteResult.errors,
      deleteRequestId: deleteRequest.id,
    });
  }
});

// Get delete status
fastify.get('/account/delete/status', async (request, reply) => {
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
  
  // Find delete requests for this user
  const userDeleteRequests = Array.from(deleteRequests.values())
    .filter((dr: any) => dr.userId === user.id)
    .sort((a: any, b: any) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  
  reply.send({
    deleteRequests: userDeleteRequests,
    config: getDeleteConfig(),
  });
});

// Safety status endpoint (from M4)
fastify.get('/safety/status', async (request, reply) => {
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
  
  const violations = safetyViolations.get(user.id) || 0;
  const context: SafetyContext = {
    userId: user.id,
    messageCount: Array.from(messages.values()).filter((m: any) => m.sender === user.role).length,
    previousViolations: violations
  };
  
  const rateLimit = getSafetyRateLimit(context);
  const frontendLock = getFrontendLock(context);
  
  reply.send({
    userId: user.id,
    violations,
    rateLimit,
    frontendLock,
    safetyGuidelines: [
      'Be respectful and kind in your communication',
      'Avoid content that could be harmful to yourself or others',
      'Seek professional help if you\'re struggling with serious issues',
      'Remember that this is a communication tool, not a replacement for therapy'
    ]
  });
});

// Start server
async function start() {
  try {
    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`🚀 Sync API server (M1+M2+M3+M4+M5) running on http://${host}:${port}`);
    console.log(`📚 API documentation available at http://${host}:${port}/docs`);
    console.log(`🛡️ Safety & Boundary features enabled`);
    console.log(`📊 Survey system enabled`);
    console.log(`🗑️ Hard delete functionality enabled`);
    console.log(`🤖 AI integration enabled - make sure AI service is running on port 3002`);
    console.log(`🧪 Ready for testing! Use the test client: node test-m5-survey-delete.js`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
