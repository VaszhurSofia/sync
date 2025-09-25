/**
 * Prompt Evaluation Tests
 * Tests for AI prompt evaluation and quality assessment
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getTherapistOrchestrator } from '../src/orchestrator';
import { validateTherapistCoupleV20, validateTherapistSoloV10 } from '../src/validation/therapistValidator';

// Mock OpenAI API
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  mirror: {
                    partnerA: "I hear that you're feeling frustrated with this situation.",
                    partnerB: "I understand that you're also feeling overwhelmed right now."
                  },
                  clarify: "This seems to be about finding a way forward that works for both of you.",
                  explore: "What would help you both feel more supported in this conversation?",
                  micro_actions: [
                    "You might try taking a short break and coming back to this when you're both feeling calmer.",
                    "You could try writing down your thoughts separately before discussing them together."
                  ],
                  check: "Did I capture both of your perspectives fairly?",
                  meta: {
                    total_sentences: 8,
                    version: "couple_v2.0"
                  }
                })
              }
            }]
          })
        }
      }
    }))
  };
});

describe('Prompt Evaluation', () => {
  let orchestrator: any;

  beforeEach(() => {
    orchestrator = getTherapistOrchestrator();
  });

  describe('Couple Mode Evaluation', () => {
    it('should generate valid couple responses', async () => {
      const context = {
        userAMessage: "I feel like you never listen to me.",
        userBMessage: "I do listen, but you're always criticizing me.",
        sessionId: 'test-session',
        mode: 'couple' as const,
        previousMessages: []
      };

      const response = await orchestrator.generateResponse(context);

      expect(response.success).toBe(true);
      expect(response.mode).toBe('couple');
      expect(response.jsonResponse).toBeDefined();
      expect(response.promptVersion).toBe('couple_v2.0');
    });

    it('should validate couple response schema', () => {
      const validCoupleResponse = {
        mirror: {
          partnerA: "I hear that you're feeling frustrated.",
          partnerB: "I understand you're also feeling overwhelmed."
        },
        clarify: "This seems to be about communication.",
        explore: "What would help you both feel heard?",
        micro_actions: [
          "You might try taking turns speaking.",
          "You could practice active listening."
        ],
        check: "Did I capture both perspectives fairly?",
        meta: {
          total_sentences: 8,
          version: "couple_v2.0"
        }
      };

      const validation = validateTherapistCoupleV20(validCoupleResponse);
      expect(validation.ok).toBe(true);
    });
  });

  describe('Solo Mode Evaluation', () => {
    it('should generate valid solo responses', async () => {
      const context = {
        userAMessage: "I'm struggling with my relationship.",
        userBMessage: "I'm struggling with my relationship.", // Same for solo
        sessionId: 'test-session',
        mode: 'solo' as const,
        previousMessages: []
      };

      const response = await orchestrator.generateResponse(context);

      expect(response.success).toBe(true);
      expect(response.mode).toBe('solo');
      expect(response.jsonResponse).toBeDefined();
      expect(response.promptVersion).toBe('solo_v1.0');
    });

    it('should validate solo response schema', () => {
      const validSoloResponse = {
        reflect: "You're feeling overwhelmed and need support.",
        reframe: "This might be about wanting to feel heard and understood.",
        options: [
          "You might try writing down your thoughts before having the conversation.",
          "You could practice what you want to say with a trusted friend first."
        ],
        starter: "I've been thinking about our situation and I'd like to share what I'm feeling.",
        check: "Would you like to try one of these approaches?",
        meta: {
          total_sentences: 6,
          version: "solo_v1.0"
        }
      };

      const validation = validateTherapistSoloV10(validSoloResponse);
      expect(validation.ok).toBe(true);
    });
  });

  describe('Quality Metrics', () => {
    it('should measure response latency', async () => {
      const startTime = Date.now();
      
      const context = {
        userAMessage: "We keep fighting about the same things.",
        userBMessage: "I feel like we're stuck in a loop.",
        sessionId: 'test-session',
        mode: 'couple' as const,
        previousMessages: []
      };

      const response = await orchestrator.generateResponse(context);
      const latency = Date.now() - startTime;

      expect(response.success).toBe(true);
      expect(response.latency).toBeGreaterThan(0);
      expect(response.latency).toBeLessThan(5000); // Should be under 5 seconds
    });

    it('should track validation success rate', async () => {
      const context = {
        userAMessage: "I need help with our communication.",
        userBMessage: "I want to understand you better.",
        sessionId: 'test-session',
        mode: 'couple' as const,
        previousMessages: []
      };

      const response = await orchestrator.generateResponse(context);

      expect(response.success).toBe(true);
      expect(response.validationResult?.isValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      // Mock API failure
      const mockOpenAI = require('openai');
      mockOpenAI.OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API Error'))
          }
        }
      }));

      const context = {
        userAMessage: "Test message",
        userBMessage: "Test response",
        sessionId: 'test-session',
        mode: 'couple' as const,
        previousMessages: []
      };

      const response = await orchestrator.generateResponse(context);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should use fallback on validation failure', async () => {
      // Mock invalid response
      const mockOpenAI = require('openai');
      mockOpenAI.OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    invalid: "response"
                  })
                }
              }]
            })
          }
        }
      }));

      const context = {
        userAMessage: "Test message",
        userBMessage: "Test response",
        sessionId: 'test-session',
        mode: 'couple' as const,
        previousMessages: []
      };

      const response = await orchestrator.generateResponse(context);

      expect(response.success).toBe(true);
      expect(response.usedFallback).toBe(true);
    });
  });
});
