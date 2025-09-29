import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { createServer } from '../../services/api/src/m4-safety-privacy-server';

describe('User Acceptance Testing - Complete User Journeys', () => {
  let server: FastifyInstance;
  const userA = 'Bearer token_userA';
  const userB = 'Bearer token_userB';

  beforeAll(async () => {
    server = await createServer();
    await server.ready();
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('Complete Couple Session Journey', () => {
    it('should complete a full couple therapy session', async () => {
      // Step 1: Create couple session
      const sessionResponse = await server.inject({
        method: 'POST',
        url: '/sessions',
        headers: {
          'Authorization': userA,
          'Content-Type': 'application/json'
        },
        payload: {
          mode: 'couple',
          coupleId: '123e4567-e89b-12d3-a456-426614174000'
        }
      });

      expect(sessionResponse.statusCode).toBe(200);
      const sessionData = JSON.parse(sessionResponse.payload);
      const sessionId = sessionData.sessionId;

      // Step 2: User A shares their feelings
      const userAMessage = await server.inject({
        method: 'POST',
        url: `/sessions/${sessionId}/messages`,
        headers: {
          'Authorization': userA,
          'Content-Type': 'application/json'
        },
        payload: {
          sender: 'userA',
          content: 'I feel like we\'ve been distant lately and I want to understand why',
          clientMessageId: 'msg_1'
        }
      });

      expect(userAMessage.statusCode).toBe(202);

      // Step 3: User B responds
      const userBMessage = await server.inject({
        method: 'POST',
        url: `/sessions/${sessionId}/messages`,
        headers: {
          'Authorization': userB,
          'Content-Type': 'application/json'
        },
        payload: {
          sender: 'userB',
          content: 'I\'ve been stressed at work and I think I\'ve been taking it out on you',
          clientMessageId: 'msg_2'
        }
      });

      expect(userBMessage.statusCode).toBe(202);

      // Step 4: AI facilitates the conversation
      // Wait for AI response (simulated)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 5: Continue the conversation
      const userAFollowUp = await server.inject({
        method: 'POST',
        url: `/sessions/${sessionId}/messages`,
        headers: {
          'Authorization': userA,
          'Content-Type': 'application/json'
        },
        payload: {
          sender: 'userA',
          content: 'I understand work stress, but I need you to communicate with me instead of shutting down',
          clientMessageId: 'msg_3'
        }
      });

      expect(userAFollowUp.statusCode).toBe(202);

      // Step 6: Get conversation history
      const messagesResponse = await server.inject({
        method: 'GET',
        url: `/sessions/${sessionId}/messages`,
        headers: {
          'Authorization': userA
        }
      });

      expect(messagesResponse.statusCode).toBe(200);
      const messages = JSON.parse(messagesResponse.payload);
      expect(messages.length).toBeGreaterThan(0);

      // Step 7: Submit feedback
      const feedbackResponse = await server.inject({
        method: 'POST',
        url: `/sessions/${sessionId}/feedback`,
        headers: {
          'Authorization': userA,
          'Content-Type': 'application/json'
        },
        payload: {
          rating: 'happy',
          comment: 'This helped us communicate better'
        }
      });

      expect(feedbackResponse.statusCode).toBe(204);

      // Step 8: End session
      const endResponse = await server.inject({
        method: 'POST',
        url: `/sessions/${sessionId}/end`,
        headers: {
          'Authorization': userA
        }
      });

      expect(endResponse.statusCode).toBe(204);
    });
  });

  describe('Complete Solo Session Journey', () => {
    it('should complete a full solo reflection session', async () => {
      // Step 1: Create solo session
      const sessionResponse = await server.inject({
        method: 'POST',
        url: '/sessions',
        headers: {
          'Authorization': userA,
          'Content-Type': 'application/json'
        },
        payload: {
          mode: 'solo'
        }
      });

      expect(sessionResponse.statusCode).toBe(200);
      const sessionData = JSON.parse(sessionResponse.payload);
      const sessionId = sessionData.sessionId;

      // Step 2: User reflects on their feelings
      const reflectionMessage = await server.inject({
        method: 'POST',
        url: `/sessions/${sessionId}/messages`,
        headers: {
          'Authorization': userA,
          'Content-Type': 'application/json'
        },
        payload: {
          sender: 'userA',
          content: 'I\'ve been feeling overwhelmed lately and I\'m not sure how to handle it',
          clientMessageId: 'msg_solo_1'
        }
      });

      expect(reflectionMessage.statusCode).toBe(202);

      // Step 3: Continue reflection
      const deeperReflection = await server.inject({
        method: 'POST',
        url: `/sessions/${sessionId}/messages`,
        headers: {
          'Authorization': userA,
          'Content-Type': 'application/json'
        },
        payload: {
          sender: 'userA',
          content: 'I think the root cause is that I\'m not setting boundaries at work',
          clientMessageId: 'msg_solo_2'
        }
      });

      expect(deeperReflection.statusCode).toBe(202);

      // Step 4: Get insights
      const messagesResponse = await server.inject({
        method: 'GET',
        url: `/sessions/${sessionId}/messages`,
        headers: {
          'Authorization': userA
        }
      });

      expect(messagesResponse.statusCode).toBe(200);
      const messages = JSON.parse(messagesResponse.payload);
      expect(messages.length).toBeGreaterThan(0);

      // Step 5: Submit feedback
      const feedbackResponse = await server.inject({
        method: 'POST',
        url: `/sessions/${sessionId}/feedback`,
        headers: {
          'Authorization': userA,
          'Content-Type': 'application/json'
        },
        payload: {
          rating: 'neutral',
          comment: 'This helped me understand my feelings better'
        }
      });

      expect(feedbackResponse.statusCode).toBe(204);
    });
  });

  describe('Solo to Couple Conversion Journey', () => {
    it('should convert solo session to couple session', async () => {
      // Step 1: Create solo session
      const soloSessionResponse = await server.inject({
        method: 'POST',
        url: '/sessions',
        headers: {
          'Authorization': userA,
          'Content-Type': 'application/json'
        },
        payload: {
          mode: 'solo'
        }
      });

      const soloSessionData = JSON.parse(soloSessionResponse.payload);
      const soloSessionId = soloSessionData.sessionId;

      // Step 2: Add some reflection content
      await server.inject({
        method: 'POST',
        url: `/sessions/${soloSessionId}/messages`,
        headers: {
          'Authorization': userA,
          'Content-Type': 'application/json'
        },
        payload: {
          sender: 'userA',
          content: 'I\'ve been reflecting on our communication and I think we need to work on listening to each other better',
          clientMessageId: 'msg_solo_reflection'
        }
      });

      // Step 3: Convert to couple session
      const conversionResponse = await server.inject({
        method: 'POST',
        url: `/sessions/${soloSessionId}/convert-to-couple`,
        headers: {
          'Authorization': userA,
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

      expect(conversionResponse.statusCode).toBe(200);
      const conversionData = JSON.parse(conversionResponse.payload);
      expect(conversionData.newCoupleSessionId).toBeDefined();

      // Step 4: Verify couple session was created
      const coupleSessionId = conversionData.newCoupleSessionId;
      const coupleSessionResponse = await server.inject({
        method: 'GET',
        url: `/sessions/${coupleSessionId}/messages`,
        headers: {
          'Authorization': userA
        }
      });

      expect(coupleSessionResponse.statusCode).toBe(200);
      const coupleMessages = JSON.parse(coupleSessionResponse.payload);
      expect(coupleMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Safety and Privacy Journey', () => {
    it('should handle safety concerns and provide resources', async () => {
      // Step 1: Create session
      const sessionResponse = await server.inject({
        method: 'POST',
        url: '/sessions',
        headers: {
          'Authorization': userA,
          'Content-Type': 'application/json'
        },
        payload: {
          mode: 'solo'
        }
      });

      const sessionData = JSON.parse(sessionResponse.payload);
      const sessionId = sessionData.sessionId;

      // Step 2: Send concerning content
      const concerningMessage = await server.inject({
        method: 'POST',
        url: `/sessions/${sessionId}/messages`,
        headers: {
          'Authorization': userA,
          'Content-Type': 'application/json'
        },
        payload: {
          sender: 'userA',
          content: 'I am so angry I could kill someone right now',
          clientMessageId: 'msg_concerning'
        }
      });

      // Should be blocked or flagged
      expect([202, 409]).toContain(concerningMessage.statusCode);

      // Step 3: Get boundary resources
      const resourcesResponse = await server.inject({
        method: 'GET',
        url: '/boundary/resources'
      });

      expect(resourcesResponse.statusCode).toBe(200);
      const resources = JSON.parse(resourcesResponse.payload);
      expect(resources.resources.length).toBeGreaterThan(0);
      expect(resources.resources[0].name).toBe('Crisis Helpline EU');
    });
  });

  describe('Privacy Controls Journey', () => {
    it('should allow users to manage their privacy settings', async () => {
      // Step 1: Get current privacy settings
      const getSettingsResponse = await server.inject({
        method: 'GET',
        url: '/privacy/settings',
        headers: {
          'Authorization': userA
        }
      });

      expect(getSettingsResponse.statusCode).toBe(200);
      const settings = JSON.parse(getSettingsResponse.payload);
      expect(settings.dataRetention).toBeDefined();

      // Step 2: Update privacy settings
      const updateSettingsResponse = await server.inject({
        method: 'PUT',
        url: '/privacy/settings',
        headers: {
          'Authorization': userA,
          'Content-Type': 'application/json'
        },
        payload: {
          dataRetention: 60,
          auditLogging: true,
          dataAnonymization: true
        }
      });

      expect(updateSettingsResponse.statusCode).toBe(200);

      // Step 3: Export user data
      const exportResponse = await server.inject({
        method: 'POST',
        url: '/privacy/export-data',
        headers: {
          'Authorization': userA,
          'Content-Type': 'application/json'
        },
        payload: {}
      });

      expect(exportResponse.statusCode).toBe(200);
      const exportData = JSON.parse(exportResponse.payload);
      expect(exportData.exportId).toBeDefined();

      // Step 4: Delete user data
      const deleteResponse = await server.inject({
        method: 'DELETE',
        url: '/privacy/delete-data',
        headers: {
          'Authorization': userA
        }
      });

      expect(deleteResponse.statusCode).toBe(200);
    });
  });

  describe('Error Handling Journey', () => {
    it('should handle errors gracefully throughout the user journey', async () => {
      // Step 1: Try to create session without authentication
      const unauthorizedResponse = await server.inject({
        method: 'POST',
        url: '/sessions',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: {
          mode: 'solo'
        }
      });

      expect(unauthorizedResponse.statusCode).toBe(401);

      // Step 2: Try to access non-existent session
      const notFoundResponse = await server.inject({
        method: 'GET',
        url: '/sessions/non-existent-session/messages',
        headers: {
          'Authorization': userA
        }
      });

      expect(notFoundResponse.statusCode).toBe(404);

      // Step 3: Try to send message to ended session
      const sessionResponse = await server.inject({
        method: 'POST',
        url: '/sessions',
        headers: {
          'Authorization': userA,
          'Content-Type': 'application/json'
        },
        payload: {
          mode: 'solo'
        }
      });

      const sessionData = JSON.parse(sessionResponse.payload);
      const sessionId = sessionData.sessionId;

      // End the session
      await server.inject({
        method: 'POST',
        url: `/sessions/${sessionId}/end`,
        headers: {
          'Authorization': userA
        }
      });

      // Try to send message to ended session
      const endedSessionResponse = await server.inject({
        method: 'POST',
        url: `/sessions/${sessionId}/messages`,
        headers: {
          'Authorization': userA,
          'Content-Type': 'application/json'
        },
        payload: {
          sender: 'userA',
          content: 'This should fail',
          clientMessageId: 'msg_ended'
        }
      });

      expect(endedSessionResponse.statusCode).toBe(404);
    });
  });
});
