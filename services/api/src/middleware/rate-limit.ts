import { FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory storage for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default rate limit configurations
export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // Authentication endpoints - more restrictive
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  
  // Message sending - moderate limits
  messages: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 messages per minute
    message: 'Rate limit exceeded. Please wait before sending another message.',
  },
  
  // General API endpoints
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: 'Rate limit exceeded. Please slow down your requests.',
  },
  
  // Survey submissions
  survey: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 surveys per hour
    message: 'Too many survey submissions. Please wait before submitting another survey.',
  },
  
  // Delete requests - very restrictive
  delete: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 3, // 3 delete requests per day
    message: 'Too many delete requests. Please wait 24 hours before requesting another deletion.',
  },
  
  // Safety violations - escalating limits
  safety: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 violations per hour
    message: 'Too many safety violations detected. Your account has been temporarily restricted.',
  },
};

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: FastifyRequest): string {
  // Try to get user ID first (for authenticated requests)
  const userId = (request as any).user?.id;
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fall back to IP address
  const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
  return `ip:${ip}`;
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimit(config: RateLimitConfig) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const clientId = getClientId(request);
    const key = `${clientId}:${config.windowMs}`;
    const now = Date.now();
    
    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance
      cleanupExpiredEntries();
    }
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      rateLimitStore.set(key, entry);
    }
    
    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      reply.code(429).send({
        error: 'Rate limit exceeded',
        message: config.message,
        retryAfter,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: new Date(entry.resetTime).toISOString(),
      });
      
      return false; // Block the request
    }
    
    // Increment counter
    entry.count++;
    rateLimitStore.set(key, entry);
    
    // Add rate limit headers
    reply.header('X-RateLimit-Limit', config.maxRequests);
    reply.header('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count));
    reply.header('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
    
    return true; // Allow the request
  };
}

/**
 * Pre-configured rate limiters
 */
export const rateLimiters = {
  auth: createRateLimit(rateLimitConfigs.auth),
  messages: createRateLimit(rateLimitConfigs.messages),
  general: createRateLimit(rateLimitConfigs.general),
  survey: createRateLimit(rateLimitConfigs.survey),
  delete: createRateLimit(rateLimitConfigs.delete),
  safety: createRateLimit(rateLimitConfigs.safety),
};

/**
 * Dynamic rate limiter based on user behavior
 */
export function createDynamicRateLimit(baseConfig: RateLimitConfig) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      // Fall back to general rate limiting for unauthenticated users
      return rateLimiters.general(request, reply);
    }
    
    // Check user's safety violation history
    const safetyViolations = (request as any).safetyViolations || 0;
    
    // Adjust rate limits based on safety violations
    let adjustedConfig = { ...baseConfig };
    if (safetyViolations > 10) {
      // Severely restricted for users with many violations
      adjustedConfig.maxRequests = Math.max(1, Math.floor(baseConfig.maxRequests * 0.1));
      adjustedConfig.windowMs = baseConfig.windowMs * 2;
    } else if (safetyViolations > 5) {
      // Moderately restricted
      adjustedConfig.maxRequests = Math.max(1, Math.floor(baseConfig.maxRequests * 0.3));
      adjustedConfig.windowMs = Math.floor(baseConfig.windowMs * 1.5);
    } else if (safetyViolations > 2) {
      // Slightly restricted
      adjustedConfig.maxRequests = Math.max(1, Math.floor(baseConfig.maxRequests * 0.6));
    }
    
    const dynamicLimiter = createRateLimit(adjustedConfig);
    return dynamicLimiter(request, reply);
  };
}

/**
 * Rate limit status endpoint
 */
export function getRateLimitStatus(request: FastifyRequest) {
  const clientId = getClientId(request);
  const status: Record<string, any> = {};
  
  for (const [name, config] of Object.entries(rateLimitConfigs)) {
    const key = `${clientId}:${config.windowMs}`;
    const entry = rateLimitStore.get(key);
    
    if (entry && entry.resetTime > Date.now()) {
      status[name] = {
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - entry.count),
        resetTime: new Date(entry.resetTime).toISOString(),
        windowMs: config.windowMs,
      };
    } else {
      status[name] = {
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: null,
        windowMs: config.windowMs,
      };
    }
  }
  
  return status;
}

/**
 * Reset rate limits for a specific client (admin function)
 */
export function resetRateLimit(clientId: string): boolean {
  let reset = false;
  for (const key of rateLimitStore.keys()) {
    if (key.startsWith(clientId)) {
      rateLimitStore.delete(key);
      reset = true;
    }
  }
  return reset;
}
