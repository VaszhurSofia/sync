import { FastifyRequest, FastifyReply } from 'fastify';
import { SessionModel } from '../models/sessions';
import { BoundaryLockedError } from '../types/api-client';

export interface BoundaryDetectionRequest extends FastifyRequest {
  body: {
    content: string;
  };
  params: {
    id: string;
  };
}

// Simple boundary detection patterns (Tier 1 deterministic)
const BOUNDARY_PATTERNS = [
  // Self-harm indicators
  /\b(kill|hurt|harm|end|suicide|suicidal)\s+(myself|me|my\s+life)\b/i,
  /\b(want|wish|hope)\s+to\s+(die|be\s+dead|not\s+exist)\b/i,
  /\b(cut|cutting|self\s*harm|self\s*injury)\b/i,
  
  // Violence indicators
  /\b(hit|hurt|harm|kill|attack|violence|violent)\s+(you|them|him|her|partner|spouse)\b/i,
  /\b(want|wish|hope)\s+to\s+(hurt|harm|kill|hit)\s+(you|them|him|her|partner|spouse)\b/i,
  /\b(threat|threaten|threatening)\b/i,
  
  // Abuse indicators
  /\b(abuse|abusive|manipulate|manipulation|control|controlling)\b/i,
  /\b(gaslight|gaslighting|blame|blaming|guilt|guilting)\b/i,
  /\b(isolate|isolating|separate|separating)\b/i,
  
  // Crisis indicators
  /\b(crisis|emergency|urgent|immediate|now|right\s+now)\b/i,
  /\b(help|helpless|hopeless|desperate|despair)\b/i,
  /\b(can't|cannot|unable)\s+(cope|handle|deal|manage)\b/i,
];

export function detectBoundaryViolation(content: string): {
  isViolation: boolean;
  matchedPatterns: string[];
  riskLevel: 'low' | 'medium' | 'high';
} {
  const matchedPatterns: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  
  for (const pattern of BOUNDARY_PATTERNS) {
    if (pattern.test(content)) {
      matchedPatterns.push(pattern.source);
      
      // Determine risk level based on pattern type
      if (pattern.source.includes('kill') || pattern.source.includes('suicide')) {
        riskLevel = 'high';
      } else if (pattern.source.includes('hurt') || pattern.source.includes('harm')) {
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }
    }
  }
  
  return {
    isViolation: matchedPatterns.length > 0,
    matchedPatterns,
    riskLevel,
  };
}

export async function boundaryDetectionMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { content } = request.body as { content: string };
    
    if (!content || typeof content !== 'string') {
      return; // Skip validation if no content
    }
    
    const detection = detectBoundaryViolation(content);
    
    if (detection.isViolation) {
      // Log the violation for monitoring
      request.log.warn({
        boundaryViolation: {
          content: content.substring(0, 100) + '...', // Truncated for logging
          matchedPatterns: detection.matchedPatterns,
          riskLevel: detection.riskLevel,
          timestamp: new Date().toISOString(),
        }
      }, 'Boundary violation detected');
      
      // For high-risk violations, immediately lock the session
      if (detection.riskLevel === 'high') {
        const sessionId = (request.params as { id: string }).id;
        if (sessionId) {
          await SessionModel.setBoundaryFlag(sessionId, true, 'system');
        }
        
        reply.code(409);
        throw new BoundaryLockedError('Content violates safety boundaries. Please reach out to someone you trust or contact emergency services.');
      }
      
      // For medium-risk violations, add warning but allow message
      if (detection.riskLevel === 'medium') {
        request.log.warn('Medium-risk boundary violation detected, allowing message with warning');
      }
    }
    
  } catch (error) {
    if (error instanceof BoundaryLockedError) {
      throw error;
    }
    
    request.log.error(error, 'Boundary detection failed');
    // Don't block the request if boundary detection fails
  }
}

export function getBoundaryTemplate(): {
  message: string;
  resources: string[];
  action: 'continue' | 'pause' | 'redirect';
} {
  return {
    message: "We've detected content that may indicate you're in distress. Your safety is important to us. Please consider reaching out to someone you trust or contacting emergency services.",
    resources: [
      "Crisis Helpline: +800-123-4567",
      "Emergency Services: 112 (EU)",
      "Mental Health Support: +800-987-6543"
    ],
    action: 'pause'
  };
}
