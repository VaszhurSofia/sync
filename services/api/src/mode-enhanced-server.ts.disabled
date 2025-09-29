import Fastify from 'fastify';
import { randomBytes } from 'crypto';
import { getTherapistOrchestrator } from '../../ai/src/orchestrator';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// In-memory storage (replace with database in production)
const users = new Map();
const couples = new Map();
const sessions = new Map();
const messages = new Map();

// ===== M1: AUTHENTICATION & COUPLES =====

// Register user
fastify.post('/auth/register', async (request, reply) => {
  const { email, password, name } = request.body as { email: string; password: string; name: string };
  
  if (users.has(email)) {
    reply.code(400).send({ error: 'User already exists' });
    return;
  }
  
  const userId = `user_${Date.now()}`;
  const token = randomBytes(32).toString('hex');
  
  const user = {
    id: userId,
    email,
    password, // In production, hash this
    name,
    token,
    coupleId: null,
    createdAt: new Date().toISOString(),
  };
  
  users.set(email, user);
  
  reply.code(201).send({ 
    userId, 
    token,
    message: 'User registered successfully' 
  });
});

// Login user
fastify.post('/auth/login', async (request, reply) => {
  const { email, password } = request.body as { email: string; password: string };
  
  const user = users.get(email);
  if (!user || user.password !== password) {
    reply.code(401).send({ error: 'Invalid credentials' });
    return;
  }
  
  reply.send({ 
    userId: user.id, 
    token: user.token,
    name: user.name,
    coupleId: user.coupleId 
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
    reply.code(401).send({ error: 'Invalid token' });
    return;
  }
  
  if (user.coupleId) {
    reply.code(400).send({ error: 'User is already part of a couple' });
    return;
  }
  
  const coupleId = `couple_${Date.now()}`;
  const inviteCode = randomBytes(6).toString('hex').toUpperCase();
  
  const couple = {
    id: coupleId,
    inviteCode,
    createdAt: new Date().toISOString(),
    members: [user.id],
  };
  
  couples.set(coupleId, couple);
  user.coupleId = coupleId;
  
  reply.code(201).send({ 
    coupleId, 
    inviteCode,
    message: 'Couple created successfully. Share the invite code with your partner.' 
  });
});

// Join couple
fastify.post('/couples/join', async (request, reply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  const user = Array.from(users.values()).find((u: any) => u.token === token);
  
  if (!user) {
    reply.code(401).send({ error: 'Invalid token' });
    return;
  }
  
  if (user.coupleId) {
    reply.code(400).send({ error: 'User is already part of a couple' });
    return;
  }
  
  const { inviteCode } = request.body as { inviteCode: string };
  const couple = Array.from(couples.values()).find((c: any) => c.inviteCode === inviteCode);
  
  if (!couple) {
    reply.code(400).send({ error: 'Invalid invite code' });
    return;
  }
  
  if (couple.members.length >= 2) {
    reply.code(400).send({ error: 'Couple is already full' });
    return;
  }
  
  couple.members.push(user.id);
  user.coupleId = couple.id;
  
  reply.send({ 
    coupleId: couple.id,
    message: 'Successfully joined couple' 
  });
});

// Get couple info
fastify.get('/couples/:id', async (request, reply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  const user = Array.from(users.values()).find((u: any) => u.token === token);
  
  if (!user) {
    reply.code(401).send({ error: 'Invalid token' });
    return;
  }
  
  const { id } = request.params as { id: string };
  const couple = couples.get(id);
  
  if (!couple || !couple.members.includes(user.id)) {
    reply.code(404).send({ error: 'Couple not found' });
    return;
  }
  
  const members = couple.members.map((memberId: string) => {
    const member = Array.from(users.values()).find((u: any) => u.id === memberId);
    return {
      id: member.id,
      name: member.name,
      email: member.email,
    };
  });
  
  reply.send({
    id: couple.id,
    createdAt: couple.createdAt,
    members,
  });
});

// ===== M2 + M3 + M4 + M5: SESSIONS & MESSAGES WITH AI, SAFETY & MODES =====

// Create session with mode support
fastify.post('/sessions', async (request, reply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  const user = Array.from(users.values()).find((u: any) => u.token === token);
  
  if (!user) {
    reply.code(401).send({ error: 'Invalid token' });
    return;
  }
  
  const { mode = 'couple' } = request.body as { mode?: 'couple' | 'solo' };
  
  // Validate mode requirements
  if (mode === 'couple' && !user.coupleId) {
    reply.code(400).send({ error: 'User must be part of a couple for couple sessions' });
    return;
  }
  
  const sessionId = `session_${Date.now()}`;
  const session = {
    id: sessionId,
    mode,
    coupleId: mode === 'couple' ? user.coupleId : null,
    ownerUserId: mode === 'solo' ? user.id : null,
    shareToken: mode === 'solo' ? randomBytes(16).toString('hex') : null,
    startedAt: new Date(),
    endedAt: null,
    boundaryFlag: false,
  };
  
  sessions.set(sessionId, session);
  
  reply.code(201).send({ 
    sessionId,
    mode,
    shareToken: mode === 'solo' ? session.shareToken : null,
    message: mode === 'couple' 
      ? 'Couple session created successfully' 
      : 'Solo session created successfully. Use the share token to convert to couple session later.'
  });
});

// Convert solo session to couple session
fastify.post('/sessions/:id/convert', async (request, reply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  const user = Array.from(users.values()).find((u: any) => u.token === token);
  
  if (!user) {
    reply.code(401).send({ error: 'Invalid token' });
    return;
  }
  
  const { id } = request.params as { id: string };
  const session = sessions.get(id);
  
  if (!session) {
    reply.code(404).send({ error: 'Session not found' });
    return;
  }
  
  if (session.mode !== 'solo') {
    reply.code(400).send({ error: 'Only solo sessions can be converted' });
    return;
  }
  
  if (session.ownerUserId !== user.id) {
    reply.code(403).send({ error: 'Only the session owner can convert it' });
    return;
  }
  
  if (!user.coupleId) {
    reply.code(400).send({ error: 'User must be part of a couple to convert session' });
    return;
  }
  
  // Convert session to couple mode
  session.mode = 'couple';
  session.coupleId = user.coupleId;
  session.ownerUserId = null;
  session.shareToken = null;
  
  reply.send({ 
    message: 'Session successfully converted to couple mode',
    coupleId: user.coupleId
  });
});

// Send message with AI orchestration and mode support
fastify.post('/sessions/:id/messages', async (request, reply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  const user = Array.from(users.values()).find((u: any) => u.token === token);
  
  if (!user) {
    reply.code(401).send({ error: 'Invalid token' });
    return;
  }
  
  const { id } = request.params as { id: string };
  const { content, sender } = request.body as { content: string; sender: 'userA' | 'userB' };
  
  const session = sessions.get(id);
  if (!session) {
    reply.code(404).send({ error: 'Session not found' });
    return;
  }
  
  // Check session access based on mode
  if (session.mode === 'couple') {
    if (!user.coupleId || session.coupleId !== user.coupleId) {
      reply.code(403).send({ error: 'Access denied to couple session' });
      return;
    }
  } else if (session.mode === 'solo') {
    if (session.ownerUserId !== user.id) {
      reply.code(403).send({ error: 'Access denied to solo session' });
      return;
    }
  }
  
  // Store message
  const messageId = `msg_${Date.now()}`;
  const message = {
    id: messageId,
    sessionId: id,
    sender,
    content,
    createdAt: new Date(),
    safetyTags: [],
  };
  
  messages.set(messageId, message);
  
  // Get session messages for context
  const sessionMessages = Array.from(messages.values())
    .filter((m: any) => m.sessionId === id)
    .sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime());
  
  // For solo sessions, we need to simulate a partner response or use a different approach
  if (session.mode === 'solo') {
    // For solo sessions, we'll use the user's message as both userA and userB
    // This is a simplified approach - in production, you might want different handling
    const userMessage = sessionMessages[sessionMessages.length - 1];
    
    try {
      const orchestrator = getTherapistOrchestrator();
      const aiResponse = await orchestrator.generateResponse({
        userAMessage: userMessage.content,
        userBMessage: userMessage.content, // Same message for solo mode
        sessionId: id,
        mode: 'solo',
        previousMessages: sessionMessages.slice(-5).map((m: any) => ({
          sender: m.sender,
          content: m.content,
          timestamp: m.createdAt,
        })),
      });
      
      if (aiResponse.success && aiResponse.jsonResponse) {
        // Store AI response
        const aiMessageId = `ai_${Date.now()}`;
        const aiMessage = {
          id: aiMessageId,
          sessionId: id,
          sender: 'ai',
          content: aiResponse.response || JSON.stringify(aiResponse.jsonResponse),
          createdAt: new Date(),
          safetyTags: [],
        };
        
        messages.set(aiMessageId, aiMessage);
        
        reply.send({
          messageId,
          aiResponse: aiResponse.jsonResponse,
          aiMessageId,
          mode: 'solo',
          promptVersion: aiResponse.promptVersion,
        });
      } else {
        reply.code(500).send({ error: 'AI response generation failed' });
      }
    } catch (error) {
      console.error('AI orchestration error:', error);
      reply.code(500).send({ error: 'AI processing failed' });
    }
  } else {
    // Couple session - wait for both partners to respond
    const partnerMessages = sessionMessages.filter((m: any) => m.sender !== sender);
    const lastPartnerMessage = partnerMessages[partnerMessages.length - 1];
    
    if (!lastPartnerMessage) {
      // First message in the exchange, just store it
      reply.send({ messageId, mode: 'couple' });
      return;
    }
    
    // Both partners have responded, generate AI response
    try {
      const orchestrator = getTherapistOrchestrator();
      const aiResponse = await orchestrator.generateResponse({
        userAMessage: sender === 'userA' ? content : lastPartnerMessage.content,
        userBMessage: sender === 'userB' ? content : lastPartnerMessage.content,
        sessionId: id,
        mode: 'couple',
        previousMessages: sessionMessages.slice(-5).map((m: any) => ({
          sender: m.sender,
          content: m.content,
          timestamp: m.createdAt,
        })),
      });
      
      if (aiResponse.success && aiResponse.jsonResponse) {
        // Store AI response
        const aiMessageId = `ai_${Date.now()}`;
        const aiMessage = {
          id: aiMessageId,
          sessionId: id,
          sender: 'ai',
          content: aiResponse.response || JSON.stringify(aiResponse.jsonResponse),
          createdAt: new Date(),
          safetyTags: [],
        };
        
        messages.set(aiMessageId, aiMessage);
        
        reply.send({
          messageId,
          aiResponse: aiResponse.jsonResponse,
          aiMessageId,
          mode: 'couple',
          promptVersion: aiResponse.promptVersion,
        });
      } else {
        reply.code(500).send({ error: 'AI response generation failed' });
      }
    } catch (error) {
      console.error('AI orchestration error:', error);
      reply.code(500).send({ error: 'AI processing failed' });
    }
  }
});

