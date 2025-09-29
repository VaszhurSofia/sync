import { FastifyRequest, FastifyReply } from 'fastify';
import { SessionModel } from '../models/sessions';
import { TurnLockedError, BoundaryLockedError } from '../types/api-client';

export interface TurnTakingRequest extends FastifyRequest {
  params: {
    id: string;
  };
  body: {
    sender: 'userA' | 'userB';
    content: string;
    clientMessageId: string;
  };
  user: {
    id: string;
  };
}

export async function turnTakingMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { id: sessionId } = request.params as { id: string };
    const { sender } = request.body as { sender: 'userA' | 'userB' };
    const userId = (request as any).user?.id;
    
    if (!userId) {
      reply.code(401);
      throw new Error('Authentication required');
    }
    
    // Get session and check access
    const session = await SessionModel.findById(sessionId, userId);
    if (!session) {
      reply.code(404);
      throw new Error('Session not found');
    }
    
    // Check if session is locked due to boundary
    if (session.boundary_flag) {
      reply.code(409);
      throw new BoundaryLockedError('Session has reached safety boundary, no more messages allowed');
    }
    
    // Check turn-taking rules
    const canSend = await SessionModel.canUserSendMessage(sessionId, userId, sender);
    if (!canSend) {
      reply.code(409);
      throw new TurnLockedError('It\'s not your turn to speak');
    }
    
    // Validate sender matches user role for couple mode
    if (session.mode === 'couple') {
      const { CoupleMemberModel } = await import('../utils/database');
      const userRole = await CoupleMemberModel.getRole(userId, session.couple_id!);
      
      if (userRole !== sender) {
        reply.code(409);
        throw new TurnLockedError(`You are ${userRole}, but trying to send as ${sender}`);
      }
    }
    
    // For solo mode, only owner can send messages
    if (session.mode === 'solo' && session.owner_user_id !== userId) {
      reply.code(403);
      throw new Error('Only the session owner can send messages in solo mode');
    }
    
  } catch (error) {
    if (error instanceof TurnLockedError || error instanceof BoundaryLockedError) {
      throw error;
    }
    
    reply.code(500);
    throw new Error('Turn-taking validation failed');
  }
}

export async function updateTurnState(
  sessionId: string,
  currentState: string,
  mode: 'couple' | 'solo',
  userId: string
): Promise<string> {
  const nextState = await SessionModel.getNextTurnState(
    currentState as any,
    mode
  );
  
  await SessionModel.updateTurnState(sessionId, nextState, userId);
  
  return nextState;
}