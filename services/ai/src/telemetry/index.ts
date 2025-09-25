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

export class TelemetryCollector {
  private events: TelemetryEvent[] = [];
  private maxEvents: number;

  constructor(maxEvents: number = 10000) {
    this.maxEvents = maxEvents;
  }

  /**
   * Record a telemetry event
   */
  recordEvent(event: Omit<TelemetryEvent, 'timestamp'>): void {
    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: new Date()
    };

    this.events.push(fullEvent);

    // Maintain max events limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Get telemetry metrics
   */
  getMetrics(): TelemetryMetrics {
    if (this.events.length === 0) {
      return {
        totalRequests: 0,
        averageLatency: 0,
        validatorPassRate: 0,
        fallbackRate: 0,
        boundaryRate: 0,
        averageRetries: 0,
        averageSentences: 0,
        promptVersionDistribution: {},
        errorRate: 0
      };
    }

    const totalRequests = this.events.length;
    const averageLatency = this.events.reduce((sum, e) => sum + e.latency, 0) / totalRequests;
    const validatorPassed = this.events.filter(e => e.validatorPassed).length;
    const validatorPassRate = validatorPassed / totalRequests;
    const fallbackUsed = this.events.filter(e => e.usedFallback).length;
    const fallbackRate = fallbackUsed / totalRequests;
    const boundaryUsed = this.events.filter(e => e.usedBoundary).length;
    const boundaryRate = boundaryUsed / totalRequests;
    const averageRetries = this.events.reduce((sum, e) => sum + e.retryCount, 0) / totalRequests;
    const averageSentences = this.events.reduce((sum, e) => sum + e.totalSentences, 0) / totalRequests;
    
    // Prompt version distribution
    const versionCounts: Record<string, number> = {};
    this.events.forEach(e => {
      versionCounts[e.promptVersion] = (versionCounts[e.promptVersion] || 0) + 1;
    });

    // Error rate (events with validation errors)
    const errorEvents = this.events.filter(e => e.validationErrors && e.validationErrors.length > 0).length;
    const errorRate = errorEvents / totalRequests;

    return {
      totalRequests,
      averageLatency,
      validatorPassRate,
      fallbackRate,
      boundaryRate,
      averageRetries,
      averageSentences,
      promptVersionDistribution: versionCounts,
      errorRate
    };
  }

  /**
   * Get events for a specific time range
   */
  getEventsInRange(startDate: Date, endDate: Date): TelemetryEvent[] {
    return this.events.filter(e => e.timestamp >= startDate && e.timestamp <= endDate);
  }

  /**
   * Get events for a specific prompt version
   */
  getEventsByPromptVersion(version: string): TelemetryEvent[] {
    return this.events.filter(e => e.promptVersion === version);
  }

  /**
   * Get recent events (last N events)
   */
  getRecentEvents(count: number): TelemetryEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Export events as JSON
   */
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    overall: TelemetryMetrics;
    last24Hours: TelemetryMetrics;
    byPromptVersion: Record<string, TelemetryMetrics>;
  } {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const last24HoursEvents = this.getEventsInRange(yesterday, now);
    const last24HoursMetrics = this.calculateMetricsForEvents(last24HoursEvents);
    
    const byPromptVersion: Record<string, TelemetryMetrics> = {};
    const versions = [...new Set(this.events.map(e => e.promptVersion))];
    
    versions.forEach(version => {
      const versionEvents = this.getEventsByPromptVersion(version);
      byPromptVersion[version] = this.calculateMetricsForEvents(versionEvents);
    });

    return {
      overall: this.getMetrics(),
      last24Hours: last24HoursMetrics,
      byPromptVersion
    };
  }

  private calculateMetricsForEvents(events: TelemetryEvent[]): TelemetryMetrics {
    if (events.length === 0) {
      return {
        totalRequests: 0,
        averageLatency: 0,
        validatorPassRate: 0,
        fallbackRate: 0,
        boundaryRate: 0,
        averageRetries: 0,
        averageSentences: 0,
        promptVersionDistribution: {},
        errorRate: 0
      };
    }

    const totalRequests = events.length;
    const averageLatency = events.reduce((sum, e) => sum + e.latency, 0) / totalRequests;
    const validatorPassed = events.filter(e => e.validatorPassed).length;
    const validatorPassRate = validatorPassed / totalRequests;
    const fallbackUsed = events.filter(e => e.usedFallback).length;
    const fallbackRate = fallbackUsed / totalRequests;
    const boundaryUsed = events.filter(e => e.usedBoundary).length;
    const boundaryRate = boundaryUsed / totalRequests;
    const averageRetries = events.reduce((sum, e) => sum + e.retryCount, 0) / totalRequests;
    const averageSentences = events.reduce((sum, e) => sum + e.totalSentences, 0) / totalRequests;
    
    const versionCounts: Record<string, number> = {};
    events.forEach(e => {
      versionCounts[e.promptVersion] = (versionCounts[e.promptVersion] || 0) + 1;
    });

    const errorEvents = events.filter(e => e.validationErrors && e.validationErrors.length > 0).length;
    const errorRate = errorEvents / totalRequests;

    return {
      totalRequests,
      averageLatency,
      validatorPassRate,
      fallbackRate,
      boundaryRate,
      averageRetries,
      averageSentences,
      promptVersionDistribution: versionCounts,
      errorRate
    };
  }
}

// Global telemetry collector instance
export const telemetryCollector = new TelemetryCollector();
