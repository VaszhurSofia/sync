import { FastifyRequest, FastifyReply } from 'fastify';
import { validateContentSafety } from '../safety/boundary-detector';

/**
 * M4: Safety Middleware
 * Integrates boundary detection with API requests
 */

export interface SafetyContext {
  userId: string;
  sessionId?: string;
  messageCount: number;
  previousViolations: number;
}

/**
 * Safety middleware for message content validation
 */
export async function safetyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  context: SafetyContext
) {
  const body = request.body as any;
  
  // Only validate if there's content to check
  if (!body?.content || typeof body.content !== 'string') {
    return; // Let other validation handle this
  }
  
  const content = body.content.trim();
  
  // Skip validation for very short messages
  if (content.length < 10) {
    return;
  }
  
  // Validate content safety
  const validation = validateContentSafety(content);
  
  if (!validation.isValid) {
    const { boundaryResult, safetyResponse } = validation;
    
    // Log the safety violation
    request.log.warn('Safety boundary violation detected', {
      userId: context.userId,
      sessionId: context.sessionId,
      riskLevel: boundaryResult.riskLevel,
      concerns: boundaryResult.concerns,
      matchedPatterns: boundaryResult.matchedPatterns,
      contentLength: content.length
    });
    
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
  
  // Add safety metadata to request for downstream processing
  request.safetyContext = {
    boundaryResult: validation.boundaryResult,
    isValid: validation.isValid
  };
}

/**
 * Rate limiting based on safety violations
 */
export function getSafetyRateLimit(context: SafetyContext): {
  maxRequests: number;
  windowMs: number;
  message: string;
} {
  const { previousViolations } = context;
  
  if (previousViolations >= 3) {
    return {
      maxRequests: 1,
      windowMs: 60 * 60 * 1000, // 1 hour
      message: 'Rate limited due to multiple safety violations. Please take a break and consider the resources provided.'
    };
  }
  
  if (previousViolations >= 1) {
    return {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      message: 'Rate limited due to safety concerns. Please review the safety guidelines.'
    };
  }
  
  return {
    maxRequests: 20,
    windowMs: 5 * 60 * 1000, // 5 minutes
    message: 'Normal rate limit applied.'
  };
}

/**
 * Frontend lock configuration
 */
export interface FrontendLock {
  isLocked: boolean;
  reason: string;
  message: string;
  resources: string[];
  unlockConditions: string[];
}

/**
 * Determine if frontend should be locked for a user
 */
export function getFrontendLock(context: SafetyContext): FrontendLock {
  const { previousViolations, messageCount } = context;
  
  // High violation count - lock frontend
  if (previousViolations >= 3) {
    return {
      isLocked: true,
      reason: 'multiple_safety_violations',
      message: 'Your account has been temporarily locked due to multiple safety violations. Please review the safety guidelines and consider reaching out for support.',
      resources: [
        'EU Crisis Helpline: 116 123',
        'Your local mental health services',
        'Emergency services: 112'
      ],
      unlockConditions: [
        'Wait 24 hours',
        'Review safety guidelines',
        'Contact support if needed'
      ]
    };
  }
  
  // Medium violation count - warning
  if (previousViolations >= 1) {
    return {
      isLocked: false,
      reason: 'safety_warning',
      message: 'Please be mindful of our safety guidelines. If you\'re struggling, please reach out for support.',
      resources: [
        'EU Mental Health Network',
        'Crisis helpline: 116 123'
      ],
      unlockConditions: []
    };
  }
  
  // No violations - normal operation
  return {
    isLocked: false,
    reason: 'normal',
    message: 'Normal operation',
    resources: [],
    unlockConditions: []
  };
}

// Extend FastifyRequest to include safety context
declare module 'fastify' {
  interface FastifyRequest {
    safetyContext?: {
      boundaryResult: any;
      isValid: boolean;
    };
  }
}
