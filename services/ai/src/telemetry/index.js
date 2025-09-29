"use strict";
/**
 * AI Telemetry System
 * Tracks non-content metrics for prompt optimization and monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetryCollector = exports.TelemetryCollector = void 0;
class TelemetryCollector {
    events = [];
    maxEvents;
    constructor(maxEvents = 10000) {
        this.maxEvents = maxEvents;
    }
    /**
     * Record a telemetry event
     */
    recordEvent(event) {
        const fullEvent = {
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
    getMetrics() {
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
        const versionCounts = {};
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
    getEventsInRange(startDate, endDate) {
        return this.events.filter(e => e.timestamp >= startDate && e.timestamp <= endDate);
    }
    /**
     * Get events for a specific prompt version
     */
    getEventsByPromptVersion(version) {
        return this.events.filter(e => e.promptVersion === version);
    }
    /**
     * Get recent events (last N events)
     */
    getRecentEvents(count) {
        return this.events.slice(-count);
    }
    /**
     * Clear all events
     */
    clear() {
        this.events = [];
    }
    /**
     * Export events as JSON
     */
    exportEvents() {
        return JSON.stringify(this.events, null, 2);
    }
    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last24HoursEvents = this.getEventsInRange(yesterday, now);
        const last24HoursMetrics = this.calculateMetricsForEvents(last24HoursEvents);
        const byPromptVersion = {};
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
    calculateMetricsForEvents(events) {
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
        const versionCounts = {};
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
exports.TelemetryCollector = TelemetryCollector;
// Global telemetry collector instance
exports.telemetryCollector = new TelemetryCollector();
//# sourceMappingURL=index.js.map