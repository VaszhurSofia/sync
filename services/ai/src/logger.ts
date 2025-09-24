import { createSecureLogger, scrubForLogging } from '../api/src/middleware/log-scrubbing';

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
