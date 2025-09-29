declare const scrubForLogging: (data: any) => any;
export declare const logger: {
    info: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
    debug: (message: string, data?: any) => void;
};
export declare const logAIRequest: (requestId: string, operation: string, duration: number) => void;
export declare const logAIError: (error: Error, requestId?: string, context?: any) => void;
export declare const logAIPerformance: (operation: string, duration: number, tokenCount?: number) => void;
export declare const logSafetyEvent: (event: string, riskLevel: string, details?: any) => void;
export { scrubForLogging };
//# sourceMappingURL=logger.d.ts.map