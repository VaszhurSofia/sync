import { FastifyInstance } from 'fastify';
import { CreateSessionResponseSchema } from '@sync/types';
import { generateInviteCode } from '../utils/crypto';
import { CoupleModel, CoupleMemberModel, InviteModel } from '../utils/database';
import { AuthenticatedRequest } from '../middleware/auth';

export async function couplesRoutes(fastify: FastifyInstance) {
  // Create a new couple
  fastify.post('/couples', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      description: 'Create a new couple relationship',
      tags: ['Couples'],
      response: {
        201: {
          description: 'Couple created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  coupleId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        400: {
          description: 'User already has a couple',
          $ref: '#/components/schemas/ErrorResponse',
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
      // Check if user already has a couple
      const existingCouple = await CoupleMemberModel.findByUser(authRequest.user.id);
      if (existingCouple) {
        reply.code(400).send({ 
          error: 'ALREADY_IN_COUPLE',
          message: 'User is already part of a couple' 
        });
        return;
      }
      
      // Create new couple
      const couple = await CoupleModel.create();
      
      // Add user as userA (first member)
      await CoupleMemberModel.addMember(couple.id, authRequest.user.id, 'userA');
      
      reply.code(201).send({ coupleId: couple.id });
    } catch (error) {
      fastify.log.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error creating couple');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get couple information
  fastify.get('/couples/me', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      description: 'Get current user\'s couple information',
      tags: ['Couples'],
      response: {
        200: {
          description: 'Couple information',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  email: { type: 'string', format: 'email' },
                  displayName: { type: 'string' },
                  role: { type: 'string', enum: ['userA', 'userB'] },
                },
              },
            },
          },
        },
        404: {
          description: 'User is not part of a couple',
          $ref: '#/components/schemas/ErrorResponse',
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
      // Get couple info
      const coupleInfo = await CoupleMemberModel.findByUser(authRequest.user.id);
      if (!coupleInfo) {
        reply.code(404).send({ 
          error: 'NO_COUPLE',
          message: 'User is not part of a couple' 
        });
        return;
      }
      
      // Get couple details
      const couple = await CoupleModel.findById(coupleInfo.couple_id);
      if (!couple) {
        reply.code(404).send({ error: 'Couple not found' });
        return;
      }
      
      // Get all members with decrypted display names
      const { UserModel } = await import('../utils/database');
      const members = await CoupleModel.getMembers(couple.id);
      const membersWithDisplayNames = await Promise.all(
        members.map(async (member) => ({
          id: member.id,
          email: member.email,
          displayName: await UserModel.getDisplayName(member),
          role: member.role,
        }))
      );
      
      reply.send({
        id: couple.id,
        createdAt: couple.created_at,
        members: membersWithDisplayNames,
      });
    } catch (error) {
      fastify.log.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error getting couple info');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create an invite
  fastify.post('/invites', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      description: 'Create an invite for the partner to join the couple',
      tags: ['Invites'],
      response: {
        201: {
          description: 'Invite created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  link: { type: 'string', format: 'uri' },
                  expiresAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        400: {
          description: 'User is not part of a couple or couple is full',
          $ref: '#/components/schemas/ErrorResponse',
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
      // Check if user has a couple
      const coupleInfo = await CoupleMemberModel.findByUser(authRequest.user.id);
      if (!coupleInfo) {
        reply.code(400).send({ 
          error: 'NO_COUPLE',
          message: 'User is not part of a couple' 
        });
        return;
      }
      
      // Check if couple already has 2 members
      const members = await CoupleModel.getMembers(coupleInfo.couple_id);
      if (members.length >= 2) {
        reply.code(400).send({ 
          error: 'COUPLE_FULL',
          message: 'Couple already has 2 members' 
        });
        return;
      }
      
      // Generate invite code
      const code = generateInviteCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Create invite
      await InviteModel.create(coupleInfo.couple_id, code, expiresAt);
      
      // Generate invite link
      const baseUrl = process.env.API_URL || 'http://localhost:3001';
      const link = `${baseUrl}/invites/${code}`;
      
      reply.code(201).send({
        code,
        link,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      fastify.log.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error creating invite');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Accept an invite
  fastify.post('/invites/:code/accept', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      description: 'Accept an invite to join a couple',
      tags: ['Invites'],
      params: {
        type: 'object',
        properties: {
          code: { type: 'string' },
        },
        required: ['code'],
      },
      response: {
        204: {
          description: 'Invite accepted successfully',
          type: 'null',
        },
        400: {
          description: 'Invalid or expired invite code',
          $ref: '#/components/schemas/ErrorResponse',
        },
        401: {
          description: 'Unauthorized',
          $ref: '#/components/schemas/ErrorResponse',
        },
      },
    },
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { code } = request.params as { code: string };
    
    try {
      // Check if user already has a couple
      const existingCouple = await CoupleMemberModel.findByUser(authRequest.user.id);
      if (existingCouple) {
        reply.code(400).send({ 
          error: 'ALREADY_IN_COUPLE',
          message: 'User is already part of a couple' 
        });
        return;
      }
      
      // Accept the invite
      const result = await InviteModel.acceptInvite(code, authRequest.user.id);
      
      reply.code(204).send();
    } catch (error) {
      if (error instanceof Error) {
        reply.code(400).send({ 
          error: 'INVITE_ERROR',
          message: error instanceof Error ? error.message : "Unknown error" 
        });
        return;
      }
      
      fastify.log.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error accepting invite');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get invite information
  fastify.get('/invites/:code', {
    schema: {
      description: 'Get invite information (public endpoint)',
      tags: ['Invites'],
      params: {
        type: 'object',
        properties: {
          code: { type: 'string' },
        },
        required: ['code'],
      },
      response: {
        200: {
          description: 'Invite information',
          type: 'object',
          properties: {
            code: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' },
            isValid: { type: 'boolean' },
          },
        },
        404: {
          description: 'Invite not found',
          $ref: '#/components/schemas/ErrorResponse',
        },
      },
    },
  }, async (request, reply) => {
    const { code } = request.params as { code: string };
    
    try {
      const invite = await InviteModel.findByCode(code);
      if (!invite) {
        reply.code(404).send({ error: 'Invite not found' });
        return;
      }
      
      const isValid = invite.expires_at > new Date() && !invite.accepted_by;
      
      reply.send({
        code: invite.code,
        expiresAt: invite.expires_at,
        isValid,
      });
    } catch (error) {
      fastify.log.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error getting invite info');
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
