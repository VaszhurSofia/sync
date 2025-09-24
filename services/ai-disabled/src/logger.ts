// Simple logger for AI service (avoiding circular dependencies)
const createSecureLogger = (context: string) => ({
  info: (message: string, data?: any) => console.log(`[${context}] ${message}`, data ? '[REDACTED]' : ''),
  warn: (message: string, data?: any) => console.warn(`[${context}] ${message}`, data ? '[REDACTED]' : ''),
  error: (message: string, data?: any) => console.error(`[${context}] ${message}`, data ? '[REDACTED]' : ''),
  debug: (message: string, data?: any) => console.debug(`[${context}] ${message}`, data ? '[REDACTED]' : '')
});

const scrubForLogging = (data: any) => {
  if (typeof data === 'string') return data;
  if (typeof data === 'object' && data !== null) {
    const scrubbed = { ...data };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'content', 'email'];
    for (const key of sensitiveKeys) {
      if (key in scrubbed) {
        scrubbed[key] = '[REDACTED]';
      }
    }
    return scrubbed;
  }
  return data;
};

// Central logger for AI service
export const logger = createSecureLogger('AI');

// AI-specific logging functions
export const logAIRequest = (requestId: string, operation: string, duration: number) => {
  logger.info('AI request completed', {
    requestId,
    operation,
    duration
  });
};

export const logAIError = (error: Error, requestId?: string, context?: any) => {
  logger.error('AI error occurred', {
    requestId,
    error: error.message,
    stack: error.stack,
    context: context ? scrubForLogging(context) : undefined
  });
};

export const logAIPerformance = (operation: string, duration: number, tokenCount?: number) => {
  logger.info('AI performance metric', {
    operation,
    duration,
    tokenCount
  });
};

export const logSafetyEvent = (event: string, riskLevel: string, details?: any) => {
  logger.warn('AI safety event', {
    event,
    riskLevel,
    details: details ? scrubForLogging(details) : undefined
  });
};

// Export the scrubbing function for manual use
export { scrubForLogging };