// Get session messages
fastify.get('/sessions/:id/messages', async (request, reply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  const user = Array.from(users.values()).find((u: any) => u.token === token);
  
  if (!user) {
    reply.code(401).send({ error: 'Invalid token' });
    return;
  }
  
  const { id } = request.params as { id: string };
  const session = sessions.get(id);
  
  if (!session) {
    reply.code(404).send({ error: 'Session not found' });
    return;
  }
  
  // Check session access based on mode
  if (session.mode === 'couple') {
    if (!user.coupleId || session.coupleId !== user.coupleId) {
      reply.code(403).send({ error: 'Access denied to couple session' });
      return;
    }
  } else if (session.mode === 'solo') {
    if (session.ownerUserId !== user.id) {
      reply.code(403).send({ error: 'Access denied to solo session' });
      return;
    }
  }
  
  const sessionMessages = Array.from(messages.values())
    .filter((m: any) => m.sessionId === id)
    .sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime());
  
  reply.send({
    sessionId: id,
    mode: session.mode,
    messages: sessionMessages,
  });
});

// End session
fastify.post('/sessions/:id/end', async (request, reply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  const user = Array.from(users.values()).find((u: any) => u.token === token);
  
  if (!user) {
    reply.code(401).send({ error: 'Invalid token' });
    return;
  }
  
  const { id } = request.params as { id: string };
  const session = sessions.get(id);
  
  if (!session) {
    reply.code(404).send({ error: 'Session not found' });
    return;
  }
  
  // Check session access based on mode
  if (session.mode === 'couple') {
    if (!user.coupleId || session.coupleId !== user.coupleId) {
      reply.code(403).send({ error: 'Access denied to couple session' });
      return;
    }
  } else if (session.mode === 'solo') {
    if (session.ownerUserId !== user.id) {
      reply.code(403).send({ error: 'Access denied to solo session' });
      return;
    }
  }
  
  session.endedAt = new Date();
  
  reply.send({ 
    message: 'Session ended successfully',
    endedAt: session.endedAt,
  });
});

// Health check
fastify.get('/health', async (request, reply) => {
  reply.send({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    features: ['couple_sessions', 'solo_sessions', 'ai_orchestration', 'mode_routing']
  });
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Mode-enhanced server running on port ${port}`);
    console.log('Features: Couple sessions, Solo sessions, AI orchestration, Mode routing');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

export default fastify;
