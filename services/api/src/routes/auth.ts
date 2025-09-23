import { FastifyInstance } from 'fastify';
import { AuthRequestCodeSchema, AuthVerifyCodeSchema, AuthResponseSchema } from '@sync/types';
import { generateVerificationCode, generateToken } from '../utils/crypto';
import { UserModel, VerificationCodeModel } from '../utils/database';
import { AuthenticatedRequest } from '../middleware/auth';

export async function authRoutes(fastify: FastifyInstance) {
  // Request verification code
  fastify.post('/auth/request-code', {
    schema: {
      description: 'Request a verification code for email authentication',
      tags: ['Authentication'],
      body: AuthRequestCodeSchema,
      response: {
        204: {
          description: 'Verification code sent successfully',
          type: 'null',
        },
        400: {
          description: 'Invalid email format',
          $ref: '#/components/schemas/ErrorResponse',
        },
        429: {
          description: 'Rate limit exceeded',
          $ref: '#/components/schemas/ErrorResponse',
        },
      },
    },
  }, async (request, reply) => {
    const { email } = request.body as { email: string };
    
    try {
      // Generate verification code
      const code = generateVerificationCode();
      
      // Store verification code (in-memory for MVP)
      await VerificationCodeModel.create(email, code);
      
      // In a real implementation, you would send an email here
      // For now, we'll log it to the console for testing
      fastify.log.info(`Verification code for ${email}: ${code}`);
      
      // TODO: Send email with verification code
      // await sendVerificationEmail(email, code);
      
      reply.code(204).send();
    } catch (error) {
      fastify.log.error('Error requesting verification code:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Verify code and get access token
  fastify.post('/auth/verify-code', {
    schema: {
      description: 'Verify the code and receive an access token',
      tags: ['Authentication'],
      body: AuthVerifyCodeSchema,
      response: {
        200: {
          description: 'Authentication successful',
          content: {
            'application/json': {
              schema: AuthResponseSchema,
            },
          },
        },
        400: {
          description: 'Invalid code or email',
          $ref: '#/components/schemas/ErrorResponse',
        },
        401: {
          description: 'Invalid or expired code',
          $ref: '#/components/schemas/ErrorResponse',
        },
      },
    },
  }, async (request, reply) => {
    const { email, code } = request.body as { email: string; code: string };
    
    try {
      // Verify the code
      const isValid = await VerificationCodeModel.verify(email, code);
      if (!isValid) {
        reply.code(401).send({ 
          error: 'INVALID_CODE',
          message: 'Invalid or expired verification code' 
        });
        return;
      }
      
      // Check if user exists, create if not
      let user = await UserModel.findByEmail(email);
      if (!user) {
        // Create new user with email as display name (will be encrypted)
        user = await UserModel.create(email, email.split('@')[0]);
      }
      
      // Get user's couple info if they have one
      const { CoupleMemberModel } = await import('../utils/database');
      const coupleInfo = await CoupleMemberModel.findByUser(user.id);
      
      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        coupleId: coupleInfo?.couple_id,
        role: coupleInfo?.role,
      });
      
      reply.send({ accessToken: token });
    } catch (error) {
      fastify.log.error('Error verifying code:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get current user info
  fastify.get('/auth/me', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get current user information',
      tags: ['Authentication'],
      response: {
        200: {
          description: 'User information',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            displayName: { type: 'string' },
            coupleId: { type: 'string', format: 'uuid' },
            role: { type: 'string', enum: ['userA', 'userB'] },
          },
        },
        401: {
          description: 'Unauthorized',
          $ref: '#/components/schemas/ErrorResponse',
        },
      },
    },
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    
    try {
      const user = await UserModel.findById(authRequest.user.id);
      if (!user) {
        reply.code(404).send({ error: 'User not found' });
        return;
      }
      
      const displayName = await UserModel.getDisplayName(user);
      
      reply.send({
        id: user.id,
        email: user.email,
        displayName,
        coupleId: authRequest.user.coupleId,
        role: authRequest.user.role,
      });
    } catch (error) {
      fastify.log.error('Error getting user info:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Refresh token
  fastify.post('/auth/refresh', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Refresh the access token',
      tags: ['Authentication'],
      response: {
        200: {
          description: 'New access token',
          content: {
            'application/json': {
              schema: AuthResponseSchema,
            },
          },
        },
        401: {
          description: 'Unauthorized',
          $ref: '#/components/schemas/ErrorResponse',
        },
      },
    },
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    
    try {
      // Generate new token with current user info
      const token = generateToken({
        userId: authRequest.user.id,
        email: authRequest.user.email,
        coupleId: authRequest.user.coupleId,
        role: authRequest.user.role,
      });
      
      reply.send({ accessToken: token });
    } catch (error) {
      fastify.log.error('Error refreshing token:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
