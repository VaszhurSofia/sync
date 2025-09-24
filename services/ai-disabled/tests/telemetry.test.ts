/**
 * Telemetry System Tests
 * Tests for PR-AI-24: Telemetry (non-content): prompt version, validator pass/fail, total sentences, latency
 */

import { TelemetryCollector, TelemetryEvent } from '../src/telemetry';

describe('Telemetry System Tests', () => {
  let telemetryCollector: TelemetryCollector;

  beforeEach(() => {
    telemetryCollector = new TelemetryCollector(100); // Small limit for testing
  });

  describe('Event Recording', () => {
    it('should record telemetry events', () => {
      const event: Omit<TelemetryEvent, 'timestamp'> = {
        sessionId: 'session-123',
        userId: 'user-456',
        promptVersion: 'v1.2',
        validatorPassed: true,
        totalSentences: 8,
        latency: 1500,
        retryCount: 0,
        usedFallback: false,
        usedBoundary: false,
        modelUsed: 'gpt-4',
        temperature: 0.7,
        maxTokens: 800
      };

      telemetryCollector.recordEvent(event);

      const metrics = telemetryCollector.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.validatorPassRate).toBe(1);
      expect(metrics.fallbackRate).toBe(0);
      expect(metrics.boundaryRate).toBe(0);
      expect(metrics.averageLatency).toBe(1500);
      expect(metrics.averageSentences).toBe(8);
      expect(metrics.promptVersionDistribution['v1.2']).toBe(1);
    });

    it('should record multiple events', () => {
      const events = [
        {
          sessionId: 'session-1',
          userId: 'user-1',
          promptVersion: 'v1.2',
          validatorPassed: true,
          totalSentences: 8,
          latency: 1500,
          retryCount: 0,
          usedFallback: false,
          usedBoundary: false,
          modelUsed: 'gpt-4',
          temperature: 0.7,
          maxTokens: 800
        },
        {
          sessionId: 'session-2',
          userId: 'user-2',
          promptVersion: 'v1.2',
          validatorPassed: false,
          totalSentences: 6,
          latency: 2000,
          retryCount: 1,
          usedFallback: true,
          usedBoundary: false,
          modelUsed: 'gpt-4',
          temperature: 0.7,
          maxTokens: 800
        },
        {
          sessionId: 'session-3',
          userId: 'user-3',
          promptVersion: 'v1',
          validatorPassed: true,
          totalSentences: 7,
          latency: 1200,
          retryCount: 0,
          usedFallback: false,
          usedBoundary: true,
          modelUsed: 'gpt-4',
          temperature: 0.7,
          maxTokens: 800
        }
      ];

      events.forEach(event => telemetryCollector.recordEvent(event));

      const metrics = telemetryCollector.getMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.validatorPassRate).toBe(2/3); // 2 out of 3 passed
      expect(metrics.fallbackRate).toBe(1/3); // 1 out of 3 used fallback
      expect(metrics.boundaryRate).toBe(1/3); // 1 out of 3 used boundary
      expect(metrics.averageLatency).toBe((1500 + 2000 + 1200) / 3);
      expect(metrics.averageSentences).toBe((8 + 6 + 7) / 3);
      expect(metrics.promptVersionDistribution['v1.2']).toBe(2);
      expect(metrics.promptVersionDistribution['v1']).toBe(1);
    });

    it('should maintain max events limit', () => {
      const smallCollector = new TelemetryCollector(2);
      
      // Record 3 events
      for (let i = 0; i < 3; i++) {
        smallCollector.recordEvent({
          sessionId: `session-${i}`,
          userId: `user-${i}`,
          promptVersion: 'v1.2',
          validatorPassed: true,
          totalSentences: 8,
          latency: 1500,
          retryCount: 0,
          usedFallback: false,
          usedBoundary: false,
          modelUsed: 'gpt-4',
          temperature: 0.7,
          maxTokens: 800
        });
      }

      const metrics = smallCollector.getMetrics();
      expect(metrics.totalRequests).toBe(2); // Only last 2 events kept
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate correct metrics for mixed results', () => {
      // Record events with various outcomes
      const testEvents = [
        { validatorPassed: true, latency: 1000, retryCount: 0, usedFallback: false, usedBoundary: false, totalSentences: 8, promptVersion: 'v1.2' },
        { validatorPassed: false, latency: 2000, retryCount: 1, usedFallback: true, usedBoundary: false, totalSentences: 6, promptVersion: 'v1.2' },
        { validatorPassed: true, latency: 1500, retryCount: 0, usedFallback: false, usedBoundary: true, totalSentences: 7, promptVersion: 'v1' },
        { validatorPassed: true, latency: 800, retryCount: 0, usedFallback: false, usedBoundary: false, totalSentences: 8, promptVersion: 'v1.2' },
        { validatorPassed: false, latency: 3000, retryCount: 2, usedFallback: true, usedBoundary: false, totalSentences: 5, promptVersion: 'v1' }
      ];

      testEvents.forEach((event, index) => {
        telemetryCollector.recordEvent({
          sessionId: `session-${index}`,
          userId: `user-${index}`,
          ...event,
          modelUsed: 'gpt-4',
          temperature: 0.7,
          maxTokens: 800
        });
      });

      const metrics = telemetryCollector.getMetrics();
      
      expect(metrics.totalRequests).toBe(5);
      expect(metrics.validatorPassRate).toBe(3/5); // 3 out of 5 passed
      expect(metrics.fallbackRate).toBe(2/5); // 2 out of 5 used fallback
      expect(metrics.boundaryRate).toBe(1/5); // 1 out of 5 used boundary
      expect(metrics.averageLatency).toBe((1000 + 2000 + 1500 + 800 + 3000) / 5);
      expect(metrics.averageRetries).toBe((0 + 1 + 0 + 0 + 2) / 5);
      expect(metrics.averageSentences).toBe((8 + 6 + 7 + 8 + 5) / 5);
      expect(metrics.promptVersionDistribution['v1.2']).toBe(3);
      expect(metrics.promptVersionDistribution['v1']).toBe(2);
    });

    it('should handle empty events list', () => {
      const metrics = telemetryCollector.getMetrics();
      
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.averageLatency).toBe(0);
      expect(metrics.validatorPassRate).toBe(0);
      expect(metrics.fallbackRate).toBe(0);
      expect(metrics.boundaryRate).toBe(0);
      expect(metrics.averageRetries).toBe(0);
      expect(metrics.averageSentences).toBe(0);
      expect(metrics.promptVersionDistribution).toEqual({});
    });
  });

  describe('Event Filtering', () => {
    beforeEach(() => {
      // Record test events with different timestamps
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      
      const events = [
        {
          sessionId: 'session-1',
          userId: 'user-1',
          promptVersion: 'v1.2',
          validatorPassed: true,
          totalSentences: 8,
          latency: 1500,
          retryCount: 0,
          usedFallback: false,
          usedBoundary: false,
          modelUsed: 'gpt-4',
          temperature: 0.7,
          maxTokens: 800,
          timestamp: twoHoursAgo
        },
        {
          sessionId: 'session-2',
          userId: 'user-2',
          promptVersion: 'v1.2',
          validatorPassed: true,
          totalSentences: 8,
          latency: 1500,
          retryCount: 0,
          usedFallback: false,
          usedBoundary: false,
          modelUsed: 'gpt-4',
          temperature: 0.7,
          maxTokens: 800,
          timestamp: oneHourAgo
        },
        {
          sessionId: 'session-3',
          userId: 'user-3',
          promptVersion: 'v1',
          validatorPassed: true,
          totalSentences: 8,
          latency: 1500,
          retryCount: 0,
          usedFallback: false,
          usedBoundary: false,
          modelUsed: 'gpt-4',
          temperature: 0.7,
          maxTokens: 800,
          timestamp: now
        }
      ];

      events.forEach(event => telemetryCollector.recordEvent(event));
    });

    it('should filter events by time range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const recentEvents = telemetryCollector.getEventsInRange(oneHourAgo, now);
      expect(recentEvents.length).toBe(2); // Last 2 events
    });

    it('should filter events by prompt version', () => {
      const v12Events = telemetryCollector.getEventsByPromptVersion('v1.2');
      expect(v12Events.length).toBe(2);
      
      const v1Events = telemetryCollector.getEventsByPromptVersion('v1');
      expect(v1Events.length).toBe(1);
    });

    it('should get recent events', () => {
      const recentEvents = telemetryCollector.getRecentEvents(2);
      expect(recentEvents.length).toBe(2);
    });
  });

  describe('Performance Summary', () => {
    it('should generate performance summary', () => {
      // Record test events
      const events = [
        { promptVersion: 'v1.2', validatorPassed: true, latency: 1000, retryCount: 0, usedFallback: false, usedBoundary: false, totalSentences: 8 },
        { promptVersion: 'v1.2', validatorPassed: false, latency: 2000, retryCount: 1, usedFallback: true, usedBoundary: false, totalSentences: 6 },
        { promptVersion: 'v1', validatorPassed: true, latency: 1500, retryCount: 0, usedFallback: false, usedBoundary: true, totalSentences: 7 }
      ];

      events.forEach((event, index) => {
        telemetryCollector.recordEvent({
          sessionId: `session-${index}`,
          userId: `user-${index}`,
          ...event,
          modelUsed: 'gpt-4',
          temperature: 0.7,
          maxTokens: 800
        });
      });

      const summary = telemetryCollector.getPerformanceSummary();
      
      expect(summary.overall.totalRequests).toBe(3);
      expect(summary.byPromptVersion['v1.2'].totalRequests).toBe(2);
      expect(summary.byPromptVersion['v1'].totalRequests).toBe(1);
    });
  });

  describe('Data Management', () => {
    it('should clear all events', () => {
      // Record some events
      telemetryCollector.recordEvent({
        sessionId: 'session-1',
        userId: 'user-1',
        promptVersion: 'v1.2',
        validatorPassed: true,
        totalSentences: 8,
        latency: 1500,
        retryCount: 0,
        usedFallback: false,
        usedBoundary: false,
        modelUsed: 'gpt-4',
        temperature: 0.7,
        maxTokens: 800
      });

      expect(telemetryCollector.getMetrics().totalRequests).toBe(1);
      
      telemetryCollector.clear();
      expect(telemetryCollector.getMetrics().totalRequests).toBe(0);
    });

    it('should export events as JSON', () => {
      // Record some events
      telemetryCollector.recordEvent({
        sessionId: 'session-1',
        userId: 'user-1',
        promptVersion: 'v1.2',
        validatorPassed: true,
        totalSentences: 8,
        latency: 1500,
        retryCount: 0,
        usedFallback: false,
        usedBoundary: false,
        modelUsed: 'gpt-4',
        temperature: 0.7,
        maxTokens: 800
      });

      const exported = telemetryCollector.exportEvents();
      const parsed = JSON.parse(exported);
      
      expect(parsed.length).toBe(1);
      expect(parsed[0].sessionId).toBe('session-1');
      expect(parsed[0].promptVersion).toBe('v1.2');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors in telemetry', () => {
      telemetryCollector.recordEvent({
        sessionId: 'session-1',
        userId: 'user-1',
        promptVersion: 'v1.2',
        validatorPassed: false,
        totalSentences: 8,
        latency: 1500,
        retryCount: 1,
        usedFallback: true,
        usedBoundary: false,
        validationErrors: ['mirror.partnerA must be exactly 1 sentence.', 'explore must be open-ended (not yes/no).'],
        modelUsed: 'gpt-4',
        temperature: 0.7,
        maxTokens: 800
      });

      const metrics = telemetryCollector.getMetrics();
      expect(metrics.errorRate).toBe(1); // 1 out of 1 had errors
    });
  });
});
