import { FastifyRequest, FastifyReply } from 'fastify';
import { validateContentSafety } from '../safety/boundary-detector';
import { getSafetyDetector } from '../../ai/safety/tier1-detector';
import { getTier2Classifier } from '../../ai/safety/tier2-classifier';
import { logger } from '../logger';

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
 * Enhanced safety middleware with Tier-1 detection and boundary flag
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
  
  // Use Tier-1 safety detector
  const tier1Detector = getSafetyDetector();
  const tier1Result = tier1Detector.checkMessage(content);
  
  // Use Tier-2 classifier for nuanced detection
  const tier2Classifier = getTier2Classifier();
  const tier2Result = tier2Classifier.classifyMessage(content);
  
  // Also use existing boundary detector for additional validation
  const boundaryValidation = validateContentSafety(content);
  
  // Determine the highest risk level from all detectors
  let highestRisk = 'low';
  let finalResult = tier1Result;
  
  // Prioritize Tier-1 results (most reliable)
  if (tier1Result.riskLevel === 'high' || boundaryValidation.boundaryResult?.riskLevel === 'high') {
    highestRisk = 'high';
    finalResult = tier1Result;
  } else if (tier1Result.riskLevel === 'medium' || boundaryValidation.boundaryResult?.riskLevel === 'medium') {
    highestRisk = 'medium';
    finalResult = tier1Result;
  } else if (tier2Result.riskLevel === 'high' && tier2Result.confidence >= 0.7) {
    highestRisk = 'high';
    finalResult = {
      isSafe: false,
      riskLevel: 'high',
      action: 'block',
      message: tier2Result.boundaryTemplate,
      concerns: tier2Result.categories
    };
  } else if (tier2Result.riskLevel === 'medium' && tier2Result.confidence >= 0.7) {
    highestRisk = 'medium';
    finalResult = {
      isSafe: false,
      riskLevel: 'medium',
      action: 'warn',
      message: tier2Result.boundaryTemplate,
      concerns: tier2Result.categories
    };
  }
  
  // Handle safety violations
  if (!tier1Result.isSafe || !boundaryValidation.isValid) {
    const safetyResponse = tier1Result.message ? {
      message: tier1Result.message,
      resources: tier1Result.resources || []
    } : boundaryValidation.safetyResponse;
    
    // Log the safety violation
    logger.warn('Safety boundary violation detected', {
      userId: context.userId,
      sessionId: context.sessionId,
      riskLevel: highestRisk,
      tier1Concerns: tier1Result.concerns,
      tier2Concerns: tier2Result.categories,
      tier2Confidence: tier2Result.confidence,
      boundaryConcerns: boundaryValidation.boundaryResult?.concerns,
      contentLength: content.length
    });
    
    // Return appropriate response based on risk level
    if (highestRisk === 'high') {
      reply.code(403).send({
        error: 'Content blocked for safety reasons',
        message: safetyResponse?.message || 'This content cannot be processed due to safety concerns.',
        resources: safetyResponse?.resources || [],
        action: 'block',
        boundaryResult: {
          riskLevel: highestRisk,
          concerns: [...(tier1Result.concerns || []), ...(boundaryValidation.boundaryResult?.concerns || [])]
        }
      });
      return;
    }
    
    if (highestRisk === 'medium') {
      reply.code(422).send({
        error: 'Content flagged for review',
        message: safetyResponse?.message || 'This content has been flagged for safety review.',
        resources: safetyResponse?.resources || [],
        action: 'warn',
        boundaryResult: {
          riskLevel: highestRisk,
          concerns: [...(tier1Result.concerns || []), ...(boundaryValidation.boundaryResult?.concerns || [])]
        }
      });
      return;
    }
  }
  
  // Add safety metadata to request for downstream processing
  request.safetyContext = {
    boundaryResult: {
      riskLevel: highestRisk,
      concerns: [...(tier1Result.concerns || []), ...(tier2Result.categories || []), ...(boundaryValidation.boundaryResult?.concerns || [])],
      tier1Result,
      tier2Result,
      boundaryResult: boundaryValidation.boundaryResult
    },
    isValid: tier1Result.isSafe && boundaryValidation.isValid && tier2Result.action !== 'block'
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
      boundaryResult: {
        riskLevel: string;
        concerns: string[];
        tier1Result: any;
        tier2Result: any;
        boundaryResult: any;
      };
      isValid: boolean;
    };
  }
}
