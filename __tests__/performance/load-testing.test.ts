import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { createServer } from '../../services/api/src/m4-safety-privacy-server';

describe('Performance and Load Testing', () => {
  let server: FastifyInstance;
  const authToken = 'Bearer token_userA';

  beforeAll(async () => {
    server = await createServer();
    await server.ready();
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('Concurrent Session Creation', () => {
    it('should handle 10 concurrent session creations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        server.inject({
          method: 'POST',
          url: '/sessions',
          headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json'
          },
          payload: {
            mode: i % 2 === 0 ? 'couple' : 'solo',
            coupleId: i % 2 === 0 ? `couple_${i}` : undefined
          }
        })
      );

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });

      // Check response times (should be under 100ms each)
      const responseTimes = responses.map(r => r.responseTime);
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(avgResponseTime).toBeLessThan(100);
    });
  });

  describe('Message Throughput', () => {
    it('should handle high message throughput', async () => {
      // Create a session first
      const sessionResponse = await server.inject({
        method: 'POST',
        url: '/sessions',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          mode: 'solo'
        }
      });

      const sessionData = JSON.parse(sessionResponse.payload);
      const sessionId = sessionData.sessionId;

      // Send 20 messages concurrently
      const messagePromises = Array.from({ length: 20 }, (_, i) => 
        server.inject({
          method: 'POST',
          url: `/sessions/${sessionId}/messages`,
          headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json'
          },
          payload: {
            sender: 'userA',
            content: `Message ${i + 1}: Testing throughput`,
            clientMessageId: `msg_${i + 1}`
          }
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(messagePromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All messages should be processed
      responses.forEach(response => {
        expect(response.statusCode).toBe(202);
      });

      // Should process 20 messages in under 2 seconds
      expect(totalTime).toBeLessThan(2000);
      
      // Calculate throughput (messages per second)
      const throughput = (20 / totalTime) * 1000;
      expect(throughput).toBeGreaterThan(10); // At least 10 messages per second
    });
  });

  describe('Safety Classification Performance', () => {
    it('should classify content quickly', async () => {
      const testContents = [
        'I feel like we need to talk about our communication',
        'I am so angry I could kill someone right now',
        'I want to kill myself and end it all',
        'We should work on our relationship together',
        'I am feeling depressed and hopeless'
      ];

      const startTime = Date.now();
      
      const promises = testContents.map(content => 
        server.inject({
          method: 'POST',
          url: '/safety/classify',
          headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json'
          },
          payload: {
            content,
            sessionId: 'test_session'
          }
        })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All classifications should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });

      // Should classify 5 messages in under 500ms
      expect(totalTime).toBeLessThan(500);
      
      // Average classification time should be under 100ms
      const avgTime = totalTime / testContents.length;
      expect(avgTime).toBeLessThan(100);
    });
  });

  describe('Long-polling Performance', () => {
    it('should handle multiple long-polling clients efficiently', async () => {
      // Create a session
      const sessionResponse = await server.inject({
        method: 'POST',
        url: '/sessions',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          mode: 'couple',
          coupleId: 'test_couple'
        }
      });

      const sessionData = JSON.parse(sessionResponse.payload);
      const sessionId = sessionData.sessionId;

      // Start 5 long-polling clients
      const longPollPromises = Array.from({ length: 5 }, () => 
        server.inject({
          method: 'GET',
          url: `/sessions/${sessionId}/messages?waitMs=1000`,
          headers: {
            'Authorization': authToken
          }
        })
      );

      // Send a message to trigger notifications
      setTimeout(async () => {
        await server.inject({
          method: 'POST',
          url: `/sessions/${sessionId}/messages`,
          headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json'
          },
          payload: {
            sender: 'userA',
            content: 'Test message for long-polling',
            clientMessageId: 'msg_longpoll'
          }
        });
      }, 100);

      const responses = await Promise.all(longPollPromises);
      
      // All long-polling requests should complete
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during extended operation', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create and destroy 100 sessions
      for (let i = 0; i < 100; i++) {
        const sessionResponse = await server.inject({
          method: 'POST',
          url: '/sessions',
          headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json'
          },
          payload: {
            mode: 'solo'
          }
        });

        const sessionData = JSON.parse(sessionResponse.payload);
        
        // Send a few messages
        for (let j = 0; j < 3; j++) {
          await server.inject({
            method: 'POST',
            url: `/sessions/${sessionData.sessionId}/messages`,
            headers: {
              'Authorization': authToken,
              'Content-Type': 'application/json'
            },
            payload: {
              sender: 'userA',
              content: `Message ${j + 1}`,
              clientMessageId: `msg_${j + 1}`
            }
          });
        }

        // End the session
        await server.inject({
          method: 'POST',
          url: `/sessions/${sessionData.sessionId}/end`,
          headers: {
            'Authorization': authToken
          }
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Response Time Consistency', () => {
    it('should maintain consistent response times under load', async () => {
      const responseTimes: number[] = [];
      
      // Make 50 requests and measure response times
      for (let i = 0; i < 50; i++) {
        const startTime = Date.now();
        
        const response = await server.inject({
          method: 'GET',
          url: '/health',
          headers: {
            'Authorization': authToken
          }
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        expect(response.statusCode).toBe(200);
        responseTimes.push(responseTime);
      }

      // Calculate statistics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avgResponseTime, 2), 0) / responseTimes.length;
      const standardDeviation = Math.sqrt(variance);

      // Average response time should be under 50ms
      expect(avgResponseTime).toBeLessThan(50);
      
      // Max response time should be under 100ms
      expect(maxResponseTime).toBeLessThan(100);
      
      // Standard deviation should be low (consistent performance)
      expect(standardDeviation).toBeLessThan(20);
    });
  });
});
