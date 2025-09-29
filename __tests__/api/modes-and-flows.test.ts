import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { createServer } from '../../services/api/src/m4-safety-privacy-server';

describe('Modes and Flows Integration Tests', () => {
  let server: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    server = await createServer();
    await server.ready();
    
    // Mock authentication
    authToken = 'Bearer token_userA';
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('Session Mode Selection', () => {
    it('should create couple session successfully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/sessions',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          mode: 'couple',
          coupleId: '123e4567-e89b-12d3-a456-426614174000'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.mode).toBe('couple');
      expect(data.turnState).toBe('awaitingA');
      expect(data.safetyLevel).toBe('low');
    });

    it('should create solo session successfully', async () => {
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
      const data = JSON.parse(response.payload);
      expect(data.mode).toBe('solo');
      expect(data.turnState).toBe('ai_reflect');
      expect(data.safetyLevel).toBe('low');
    });

    it('should reject couple session without coupleId', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/sessions',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          mode: 'couple'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Message Flow - Couple Mode', () => {
    let coupleSessionId: string;

    beforeAll(async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/sessions',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          mode: 'couple',
          coupleId: '123e4567-e89b-12d3-a456-426614174000'
        }
      });

      const data = JSON.parse(response.payload);
      coupleSessionId = data.sessionId;
    });

    it('should allow userA to send first message', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/sessions/${coupleSessionId}/messages`,
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          sender: 'userA',
          content: 'I feel like we need to talk about our communication',
          clientMessageId: 'msg_1'
        }
      });

      expect(response.statusCode).toBe(202);
      const data = JSON.parse(response.payload);
      expect(data.safetyLevel).toBe('low');
      expect(data.flagged).toBe(false);
    });

    it('should enforce turn-taking - userA cannot send again', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/sessions/${coupleSessionId}/messages`,
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          sender: 'userA',
          content: 'I want to add more',
          clientMessageId: 'msg_2'
        }
      });

      expect(response.statusCode).toBe(409);
      const data = JSON.parse(response.payload);
      expect(data.error).toBe('TURN_LOCKED');
    });

    it('should allow userB to respond', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/sessions/${coupleSessionId}/messages`,
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          sender: 'userB',
          content: 'I agree, we should work on our communication',
          clientMessageId: 'msg_3'
        }
      });

      expect(response.statusCode).toBe(202);
    });
  });

  describe('Message Flow - Solo Mode', () => {
    let soloSessionId: string;

    beforeAll(async () => {
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

      const data = JSON.parse(response.payload);
      soloSessionId = data.sessionId;
    });

    it('should allow free-form messaging in solo mode', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/sessions/${soloSessionId}/messages`,
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          sender: 'userA',
          content: 'I need to reflect on my feelings about our relationship',
          clientMessageId: 'msg_solo_1'
        }
      });

      expect(response.statusCode).toBe(202);
      const data = JSON.parse(response.payload);
      expect(data.safetyLevel).toBe('low');
    });

    it('should allow multiple messages in solo mode', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/sessions/${soloSessionId}/messages`,
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          sender: 'userA',
          content: 'I think I understand my feelings better now',
          clientMessageId: 'msg_solo_2'
        }
      });

      expect(response.statusCode).toBe(202);
    });
  });

  describe('Safety Classification', () => {
    it('should classify normal content as low risk', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/safety/classify',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          content: 'I feel like we need to talk about our communication',
          sessionId: 'test_session'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.classification.level).toBe('low');
      expect(data.classification.action).toBe('allow');
    });

    it('should classify high-risk content appropriately', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/safety/classify',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          content: 'I am so angry I could kill someone right now',
          sessionId: 'test_session'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.classification.level).toBe('high');
      expect(data.classification.action).toBe('block');
    });

    it('should block critical safety content', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/safety/classify',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          content: 'I want to kill myself and end it all',
          sessionId: 'test_session'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.classification.level).toBe('critical');
      expect(data.classification.action).toBe('emergency');
    });
  });

  describe('Privacy Controls', () => {
    it('should get privacy settings', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/privacy/settings',
        headers: {
          'Authorization': authToken
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.dataRetention).toBe(30);
      expect(data.encryptionLevel).toBe('enhanced');
      expect(data.auditLogging).toBe(true);
    });

    it('should update privacy settings', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/privacy/settings',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          dataRetention: 60,
          auditLogging: true,
          dataAnonymization: true
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
    });

    it('should export user data', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/privacy/export-data',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {}
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.exportId).toBeDefined();
      expect(data.downloadUrl).toBeDefined();
      expect(data.expiresAt).toBeDefined();
    });

    it('should delete user data', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/privacy/delete-data',
        headers: {
          'Authorization': authToken
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
    });
  });

  describe('Solo to Couple Conversion', () => {
    it('should convert solo session to couple session', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/sessions/solo_session_id/convert-to-couple',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          consent: true,
          redactedSummary: 'I have been reflecting on our communication patterns and think we need to work on listening to each other better.',
          privacySettings: {
            dataRetention: 30,
            auditLogging: true
          }
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.newCoupleSessionId).toBeDefined();
      expect(data.privacy).toBeDefined();
    });

    it('should reject conversion without consent', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/sessions/solo_session_id/convert-to-couple',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          consent: false,
          redactedSummary: 'Test summary'
        }
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.error).toBe('CONSENT_REQUIRED');
    });
  });

  describe('Boundary Resources', () => {
    it('should provide emergency resources', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/boundary/resources'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.region).toBe('EU');
      expect(data.safetyLevel).toBe('enhanced');
      expect(data.resources).toHaveLength(3);
      expect(data.resources[0].name).toBe('Crisis Helpline EU');
      expect(data.resources[0].phone).toBe('+800-123-4567');
    });
  });

  describe('Crypto Health', () => {
    it('should report crypto health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health/crypto'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.kms).toBe('ok');
      expect(data.dek_age_days).toBe(7);
      expect(data.encryption_level).toBe('enhanced');
    });
  });

  describe('Feedback with Safety Context', () => {
    it('should accept feedback with safety context', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/sessions/test_session/feedback',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        },
        payload: {
          rating: 'neutral',
          safetyFeedback: 'The safety features helped me feel more secure'
        }
      });

      expect(response.statusCode).toBe(204);
    });
  });
});
