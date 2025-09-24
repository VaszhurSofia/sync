import { createSecureLogger, scrubForLogging } from './middleware/log-scrubbing';

// Central logger for API service
export const logger = createSecureLogger('API');

// Additional utility functions
export const logRequest = (method: string, url: string, statusCode: number, duration: number) => {
  logger.info('Request completed', {
    method,
    url,
    statusCode,
    duration
  });
};

export const logError = (error: Error, context?: any) => {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    context: context ? scrubForLogging(context) : undefined
  });
};

export const logSecurityEvent = (event: string, details?: any) => {
  logger.warn('Security event', {
    event,
    details: details ? scrubForLogging(details) : undefined
  });
};

export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  logger.info('Performance metric', {
    operation,
    duration,
    metadata: metadata ? scrubForLogging(metadata) : undefined
  });
};

// Export the scrubbing function for manual use
export { scrubForLogging };
