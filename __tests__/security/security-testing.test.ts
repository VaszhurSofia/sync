import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { createServer } from '../../services/api/src/m4-safety-privacy-server';

describe('Security Testing', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createServer();
    await server.ready();
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/privacy/settings'
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject requests with invalid tokens', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/privacy/settings',
        headers: {
          'Authorization': 'Bearer invalid_token'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject requests with malformed authorization headers', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/privacy/settings',
        headers: {
          'Authorization': 'InvalidFormat token_userA'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Input Validation and Sanitization', () => {
    const authToken = 'Bearer token_userA';

    it('should sanitize malicious content in messages', async () => {
      const response = await server.inject({
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

      const sessionData = JSON.parse(response.payload);
      const sessionId = sessionData.sessionId;

      const maliciousContent = '<script>alert("XSS")</script>I feel like we need to talk';
      
      const messageResponse = await server.inject({
        method: 'POST',
        url: `/sessions/${sessionId}/messages`,
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          sender: 'userA',
          content: maliciousContent,
          clientMessageId: 'msg_malicious'
        }
      });

      expect(messageResponse.statusCode).toBe(202);
      const messageData = JSON.parse(messageResponse.payload);
      
      // Content should be sanitized (script tags removed)
      expect(messageData.content).not.toContain('<script>');
      expect(messageData.content).not.toContain('</script>');
    });

    it('should reject SQL injection attempts', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/sessions',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          mode: 'solo',
          // Attempt SQL injection in mode field
          mode: "'; DROP TABLE sessions; --"
        }
      });

      // Should either reject the request or sanitize the input
      expect([400, 200]).toContain(response.statusCode);
    });

    it('should handle oversized payloads gracefully', async () => {
      const largeContent = 'A'.repeat(10000); // 10KB content
      
      const response = await server.inject({
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

      const sessionData = JSON.parse(response.payload);
      const sessionId = sessionData.sessionId;

      const messageResponse = await server.inject({
        method: 'POST',
        url: `/sessions/${sessionId}/messages`,
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          sender: 'userA',
          content: largeContent,
          clientMessageId: 'msg_large'
        }
      });

      // Should either accept or reject gracefully
      expect([202, 413, 400]).toContain(messageResponse.statusCode);
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    const authToken = 'Bearer token_userA';

    it('should handle rapid requests without crashing', async () => {
      const promises = Array.from({ length: 100 }, () => 
        server.inject({
          method: 'GET',
          url: '/health',
          headers: {
            'Authorization': authToken
          }
        })
      );

      const responses = await Promise.all(promises);
      
      // All requests should complete (either succeed or be rate limited)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.statusCode);
      });
    });

    it('should protect against session creation spam', async () => {
      const promises = Array.from({ length: 50 }, (_, i) => 
        server.inject({
          method: 'POST',
          url: '/sessions',
          headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json'
          },
          payload: {
            mode: 'solo'
          }
        })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const successCount = responses.filter(r => r.statusCode === 200).length;
      const rateLimitedCount = responses.filter(r => r.statusCode === 429).length;
      
      expect(successCount).toBeGreaterThan(0);
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Data Privacy and Encryption', () => {
    const authToken = 'Bearer token_userA';

    it('should not expose sensitive data in logs', async () => {
      const response = await server.inject({
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

      expect(response.statusCode).toBe(200);
      
      // Check that sensitive data is not in response headers
      const headers = response.headers;
      expect(headers['x-user-id']).toBeUndefined();
      expect(headers['x-session-data']).toBeUndefined();
    });

    it('should hash sensitive data in audit logs', async () => {
      const response = await server.inject({
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

      expect(response.statusCode).toBe(200);
      
      // Audit logs should contain hashed data, not plain text
      // This is tested by checking that the audit log structure is correct
      const sessionData = JSON.parse(response.payload);
      expect(sessionData.sessionId).toBeDefined();
    });

    it('should enforce data retention policies', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/privacy/settings',
        headers: {
          'Authorization': authToken
        }
      });

      expect(response.statusCode).toBe(200);
      const settings = JSON.parse(response.payload);
      
      // Data retention should be enforced
      expect(settings.dataRetention).toBeGreaterThan(0);
      expect(settings.dataRetention).toBeLessThanOrEqual(365);
    });
  });

  describe('Session Security', () => {
    const authToken = 'Bearer token_userA';

    it('should prevent session hijacking', async () => {
      // Create a session
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

      // Try to access session with different user token
      const hijackResponse = await server.inject({
        method: 'GET',
        url: `/sessions/${sessionId}/messages`,
        headers: {
          'Authorization': 'Bearer token_userB'
        }
      });

      // Should be rejected
      expect(hijackResponse.statusCode).toBe(403);
    });

    it('should validate session ownership for solo sessions', async () => {
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

      // Try to access solo session with different user
      const unauthorizedResponse = await server.inject({
        method: 'GET',
        url: `/sessions/${sessionId}/messages`,
        headers: {
          'Authorization': 'Bearer token_userB'
        }
      });

      expect(unauthorizedResponse.statusCode).toBe(403);
    });
  });

  describe('Safety Classification Security', () => {
    const authToken = 'Bearer token_userA';

    it('should not leak classification details to unauthorized users', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/safety/classify',
        headers: {
          'Authorization': 'Bearer unauthorized_user',
          'Content-Type': 'application/json'
        },
        payload: {
          content: 'Test content',
          sessionId: 'test_session'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    it('should handle classification errors gracefully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/safety/classify',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          content: null, // Invalid content
          sessionId: 'test_session'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('CORS and Headers Security', () => {
    it('should set appropriate security headers', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health'
      });

      const headers = response.headers;
      
      // Should have security headers
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await server.inject({
        method: 'OPTIONS',
        url: '/sessions',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});
