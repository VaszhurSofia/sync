/**
 * Long-Polling Tests
 * Tests the long-polling functionality with timeout, immediate delivery, and abort handling
 */

import { LongPollManager, LongPollConfig } from '../../services/api/src/lib/longpoll';

describe('Long-Polling Manager', () => {
  let longPollManager: LongPollManager;
  let config: LongPollConfig;

  beforeEach(() => {
    config = {
      maxWaitMs: 5000, // 5 seconds for testing
      heartbeatIntervalMs: 1000, // 1 second heartbeats for testing
      defaultWaitMs: 3000, // 3 seconds default
      maxConcurrentPolls: 10
    };
    
    longPollManager = new LongPollManager(config);
  });

  afterEach(() => {
    longPollManager.stop();
  });

  describe('Basic Long-Polling', () => {
    it('should start and complete a long-poll request', async () => {
      const sessionId = 'test-session-1';
      const clientId = 'test-client-1';
      const waitMs = 2000;

      const startTime = Date.now();
      const result = await longPollManager.startPoll(sessionId, clientId, waitMs);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result.messages).toEqual([]);
      expect(result.timestamp).toBeDefined();
      expect(endTime - startTime).toBeGreaterThanOrEqual(waitMs - 100); // Allow some tolerance
    });

    it('should respect max wait time', async () => {
      const sessionId = 'test-session-2';
      const clientId = 'test-client-2';
      const waitMs = 10000; // Request 10 seconds, but max is 5

      const startTime = Date.now();
      const result = await longPollManager.startPoll(sessionId, clientId, waitMs);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThanOrEqual(config.maxWaitMs + 100);
      expect(endTime - startTime).toBeGreaterThanOrEqual(config.maxWaitMs - 100);
    });

    it('should handle multiple concurrent polls', async () => {
      const sessionId = 'test-session-3';
      const waitMs = 2000;

      const promises = [];
      for (let i = 0; i < 3; i++) {
        const clientId = `test-client-${i}`;
        promises.push(longPollManager.startPoll(sessionId, clientId, waitMs));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.messages).toEqual([]);
        expect(result.timestamp).toBeDefined();
      });
    });
  });

  describe('Message Delivery', () => {
    it('should deliver message immediately to waiting polls', async () => {
      const sessionId = 'test-session-4';
      const clientId = 'test-client-4';
      const waitMs = 5000;

      // Start long-poll
      const pollPromise = longPollManager.startPoll(sessionId, clientId, waitMs);

      // Wait a bit, then deliver message
      setTimeout(() => {
        const message = {
          id: 'msg-1',
          content: 'Test message',
          sender: 'userA',
          createdAt: new Date()
        };
        longPollManager.deliverMessage(sessionId, message);
      }, 500);

      const result = await pollPromise;

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('msg-1');
      expect(result.messages[0].content).toBe('Test message');
    });

    it('should deliver message to all waiting polls', async () => {
      const sessionId = 'test-session-5';
      const waitMs = 5000;

      // Start multiple polls
      const pollPromises = [];
      for (let i = 0; i < 3; i++) {
        const clientId = `test-client-${i}`;
        pollPromises.push(longPollManager.startPoll(sessionId, clientId, waitMs));
      }

      // Deliver message
      setTimeout(() => {
        const message = {
          id: 'msg-2',
          content: 'Broadcast message',
          sender: 'userB',
          createdAt: new Date()
        };
        longPollManager.deliverMessage(sessionId, message);
      }, 500);

      const results = await Promise.all(pollPromises);

      results.forEach(result => {
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].id).toBe('msg-2');
        expect(result.messages[0].content).toBe('Broadcast message');
      });
    });

    it('should not deliver to polls from different sessions', async () => {
      const sessionId1 = 'test-session-6a';
      const sessionId2 = 'test-session-6b';
      const clientId1 = 'test-client-6a';
      const clientId2 = 'test-client-6b';
      const waitMs = 3000;

      // Start polls for different sessions
      const poll1Promise = longPollManager.startPoll(sessionId1, clientId1, waitMs);
      const poll2Promise = longPollManager.startPoll(sessionId2, clientId2, waitMs);

      // Deliver message to session 1 only
      setTimeout(() => {
        const message = {
          id: 'msg-3',
          content: 'Session 1 message',
          sender: 'userA',
          createdAt: new Date()
        };
        longPollManager.deliverMessage(sessionId1, message);
      }, 500);

      const [result1, result2] = await Promise.all([poll1Promise, poll2Promise]);

      expect(result1.messages).toHaveLength(1);
      expect(result1.messages[0].content).toBe('Session 1 message');
      
      expect(result2.messages).toEqual([]); // Should timeout with no messages
    });
  });

  describe('Heartbeat', () => {
    it('should send heartbeat at regular intervals', async () => {
      const sessionId = 'test-session-7';
      const clientId = 'test-client-7';
      const waitMs = 3000; // Longer than heartbeat interval

      const result = await longPollManager.startPoll(sessionId, clientId, waitMs);

      // Should receive heartbeat response
      expect(result.heartbeat).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('should not send heartbeat if poll completes before interval', async () => {
      const sessionId = 'test-session-8';
      const clientId = 'test-client-8';
      const waitMs = 500; // Shorter than heartbeat interval

      const result = await longPollManager.startPoll(sessionId, clientId, waitMs);

      // Should timeout normally, not heartbeat
      expect(result.heartbeat).toBeUndefined();
      expect(result.messages).toEqual([]);
    });
  });

  describe('Client Abort', () => {
    it('should abort specific client poll', async () => {
      const sessionId = 'test-session-9';
      const clientId = 'test-client-9';
      const waitMs = 5000;

      const pollPromise = longPollManager.startPoll(sessionId, clientId, waitMs);

      // Abort after 1 second
      setTimeout(() => {
        longPollManager.abortPoll(sessionId, clientId);
      }, 1000);

      await expect(pollPromise).rejects.toThrow('Client aborted long-poll');
    });

    it('should abort all polls for a session', async () => {
      const sessionId = 'test-session-10';
      const waitMs = 5000;

      const pollPromises = [];
      for (let i = 0; i < 3; i++) {
        const clientId = `test-client-${i}`;
        pollPromises.push(longPollManager.startPoll(sessionId, clientId, waitMs));
      }

      // Abort all polls after 1 second
      setTimeout(() => {
        longPollManager.abortAllPolls(sessionId);
      }, 1000);

      // All polls should be aborted
      for (const promise of pollPromises) {
        await expect(promise).rejects.toThrow('Client aborted long-poll');
      }
    });

    it('should not affect polls from other sessions when aborting', async () => {
      const sessionId1 = 'test-session-11a';
      const sessionId2 = 'test-session-11b';
      const clientId1 = 'test-client-11a';
      const clientId2 = 'test-client-11b';
      const waitMs = 3000;

      const poll1Promise = longPollManager.startPoll(sessionId1, clientId1, waitMs);
      const poll2Promise = longPollManager.startPoll(sessionId2, clientId2, waitMs);

      // Abort only session 1
      setTimeout(() => {
        longPollManager.abortAllPolls(sessionId1);
      }, 1000);

      // Poll 1 should be aborted
      await expect(poll1Promise).rejects.toThrow('Client aborted long-poll');
      
      // Poll 2 should complete normally
      const result2 = await poll2Promise;
      expect(result2.messages).toEqual([]);
    });
  });

  describe('Concurrent Poll Limits', () => {
    it('should enforce max concurrent polls per session', async () => {
      const sessionId = 'test-session-12';
      const waitMs = 5000;

      // Start polls up to the limit
      const pollPromises = [];
      for (let i = 0; i < config.maxConcurrentPolls; i++) {
        const clientId = `test-client-${i}`;
        pollPromises.push(longPollManager.startPoll(sessionId, clientId, waitMs));
      }

      // Try to start one more poll (should fail)
      const extraClientId = 'test-client-extra';
      await expect(
        longPollManager.startPoll(sessionId, extraClientId, waitMs)
      ).rejects.toThrow('Too many concurrent polls for this session');

      // Clean up
      longPollManager.abortAllPolls(sessionId);
    });
  });

  describe('Stale Poll Cleanup', () => {
    it('should clean up stale polls', async () => {
      const sessionId = 'test-session-13';
      const clientId = 'test-client-13';
      const waitMs = 1000; // Short wait

      // Start a poll
      const pollPromise = longPollManager.startPoll(sessionId, clientId, waitMs);

      // Wait for it to complete
      await pollPromise;

      // Manually trigger cleanup
      longPollManager.cleanupStalePolls();

      // Should have no active polls
      expect(longPollManager.getActivePollCount(sessionId)).toBe(0);
    });
  });

  describe('Watermark and Ordering', () => {
    it('should preserve message ordering with watermark', async () => {
      const sessionId = 'test-session-14';
      const clientId = 'test-client-14';
      const waitMs = 3000;

      const pollPromise = longPollManager.startPoll(sessionId, clientId, waitMs, '2024-01-01T00:00:00Z');

      // Deliver multiple messages
      setTimeout(() => {
        const message1 = {
          id: 'msg-1',
          content: 'First message',
          sender: 'userA',
          createdAt: new Date('2024-01-01T00:01:00Z')
        };
        longPollManager.deliverMessage(sessionId, message1);
      }, 500);

      const result = await pollPromise;

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('msg-1');
      expect(result.watermark).toBeDefined();
    });

    it('should handle after parameter correctly', async () => {
      const sessionId = 'test-session-15';
      const clientId = 'test-client-15';
      const waitMs = 2000;
      const after = '2024-01-01T00:00:00Z';

      const result = await longPollManager.startPoll(sessionId, clientId, waitMs, after);

      expect(result.watermark).toBe(after);
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const defaultConfig = longPollManager.getConfig();
      
      expect(defaultConfig.maxWaitMs).toBe(config.maxWaitMs);
      expect(defaultConfig.heartbeatIntervalMs).toBe(config.heartbeatIntervalMs);
      expect(defaultConfig.defaultWaitMs).toBe(config.defaultWaitMs);
      expect(defaultConfig.maxConcurrentPolls).toBe(config.maxConcurrentPolls);
    });

    it('should update configuration', () => {
      const newConfig = {
        maxWaitMs: 10000,
        heartbeatIntervalMs: 2000
      };

      longPollManager.updateConfig(newConfig);
      const updatedConfig = longPollManager.getConfig();

      expect(updatedConfig.maxWaitMs).toBe(10000);
      expect(updatedConfig.heartbeatIntervalMs).toBe(2000);
      expect(updatedConfig.defaultWaitMs).toBe(config.defaultWaitMs); // Should remain unchanged
    });
  });

  describe('Monitoring', () => {
    it('should track active polls', async () => {
      const sessionId = 'test-session-16';
      const clientId = 'test-client-16';
      const waitMs = 3000;

      expect(longPollManager.getActivePollCount(sessionId)).toBe(0);

      const pollPromise = longPollManager.startPoll(sessionId, clientId, waitMs);

      expect(longPollManager.getActivePollCount(sessionId)).toBe(1);

      await pollPromise;

      expect(longPollManager.getActivePollCount(sessionId)).toBe(0);
    });

    it('should provide active polls information', async () => {
      const sessionId = 'test-session-17';
      const clientId = 'test-client-17';
      const waitMs = 3000;

      const pollPromise = longPollManager.startPoll(sessionId, clientId, waitMs);

      const activePolls = longPollManager.getAllActivePolls();

      expect(activePolls).toHaveLength(1);
      expect(activePolls[0].sessionId).toBe(sessionId);
      expect(activePolls[0].clientId).toBe(clientId);
      expect(activePolls[0].waitMs).toBe(waitMs);

      await pollPromise;
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid waitMs gracefully', async () => {
      const sessionId = 'test-session-18';
      const clientId = 'test-client-18';
      const waitMs = -1000; // Invalid negative wait time

      // Should still work but use max wait time
      const result = await longPollManager.startPoll(sessionId, clientId, waitMs);

      expect(result).toBeDefined();
      expect(result.messages).toEqual([]);
    });

    it('should handle delivery errors gracefully', async () => {
      const sessionId = 'test-session-19';
      const clientId = 'test-client-19';
      const waitMs = 3000;

      // Start poll
      const pollPromise = longPollManager.startPoll(sessionId, clientId, waitMs);

      // Try to deliver invalid message (should not crash)
      setTimeout(() => {
        longPollManager.deliverMessage(sessionId, null as any);
      }, 500);

      const result = await pollPromise;

      // Should still complete normally
      expect(result).toBeDefined();
    });
  });

  describe('Race Conditions', () => {
    it('should handle race condition between message delivery and timeout', async () => {
      const sessionId = 'test-session-20';
      const clientId = 'test-client-20';
      const waitMs = 2000;

      const pollPromise = longPollManager.startPoll(sessionId, clientId, waitMs);

      // Deliver message at the same time as timeout
      setTimeout(() => {
        const message = {
          id: 'msg-race',
          content: 'Race condition message',
          sender: 'userA',
          createdAt: new Date()
        };
        longPollManager.deliverMessage(sessionId, message);
      }, waitMs - 100);

      const result = await pollPromise;

      // Should either get the message or timeout, but not crash
      expect(result).toBeDefined();
      expect(result.messages !== undefined || result.heartbeat !== undefined).toBe(true);
    });

    it('should handle multiple rapid message deliveries', async () => {
      const sessionId = 'test-session-21';
      const clientId = 'test-client-21';
      const waitMs = 3000;

      const pollPromise = longPollManager.startPoll(sessionId, clientId, waitMs);

      // Deliver multiple messages rapidly
      setTimeout(() => {
        for (let i = 0; i < 5; i++) {
          const message = {
            id: `msg-${i}`,
            content: `Message ${i}`,
            sender: 'userA',
            createdAt: new Date()
          };
          longPollManager.deliverMessage(sessionId, message);
        }
      }, 500);

      const result = await pollPromise;

      // Should get the first message delivered
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('msg-0');
    });
  });
});
