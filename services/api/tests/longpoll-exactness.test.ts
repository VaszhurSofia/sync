/**
 * Long-Poll Exactness and Abort Handling Tests
 * Tests timeout behavior, immediate return on new data, abort cancellation, and ordering
 */

import { LongPollManager, LongPollConfig } from '../src/lib/longpoll';

describe('Long-Poll Exactness and Abort Handling', () => {
  let longPollManager: LongPollManager;
  let config: LongPollConfig;

  beforeEach(() => {
    config = {
      maxWaitMs: 30000,
      heartbeatIntervalMs: 5000,
      defaultWaitMs: 25000,
      maxConcurrentPolls: 100
    };
    longPollManager = new LongPollManager(config);
  });

  afterEach(() => {
    longPollManager.stop();
  });

  describe('Timeout Behavior', () => {
    it('should resolve empty poll at timeout', async () => {
      const sessionId = 'session-123';
      const clientId = 'client-456';
      const waitMs = 1000; // 1 second for quick test

      const startTime = Date.now();
      const result = await longPollManager.startPoll(sessionId, clientId, waitMs);
      const endTime = Date.now();

      expect(result.messages).toEqual([]);
      expect(result.timestamp).toBeDefined();
      expect(endTime - startTime).toBeGreaterThanOrEqual(waitMs);
      expect(endTime - startTime).toBeLessThan(waitMs + 100); // Allow 100ms tolerance
    });

    it('should respect maximum wait time', async () => {
      const sessionId = 'session-123';
      const clientId = 'client-456';
      const waitMs = 60000; // Request 60 seconds
      const maxWaitMs = 5000; // But max is 5 seconds

      const startTime = Date.now();
      const result = await longPollManager.startPoll(sessionId, clientId, waitMs);
      const endTime = Date.now();

      expect(result.messages).toEqual([]);
      expect(endTime - startTime).toBeGreaterThanOrEqual(maxWaitMs);
      expect(endTime - startTime).toBeLessThan(maxWaitMs + 100);
    });

    it('should handle multiple concurrent timeouts', async () => {
      const sessionId = 'session-123';
      const waitMs = 1000;
      const promises: Promise<any>[] = [];

      // Start multiple polls
      for (let i = 0; i < 5; i++) {
        promises.push(longPollManager.startPoll(sessionId, `client-${i}`, waitMs));
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.messages).toEqual([]);
        expect(result.timestamp).toBeDefined();
      });

      expect(endTime - startTime).toBeGreaterThanOrEqual(waitMs);
      expect(endTime - startTime).toBeLessThan(waitMs + 200); // Allow tolerance for multiple promises
    });
  });

  describe('Immediate Return on New Data', () => {
    it('should return immediately when message is delivered', async () => {
      const sessionId = 'session-123';
      const clientId = 'client-456';
      const waitMs = 10000; // 10 second wait
      const testMessage = {
        id: 'msg-123',
        sender: 'userA',
        content: 'Test message',
        createdAt: new Date()
      };

      // Start long-poll
      const pollPromise = longPollManager.startPoll(sessionId, clientId, waitMs);

      // Wait a bit then deliver message
      await new Promise(resolve => setTimeout(resolve, 100));
      longPollManager.deliverMessage(sessionId, testMessage);

      const startTime = Date.now();
      const result = await pollPromise;
      const endTime = Date.now();

      expect(result.messages).toEqual([testMessage]);
      expect(result.timestamp).toBeDefined();
      expect(result.watermark).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should return quickly
    });

    it('should deliver message to all waiting polls', async () => {
      const sessionId = 'session-123';
      const waitMs = 10000;
      const testMessage = {
        id: 'msg-123',
        sender: 'userA',
        content: 'Test message',
        createdAt: new Date()
      };

      // Start multiple polls
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(longPollManager.startPoll(sessionId, `client-${i}`, waitMs));
      }

      // Wait a bit then deliver message
      await new Promise(resolve => setTimeout(resolve, 100));
      longPollManager.deliverMessage(sessionId, testMessage);

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.messages).toEqual([testMessage]);
        expect(result.timestamp).toBeDefined();
      });
    });

    it('should handle multiple messages in sequence', async () => {
      const sessionId = 'session-123';
      const clientId = 'client-456';
      const waitMs = 10000;

      const messages = [
        { id: 'msg-1', sender: 'userA', content: 'First message', createdAt: new Date() },
        { id: 'msg-2', sender: 'userB', content: 'Second message', createdAt: new Date() }
      ];

      // Start long-poll
      const pollPromise = longPollManager.startPoll(sessionId, clientId, waitMs);

      // Deliver first message
      await new Promise(resolve => setTimeout(resolve, 100));
      longPollManager.deliverMessage(sessionId, messages[0]);

      const result = await pollPromise;

      expect(result.messages).toEqual([messages[0]]);
      expect(result.messages).toHaveLength(1);
    });
  });

  describe('Abort Handling', () => {
    it('should abort specific client poll', async () => {
      const sessionId = 'session-123';
      const clientId = 'client-456';
      const waitMs = 10000;

      // Start long-poll
      const pollPromise = longPollManager.startPoll(sessionId, clientId, waitMs);

      // Wait a bit then abort
      await new Promise(resolve => setTimeout(resolve, 100));
      const aborted = longPollManager.abortPoll(sessionId, clientId);

      expect(aborted).toBe(true);

      // Poll should reject with abort error
      await expect(pollPromise).rejects.toThrow('Client aborted long-poll');
    });

    it('should return false when aborting non-existent poll', () => {
      const sessionId = 'session-123';
      const clientId = 'non-existent';

      const aborted = longPollManager.abortPoll(sessionId, clientId);

      expect(aborted).toBe(false);
    });

    it('should abort all polls for a session', async () => {
      const sessionId = 'session-123';
      const waitMs = 10000;

      // Start multiple polls
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(longPollManager.startPoll(sessionId, `client-${i}`, waitMs));
      }

      // Wait a bit then abort all
      await new Promise(resolve => setTimeout(resolve, 100));
      longPollManager.abortAllPolls(sessionId);

      // All polls should reject
      for (const promise of promises) {
        await expect(promise).rejects.toThrow('Client aborted long-poll');
      }
    });

    it('should handle abort after timeout has already resolved', async () => {
      const sessionId = 'session-123';
      const clientId = 'client-456';
      const waitMs = 1000; // Short wait

      // Start long-poll and wait for timeout
      const pollPromise = longPollManager.startPoll(sessionId, clientId, waitMs);
      const result = await pollPromise;

      expect(result.messages).toEqual([]);

      // Try to abort after timeout (should return false)
      const aborted = longPollManager.abortPoll(sessionId, clientId);
      expect(aborted).toBe(false);
    });
  });

  describe('Ordering and Watermark', () => {
    it('should preserve message ordering with watermark', async () => {
      const sessionId = 'session-123';
      const clientId = 'client-456';
      const waitMs = 10000;
      const after = '2024-01-01T00:00:00Z';

      const testMessage = {
        id: 'msg-123',
        sender: 'userA',
        content: 'Test message',
        createdAt: new Date('2024-01-01T00:01:00Z')
      };

      // Start long-poll with after parameter
      const pollPromise = longPollManager.startPoll(sessionId, clientId, waitMs, after);

      // Deliver message
      await new Promise(resolve => setTimeout(resolve, 100));
      longPollManager.deliverMessage(sessionId, testMessage);

      const result = await pollPromise;

      expect(result.messages).toEqual([testMessage]);
      expect(result.watermark).toBeDefined();
      expect(result.watermark).toBe(testMessage.createdAt.toISOString());
    });

    it('should handle multiple polls with different after timestamps', async () => {
      const sessionId = 'session-123';
      const waitMs = 10000;

      const testMessage = {
        id: 'msg-123',
        sender: 'userA',
        content: 'Test message',
        createdAt: new Date()
      };

      // Start polls with different after timestamps
      const poll1 = longPollManager.startPoll(sessionId, 'client-1', waitMs, '2024-01-01T00:00:00Z');
      const poll2 = longPollManager.startPoll(sessionId, 'client-2', waitMs, '2024-01-01T00:01:00Z');

      // Deliver message
      await new Promise(resolve => setTimeout(resolve, 100));
      longPollManager.deliverMessage(sessionId, testMessage);

      const [result1, result2] = await Promise.all([poll1, poll2]);

      // Both should receive the message
      expect(result1.messages).toEqual([testMessage]);
      expect(result2.messages).toEqual([testMessage]);
      expect(result1.watermark).toBeDefined();
      expect(result2.watermark).toBeDefined();
    });
  });

  describe('Concurrent Poll Limits', () => {
    it('should enforce maximum concurrent polls per session', async () => {
      const sessionId = 'session-123';
      const waitMs = 10000;
      const maxConcurrentPolls = 2;

      // Create manager with low limit
      const limitedManager = new LongPollManager({
        ...config,
        maxConcurrentPolls
      });

      // Start polls up to limit
      const promises = [];
      for (let i = 0; i < maxConcurrentPolls; i++) {
        promises.push(limitedManager.startPoll(sessionId, `client-${i}`, waitMs));
      }

      // Try to start one more (should fail)
      await expect(limitedManager.startPoll(sessionId, 'client-excess', waitMs))
        .rejects.toThrow('Too many concurrent polls for this session');

      // Clean up
      limitedManager.stop();
    });

    it('should allow polls for different sessions', async () => {
      const session1 = 'session-1';
      const session2 = 'session-2';
      const waitMs = 1000;

      // Start polls for different sessions
      const poll1 = longPollManager.startPoll(session1, 'client-1', waitMs);
      const poll2 = longPollManager.startPoll(session2, 'client-1', waitMs);

      // Both should succeed
      const [result1, result2] = await Promise.all([poll1, poll2]);

      expect(result1.messages).toEqual([]);
      expect(result2.messages).toEqual([]);
    });
  });

  describe('Heartbeat Functionality', () => {
    it('should send heartbeats at configured interval', async () => {
      const sessionId = 'session-123';
      const clientId = 'client-456';
      const waitMs = 10000;
      const heartbeatIntervalMs = 1000;

      // Create manager with short heartbeat interval
      const heartbeatManager = new LongPollManager({
        ...config,
        heartbeatIntervalMs
      });

      // Start long-poll
      const pollPromise = heartbeatManager.startPoll(sessionId, clientId, waitMs);

      // Wait for heartbeat
      await new Promise(resolve => setTimeout(resolve, heartbeatIntervalMs + 100));

      const result = await pollPromise;

      expect(result.heartbeat).toBe(true);
      expect(result.timestamp).toBeDefined();

      heartbeatManager.stop();
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should clean up stale polls', async () => {
      const sessionId = 'session-123';
      const waitMs = 1000;
      const maxWaitMs = 500;

      // Create manager with short max wait
      const cleanupManager = new LongPollManager({
        ...config,
        maxWaitMs
      });

      // Start poll
      const pollPromise = cleanupManager.startPoll(sessionId, 'client-1', waitMs);

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, maxWaitMs + 100));

      // Poll should have been cleaned up
      expect(cleanupManager.getActivePollCount(sessionId)).toBe(0);

      cleanupManager.stop();
    });

    it('should track active poll count correctly', () => {
      const sessionId = 'session-123';
      const waitMs = 10000;

      expect(longPollManager.getActivePollCount(sessionId)).toBe(0);

      // Start polls
      longPollManager.startPoll(sessionId, 'client-1', waitMs);
      longPollManager.startPoll(sessionId, 'client-2', waitMs);

      expect(longPollManager.getActivePollCount(sessionId)).toBe(2);

      // Abort one
      longPollManager.abortPoll(sessionId, 'client-1');

      expect(longPollManager.getActivePollCount(sessionId)).toBe(1);
    });

    it('should provide active poll information', () => {
      const sessionId = 'session-123';
      const waitMs = 10000;

      // Start poll
      longPollManager.startPoll(sessionId, 'client-1', waitMs, '2024-01-01T00:00:00Z');

      const activePolls = longPollManager.getAllActivePolls();

      expect(activePolls).toHaveLength(1);
      expect(activePolls[0]).toMatchObject({
        sessionId,
        clientId: 'client-1',
        waitMs,
        after: '2024-01-01T00:00:00Z'
      });
      expect(activePolls[0].startTime).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during message delivery', async () => {
      const sessionId = 'session-123';
      const clientId = 'client-456';
      const waitMs = 10000;

      // Start poll
      const pollPromise = longPollManager.startPoll(sessionId, clientId, waitMs);

      // Mock resolve to throw error
      const polls = (longPollManager as any).activePolls.get(sessionId);
      if (polls && polls.length > 0) {
        const originalResolve = polls[0].resolve;
        polls[0].resolve = jest.fn().mockImplementation(() => {
          throw new Error('Delivery error');
        });
      }

      // Deliver message (should handle error gracefully)
      longPollManager.deliverMessage(sessionId, { id: 'msg-123' });

      // Poll should still resolve (timeout)
      const result = await pollPromise;
      expect(result.messages).toEqual([]);
    });

    it('should handle abort errors gracefully', () => {
      const sessionId = 'session-123';
      const clientId = 'client-456';

      // Try to abort non-existent poll
      const aborted = longPollManager.abortPoll(sessionId, clientId);

      expect(aborted).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        maxWaitMs: 15000,
        heartbeatIntervalMs: 3000
      };

      longPollManager.updateConfig(newConfig);
      const currentConfig = longPollManager.getConfig();

      expect(currentConfig.maxWaitMs).toBe(15000);
      expect(currentConfig.heartbeatIntervalMs).toBe(3000);
    });

    it('should restart heartbeat when interval changes', () => {
      const originalStop = longPollManager.stop;
      const stopSpy = jest.spyOn(longPollManager, 'stop');

      longPollManager.updateConfig({ heartbeatIntervalMs: 2000 });

      expect(stopSpy).toHaveBeenCalled();
    });
  });
});
