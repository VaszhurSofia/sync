import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { UserModel } from '../utils/database';

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    coupleId?: string;
    role?: string;
  };
}

/**
 * JWT token payload interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  coupleId?: string;
  role?: string;
  iat: number;
  exp: number;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  return jwt.sign(payload, secret, {
    expiresIn: '7d', // 7 days
    issuer: 'sync-api',
    audience: 'sync-app',
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  try {
    return jwt.verify(token, secret, {
      issuer: 'sync-api',
      audience: 'sync-app',
    }) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Authentication middleware
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Missing or invalid authorization header' });
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token);
    
    // Verify user still exists
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      reply.code(401).send({ error: 'User not found' });
      return;
    }
    
    // Add user info to request
    (request as AuthenticatedRequest).user = {
      id: payload.userId,
      email: payload.email,
      coupleId: payload.coupleId,
      role: payload.role,
    };
    
  } catch (error) {
    reply.code(401).send({ error: 'Invalid token' });
  }
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export async function optionalAuthenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return; // No token provided, continue without authentication
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    const user = await UserModel.findById(payload.userId);
    if (user) {
      (request as AuthenticatedRequest).user = {
        id: payload.userId,
        email: payload.email,
        coupleId: payload.coupleId,
        role: payload.role,
      };
    }
  } catch (error) {
    // Ignore authentication errors for optional auth
  }
}

/**
 * Middleware to require couple membership
 */
export async function requireCouple(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authRequest = request as AuthenticatedRequest;
  
  if (!authRequest.user) {
    reply.code(401).send({ error: 'Authentication required' });
    return;
  }
  
  if (!authRequest.user.coupleId) {
    reply.code(403).send({ error: 'Couple membership required' });
    return;
  }
}

/**
 * Middleware to require specific role
 */
export function requireRole(requiredRole: 'userA' | 'userB') {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authRequest = request as AuthenticatedRequest;
    
    if (!authRequest.user) {
      reply.code(401).send({ error: 'Authentication required' });
      return;
    }
    
    if (authRequest.user.role !== requiredRole) {
      reply.code(403).send({ error: `Role ${requiredRole} required` });
      return;
    }
  };
}
