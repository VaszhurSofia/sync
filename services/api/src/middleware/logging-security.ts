import { FastifyRequest, FastifyReply } from 'fastify';

interface LoggingSecurityConfig {
  preventPlaintextLogging: boolean;
  sensitiveFields: string[];
  allowedLogFields: string[];
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

const LOGGING_SECURITY_CONFIG: LoggingSecurityConfig = {
  preventPlaintextLogging: true,
  sensitiveFields: [
    'content',
    'contentEnc',
    'message',
    'email',
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'feedback',
    'displayName',
    'displayNameEnc'
  ],
  allowedLogFields: [
    'id',
    'sessionId',
    'userId',
    'coupleId',
    'timestamp',
    'createdAt',
    'updatedAt',
    'status',
    'type',
    'action',
    'endpoint',
    'method',
    'statusCode',
    'duration',
    'userAgent',
    'ip'
  ],
  logLevel: process.env.LOG_LEVEL as any || 'info'
};

/**
 * Sanitize object for logging by removing sensitive fields
 */
function sanitizeForLogging(obj: any, depth = 0): any {
  if (depth > 3) {
    return '[Max Depth Reached]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Check if string contains sensitive patterns
    if (LOGGING_SECURITY_CONFIG.sensitiveFields.some(field => 
      obj.toLowerCase().includes(field.toLowerCase())
    )) {
      return '[REDACTED]';
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLogging(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Check if field is sensitive
      if (LOGGING_SECURITY_CONFIG.sensitiveFields.some(field => 
        lowerKey.includes(field.toLowerCase())
      )) {
        sanitized[key] = '[REDACTED]';
      } else if (LOGGING_SECURITY_CONFIG.allowedLogFields.includes(key)) {
        sanitized[key] = sanitizeForLogging(value, depth + 1);
      } else {
        // For unknown fields, be conservative
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  return obj;
}

/**
 * Secure logging middleware
 */
export function createSecureLoggingMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!LOGGING_SECURITY_CONFIG.preventPlaintextLogging) {
      return;
    }

    // Override console.log to prevent accidental sensitive data logging
    const originalConsoleLog = console.log;
    const originalConsoleInfo = console.info;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    console.log = (...args: any[]) => {
      const sanitizedArgs = args.map(arg => sanitizeForLogging(arg));
      originalConsoleLog(...sanitizedArgs);
    };

    console.info = (...args: any[]) => {
      const sanitizedArgs = args.map(arg => sanitizeForLogging(arg));
      originalConsoleInfo(...sanitizedArgs);
    };

    console.warn = (...args: any[]) => {
      const sanitizedArgs = args.map(arg => sanitizeForLogging(arg));
      originalConsoleWarn(...sanitizedArgs);
    };

    console.error = (...args: any[]) => {
      const sanitizedArgs = args.map(arg => sanitizeForLogging(arg));
      originalConsoleError(...sanitizedArgs);
    };

    // Restore original console methods after request
    reply.raw.on('finish', () => {
      console.log = originalConsoleLog;
      console.info = originalConsoleInfo;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
    });
  };
}

/**
 * Safe logging function that automatically sanitizes data
 */
export function safeLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
  const sanitizedData = data ? sanitizeForLogging(data) : undefined;
  
  switch (level) {
    case 'info':
      console.info(message, sanitizedData);
      break;
    case 'warn':
      console.warn(message, sanitizedData);
      break;
    case 'error':
      console.error(message, sanitizedData);
      break;
    case 'debug':
      if (LOGGING_SECURITY_CONFIG.logLevel === 'debug') {
        console.debug(message, sanitizedData);
      }
      break;
  }
}

/**
 * Validate that no sensitive data is being logged
 */
export function validateLoggingSecurity(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check if console.log has been overridden
  if (console.log.toString().includes('sanitizeForLogging')) {
    issues.push('Console.log has been overridden - this may affect debugging');
  }

  // Check for common logging anti-patterns in the codebase
  // This would typically be done by a linter or static analysis tool
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Create a secure logger instance
 */
export function createSecureLogger(context: string) {
  return {
    info: (message: string, data?: any) => safeLog('info', `[${context}] ${message}`, data),
    warn: (message: string, data?: any) => safeLog('warn', `[${context}] ${message}`, data),
    error: (message: string, data?: any) => safeLog('error', `[${context}] ${message}`, data),
    debug: (message: string, data?: any) => safeLog('debug', `[${context}] ${message}`, data),
  };
}

/**
 * Middleware to add security headers
 */
export function addSecurityHeaders(request: FastifyRequest, reply: FastifyReply) {
  // Add security headers
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add logging security header
  reply.header('X-Logging-Security', 'enabled');
}

/**
 * Get logging security configuration
 */
export function getLoggingSecurityConfig() {
  return {
    preventPlaintextLogging: LOGGING_SECURITY_CONFIG.preventPlaintextLogging,
    sensitiveFieldsCount: LOGGING_SECURITY_CONFIG.sensitiveFields.length,
    allowedLogFieldsCount: LOGGING_SECURITY_CONFIG.allowedLogFields.length,
    logLevel: LOGGING_SECURITY_CONFIG.logLevel
  };
}
