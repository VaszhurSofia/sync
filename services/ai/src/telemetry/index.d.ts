/**
 * AI Telemetry System
 * Tracks non-content metrics for prompt optimization and monitoring
 */
export interface TelemetryEvent {
    timestamp: Date;
    sessionId: string;
    userId: string;
    promptVersion: string;
    validatorPassed: boolean;
    totalSentences: number;
    latency: number;
    retryCount: number;
    usedFallback: boolean;
    usedBoundary: boolean;
    validationErrors?: string[];
    modelUsed: string;
    temperature: number;
    maxTokens: number;
}
export interface TelemetryMetrics {
    totalRequests: number;
    averageLatency: number;
    validatorPassRate: number;
    fallbackRate: number;
    boundaryRate: number;
    averageRetries: number;
    averageSentences: number;
    promptVersionDistribution: Record<string, number>;
    errorRate: number;
}
export declare class TelemetryCollector {
    private events;
    private maxEvents;
    constructor(maxEvents?: number);
    /**
     * Record a telemetry event
     */
    recordEvent(event: Omit<TelemetryEvent, 'timestamp'>): void;
    /**
     * Get telemetry metrics
     */
    getMetrics(): TelemetryMetrics;
    /**
     * Get events for a specific time range
     */
    getEventsInRange(startDate: Date, endDate: Date): TelemetryEvent[];
    /**
     * Get events for a specific prompt version
     */
    getEventsByPromptVersion(version: string): TelemetryEvent[];
    /**
     * Get recent events (last N events)
     */
    getRecentEvents(count: number): TelemetryEvent[];
    /**
     * Clear all events
     */
    clear(): void;
    /**
     * Export events as JSON
     */
    exportEvents(): string;
    /**
     * Get performance summary
     */
    getPerformanceSummary(): {
        overall: TelemetryMetrics;
        last24Hours: TelemetryMetrics;
        byPromptVersion: Record<string, TelemetryMetrics>;
    };
    private calculateMetricsForEvents;
}
export declare const telemetryCollector: TelemetryCollector;
//# sourceMappingURL=index.d.ts.map