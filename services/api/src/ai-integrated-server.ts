import Fastify from 'fastify';

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
const messageSubscribers = new Map(); // For long-polling

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
  return { status: 'ok', timestamp: new Date().toISOString() };
});

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
      displayNameEnc: encrypt(displayName) // Encrypt display name
    };
    users.set(email, user);
  }
  
  // Generate simple token
  const token = `token_${user.id}_${Date.now()}`;
  user.token = token; // Store token with user
  
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
    displayName: decrypt(user.displayNameEnc), // Decrypt display name
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

// ===== M2 + M3: SESSIONS & MESSAGES WITH AI =====

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

// Send message
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
  
  // Check for idempotent message
  const existingMessage = Array.from(messages.values()).find(
    (msg: any) => msg.sessionId === id && msg.clientMessageId === client_message_id
  );
  
  if (existingMessage) {
    reply.code(202).send(); // Already processed
    return;
  }
  
  // Create message
  const messageId = `msg_${Date.now()}`;
  const message = {
    id: messageId,
    sessionId: id,
    sender: user.role,
    contentEnc: encrypt(content), // Encrypt message content
    createdAt: new Date(),
    safetyTags: [], // Will be populated by AI
    clientMessageId: client_message_id,
  };
  
  messages.set(messageId, message);
  
  // Check if we should trigger AI response (after both partners have sent messages)
  const sessionMessages = Array.from(messages.values())
    .filter((msg: any) => msg.sessionId === id)
    .sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime());
  
  const userAMessages = sessionMessages.filter((msg: any) => msg.sender === 'userA');
  const userBMessages = sessionMessages.filter((msg: any) => msg.sender === 'userB');
  
  // Trigger AI response if both partners have sent at least one message
  if (userAMessages.length > 0 && userBMessages.length > 0) {
    const latestUserA = userAMessages[userAMessages.length - 1];
    const latestUserB = userBMessages[userBMessages.length - 1];
    
    // Get the most recent messages from each partner
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
    // Return messages immediately
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
    // Long-polling: wait for new messages
    const waitTime = Math.min(parseInt(waitMs), 25000); // Max 25 seconds
    
    const subscriber = {
      reply,
      resolved: false,
    };
    
    messageSubscribers.set(id, [subscriber]);
    
    // Set timeout
    setTimeout(() => {
      if (!subscriber.resolved) {
        subscriber.resolved = true;
        reply.send([]);
        messageSubscribers.delete(id);
      }
    }, waitTime);
  } else {
    // No messages and no long-polling
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
  
  // Delete session and all its messages
  sessions.delete(id);
  Array.from(messages.entries()).forEach(([msgId, msg]: [string, any]) => {
    if (msg.sessionId === id) {
      messages.delete(msgId);
    }
  });
  
  reply.code(204).send();
});

// Start server
async function start() {
  try {
    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`🚀 Sync API server (M2+M3) running on http://${host}:${port}`);
    console.log(`📚 API documentation available at http://${host}:${port}/docs`);
    console.log(`🤖 AI integration enabled - make sure AI service is running on port 3002`);
    console.log(`🧪 Ready for testing! Use the test client: node test-m3-integration.js`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
