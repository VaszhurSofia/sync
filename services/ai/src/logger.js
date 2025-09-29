"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrubForLogging = exports.logSafetyEvent = exports.logAIPerformance = exports.logAIError = exports.logAIRequest = exports.logger = void 0;
// Simple logger for AI service (avoiding circular dependencies)
const createSecureLogger = (context) => ({
    info: (message, data) => console.log(`[${context}] ${message}`, data ? '[REDACTED]' : ''),
    warn: (message, data) => console.warn(`[${context}] ${message}`, data ? '[REDACTED]' : ''),
    error: (message, data) => console.error(`[${context}] ${message}`, data ? '[REDACTED]' : ''),
    debug: (message, data) => console.debug(`[${context}] ${message}`, data ? '[REDACTED]' : '')
});
const scrubForLogging = (data) => {
    if (typeof data === 'string')
        return data;
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
exports.scrubForLogging = scrubForLogging;
// Central logger for AI service
exports.logger = createSecureLogger('AI');
// AI-specific logging functions
const logAIRequest = (requestId, operation, duration) => {
    exports.logger.info('AI request completed', {
        requestId,
        operation,
        duration
    });
};
exports.logAIRequest = logAIRequest;
const logAIError = (error, requestId, context) => {
    exports.logger.error('AI error occurred', {
        requestId,
        error: error.message,
        stack: error.stack,
        context: context ? scrubForLogging(context) : undefined
    });
};
exports.logAIError = logAIError;
const logAIPerformance = (operation, duration, tokenCount) => {
    exports.logger.info('AI performance metric', {
        operation,
        duration,
        tokenCount
    });
};
exports.logAIPerformance = logAIPerformance;
const logSafetyEvent = (event, riskLevel, details) => {
    exports.logger.warn('AI safety event', {
        event,
        riskLevel,
        details: details ? scrubForLogging(details) : undefined
    });
};
exports.logSafetyEvent = logSafetyEvent;
//# sourceMappingURL=logger.js.map