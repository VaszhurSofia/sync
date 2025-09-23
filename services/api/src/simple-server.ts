import Fastify from 'fastify';
import { generateVerificationCode, generateInviteCode, generateToken } from './utils/crypto';

const fastify = Fastify({
  logger: true,
});

// Simple in-memory storage for testing
const users = new Map();
const couples = new Map();
const invites = new Map();
const verificationCodes = new Map();

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Request verification code
fastify.post('/auth/request-code', async (request, reply) => {
  const { email } = request.body as { email: string };
  // Use a fixed code for testing
  const code = '123456';
  verificationCodes.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
  
  // Log the code for testing
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
    user = { id: `user_${Date.now()}`, email, displayName: email.split('@')[0] };
    users.set(email, user);
  }
  
  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
  });
  
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
  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    const user = users.get(payload.email);
    
    if (!user) {
      reply.code(404).send({ error: 'User not found' });
      return;
    }
    
    reply.send({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    });
  } catch (error) {
    reply.code(401).send({ error: 'Invalid token' });
  }
});

// Create couple
fastify.post('/couples', async (request, reply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    const user = users.get(payload.email);
    
    if (!user) {
      reply.code(404).send({ error: 'User not found' });
      return;
    }
    
    // Check if user already has a couple
    if (user.coupleId) {
      reply.code(400).send({ error: 'User already has a couple' });
      return;
    }
    
    // Create couple
    const coupleId = `couple_${Date.now()}`;
    const couple = { id: coupleId, members: [{ userId: user.id, role: 'userA' }] };
    couples.set(coupleId, couple);
    
    // Update user
    user.coupleId = coupleId;
    user.role = 'userA';
    users.set(payload.email, user);
    
    reply.code(201).send({ coupleId });
  } catch (error) {
    reply.code(401).send({ error: 'Invalid token' });
  }
});

// Create invite
fastify.post('/invites', async (request, reply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    const user = users.get(payload.email);
    
    if (!user || !user.coupleId) {
      reply.code(400).send({ error: 'User is not part of a couple' });
      return;
    }
    
    const couple = couples.get(user.coupleId);
    if (couple.members.length >= 2) {
      reply.code(400).send({ error: 'Couple is already full' });
      return;
    }
    
    const code = generateInviteCode();
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
  } catch (error) {
    reply.code(401).send({ error: 'Invalid token' });
  }
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
  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    const user = users.get(payload.email);
    
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
    
    // Add user to couple
    couple.members.push({ userId: user.id, role: 'userB' });
    couples.set(invite.coupleId, couple);
    
    // Update user
    user.coupleId = invite.coupleId;
    user.role = 'userB';
    users.set(payload.email, user);
    
    // Mark invite as accepted
    invite.acceptedBy = user.id;
    invites.set(code, invite);
    
    reply.code(204).send();
  } catch (error) {
    reply.code(401).send({ error: 'Invalid token' });
  }
});

// Get couple info
fastify.get('/couples/me', async (request, reply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    const user = users.get(payload.email);
    
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
        displayName: memberUser.displayName,
        role: member.role,
      };
    });
    
    reply.send({
      id: couple.id,
      createdAt: new Date().toISOString(),
      members,
    });
  } catch (error) {
    reply.code(401).send({ error: 'Invalid token' });
  }
});

// Start server
async function start() {
  try {
    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`🚀 Sync API server running on http://${host}:${port}`);
    console.log(`📚 API documentation available at http://${host}:${port}/docs`);
    console.log(`🧪 Ready for testing! Use the test client: node test-api-client.js`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
