/**
 * Boundary Lock Middleware
 * Enforces boundary locks and returns 409 BOUNDARY_LOCKED responses
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { SessionModel } from '../models/sessions';
import { BoundaryAuditModel } from '../models/boundary-audit';
import { logger } from '../logger';

export interface BoundaryLockContext {
  sessionId: string;
  userId: string;
  userRole: 'userA' | 'userB';
}

/**
 * Check if session has boundary lock
 */
export async function checkBoundaryLock(
  sessionModel: SessionModel,
  boundaryAuditModel: BoundaryAuditModel,
  sessionId: string
): Promise<{
  isLocked: boolean;
  lockReason?: string;
  lockTimestamp?: Date;
}> {
  try {
    // Check session boundary flag
    const session = await sessionModel.getById(sessionId);
    if (!session) {
      return { isLocked: false };
    }

    if (session.boundaryFlag) {
      return {
        isLocked: true,
        lockReason: 'Session has reached safety boundary',
        lockTimestamp: session.updatedAt
      };
    }

    // Check for recent boundary audit entries
    const hasActiveLock = await boundaryAuditModel.hasActiveBoundaryLock(sessionId);
    if (hasActiveLock) {
      return {
        isLocked: true,
        lockReason: 'Active boundary lock detected',
        lockTimestamp: new Date()
      };
    }

    return { isLocked: false };
  } catch (error) {
    logger.error('Failed to check boundary lock', {
      error: error instanceof Error ? error.message : "Unknown error",
      sessionId
    });
    return { isLocked: false };
  }
}

/**
 * Boundary lock middleware
 */
export async function boundaryLockMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  context: BoundaryLockContext
) {
  const { sessionId, userId } = context;
  
  try {
    const sessionModel = new SessionModel(request.server.pg);
    const boundaryAuditModel = new BoundaryAuditModel(request.server.pg);
    
    // Check for boundary lock
    const lockStatus = await checkBoundaryLock(sessionModel, boundaryAuditModel, sessionId);
    
    if (lockStatus.isLocked) {
      logger.warn('Boundary lock violation attempt', {
        sessionId,
        userId,
        lockReason: lockStatus.lockReason,
        lockTimestamp: lockStatus.lockTimestamp
      });
      
      return reply.code(409).send({
        error: 'BOUNDARY_LOCKED',
        message: 'Session has reached a safety boundary and is locked',
        reason: lockStatus.lockReason,
        lockedAt: lockStatus.lockTimestamp,
        resources: [
          'Please contact support if you need assistance',
          'Consider taking a break and returning later',
          'Review our safety guidelines'
        ]
      });
    }
    
    // Add boundary lock status to request context
    (request as any).boundaryLockStatus = {
      isLocked: false,
      sessionId,
      userId
    };
    
  } catch (error) {
    logger.error('Boundary lock middleware error', {
      error: error instanceof Error ? error.message : "Unknown error",
      sessionId,
      userId
    });
    
    // On error, allow request to proceed (fail open)
    (request as any).boundaryLockStatus = {
      isLocked: false,
      sessionId,
      userId,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Create boundary lock
 */
export async function createBoundaryLock(
  boundaryAuditModel: BoundaryAuditModel,
  sessionModel: SessionModel,
  sessionId: string,
  userId: string,
  boundaryType: 'safety' | 'content' | 'behavioral',
  triggerReason: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Create audit entry
    await boundaryAuditModel.create({
      sessionId,
      userId,
      boundaryType,
      triggerReason,
      action: 'boundary_lock',
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        sessionLocked: true
      }
    });
    
    // Set session boundary flag
    await sessionModel.setBoundaryFlag(sessionId, true);
    
    logger.warn('Boundary lock created', {
      sessionId,
      userId,
      boundaryType,
      triggerReason
    });
    
  } catch (error) {
    logger.error('Failed to create boundary lock', {
      error: error instanceof Error ? error.message : "Unknown error",
      sessionId,
      userId,
      boundaryType
    });
    throw error;
  }
}

/**
 * Clear boundary lock
 */
export async function clearBoundaryLock(
  boundaryAuditModel: BoundaryAuditModel,
  sessionModel: SessionModel,
  sessionId: string,
  userId: string,
  reason: string
): Promise<void> {
  try {
    // Create audit entry for clearing
    await boundaryAuditModel.create({
      sessionId,
      userId,
      boundaryType: 'safety', // Default type for clearing
      triggerReason: reason,
      action: 'boundary_clear',
      metadata: {
        clearedBy: userId,
        timestamp: new Date().toISOString(),
        sessionUnlocked: true
      }
    });
    
    // Clear session boundary flag
    await sessionModel.setBoundaryFlag(sessionId, false);
    
    logger.info('Boundary lock cleared', {
      sessionId,
      userId,
      reason
    });
    
  } catch (error) {
    logger.error('Failed to clear boundary lock', {
      error: error instanceof Error ? error.message : "Unknown error",
      sessionId,
      userId,
      reason
    });
    throw error;
  }
}

/**
 * Get boundary lock status for a session
 */
export async function getBoundaryLockStatus(
  sessionModel: SessionModel,
  boundaryAuditModel: BoundaryAuditModel,
  sessionId: string
): Promise<{
  isLocked: boolean;
  lockReason?: string;
  lockTimestamp?: Date;
  auditEntries: any[];
}> {
  try {
    const session = await sessionModel.getById(sessionId);
    const auditEntries = await boundaryAuditModel.getBySessionId(sessionId, 10);
    
    if (!session) {
      return {
        isLocked: false,
        auditEntries: []
      };
    }
    
    const isLocked = session.boundaryFlag;
    const lockReason = isLocked ? 'Session has reached safety boundary' : undefined;
    const lockTimestamp = isLocked ? session.updatedAt : undefined;
    
    return {
      isLocked,
      lockReason,
      lockTimestamp,
      auditEntries
    };
    
  } catch (error) {
    logger.error('Failed to get boundary lock status', {
      error: error instanceof Error ? error.message : "Unknown error",
      sessionId
    });
    throw error;
  }
}

// Extend FastifyRequest to include boundary lock status
declare module 'fastify' {
  interface FastifyRequest {
    boundaryLockStatus?: {
      isLocked: boolean;
      sessionId: string;
      userId: string;
      error?: string;
    };
  }
}
