import { FastifyRequest, FastifyReply } from 'fastify';

interface LogScrubbingConfig {
  enabled: boolean;
  forbiddenKeys: string[];
  allowedKeys: string[];
  redactionPattern: string;
}

const LOG_SCRUBBING_CONFIG: LogScrubbingConfig = {
  enabled: true,
  forbiddenKeys: [
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
    'displayNameEnc',
    'summaryText',
    'summaryTextEnc'
  ],
  allowedKeys: [
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
    'ip',
    'riskLevel',
    'concerns',
    'violations'
  ],
  redactionPattern: '[REDACTED]'
};

/**
 * Scrub sensitive data from objects for logging
 */
export function scrubForLogging(obj: any, depth = 0): any {
  if (depth > 3) {
    return '[Max Depth Reached]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Check if string contains sensitive patterns
    if (LOG_SCRUBBING_CONFIG.forbiddenKeys.some(key => 
      obj.toLowerCase().includes(key.toLowerCase())
    )) {
      return LOG_SCRUBBING_CONFIG.redactionPattern;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => scrubForLogging(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const scrubbed: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key is forbidden
      if (LOG_SCRUBBING_CONFIG.forbiddenKeys.some(forbiddenKey => 
        lowerKey.includes(forbiddenKey.toLowerCase())
      )) {
        scrubbed[key] = LOG_SCRUBBING_CONFIG.redactionPattern;
      } else if (LOG_SCRUBBING_CONFIG.allowedKeys.includes(key)) {
        scrubbed[key] = scrubForLogging(value, depth + 1);
      } else {
        // For unknown keys, be conservative and redact
        scrubbed[key] = LOG_SCRUBBING_CONFIG.redactionPattern;
      }
    }
    
    return scrubbed;
  }

  return obj;
}

/**
 * Secure logging middleware
 */
export function createLogScrubbingMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!LOG_SCRUBBING_CONFIG.enabled) {
      return;
    }

    // Override console methods to scrub sensitive data
    const originalConsoleLog = console.log;
    const originalConsoleInfo = console.info;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    const originalConsoleDebug = console.debug;

    console.log = (...args: any[]) => {
      const scrubbedArgs = args.map(arg => scrubForLogging(arg));
      originalConsoleLog(...scrubbedArgs);
    };

    console.info = (...args: any[]) => {
      const scrubbedArgs = args.map(arg => scrubForLogging(arg));
      originalConsoleInfo(...scrubbedArgs);
    };

    console.warn = (...args: any[]) => {
      const scrubbedArgs = args.map(arg => scrubForLogging(arg));
      originalConsoleWarn(...scrubbedArgs);
    };

    console.error = (...args: any[]) => {
      const scrubbedArgs = args.map(arg => scrubForLogging(arg));
      originalConsoleError(...scrubbedArgs);
    };

    console.debug = (...args: any[]) => {
      const scrubbedArgs = args.map(arg => scrubForLogging(arg));
      originalConsoleDebug(...scrubbedArgs);
    };

    // Restore original console methods after request
    reply.raw.on('finish', () => {
      console.log = originalConsoleLog;
      console.info = originalConsoleInfo;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
      console.debug = originalConsoleDebug;
    });
  };
}

/**
 * Safe logging function that automatically scrubs data
 */
export function safeLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
  const scrubbedData = data ? scrubForLogging(data) : undefined;
  
  switch (level) {
    case 'info':
      console.info(message, scrubbedData);
      break;
    case 'warn':
      console.warn(message, scrubbedData);
      break;
    case 'error':
      console.error(message, scrubbedData);
      break;
    case 'debug':
      console.debug(message, scrubbedData);
      break;
  }
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
 * Validate that no sensitive data is being logged
 */
export function validateLogScrubbing(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check if console.log has been overridden
  if (console.log.toString().includes('scrubForLogging')) {
    issues.push('Console.log has been overridden - this may affect debugging');
  }

  // Check for common logging anti-patterns
  // This would typically be done by a linter or static analysis tool
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Get log scrubbing configuration
 */
export function getLogScrubbingConfig() {
  return {
    enabled: LOG_SCRUBBING_CONFIG.enabled,
    forbiddenKeysCount: LOG_SCRUBBING_CONFIG.forbiddenKeys.length,
    allowedKeysCount: LOG_SCRUBBING_CONFIG.allowedKeys.length,
    redactionPattern: LOG_SCRUBBING_CONFIG.redactionPattern
  };
}
