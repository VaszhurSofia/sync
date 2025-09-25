/**
 * Prompt Evaluation Tests
 * Simplified tests for AI prompt evaluation and quality assessment
 */

import { describe, it, expect } from '@jest/globals';
import { validateTherapistCoupleV20, validateTherapistSoloV10 } from '../src/validation/therapistValidator';

describe('Prompt Evaluation', () => {
  describe('Couple Mode Evaluation', () => {
    it('should validate couple response schema', () => {
      const validCoupleResponse = {
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
          total_sentences: 7,
          version: "couple_v2.0"
        }
      };

      const validation = validateTherapistCoupleV20(validCoupleResponse);
      expect(validation.ok).toBe(true);
    });

    it('should reject couple response with missing fields', () => {
      const invalidResponse = {
        mirror: {
          partnerA: "I hear you.",
          partnerB: "I understand."
        },
        // Missing required fields
        meta: {
          total_sentences: 2,
          version: "couple_v2.0"
        }
      };

      const validation = validateTherapistCoupleV20(invalidResponse);
      expect(validation.ok).toBe(false);
      if (!validation.ok) {
        expect(validation.errors.length).toBeGreaterThan(0);
      }
    });

    it('should reject couple response with wrong sentence counts', () => {
      const invalidResponse = {
        mirror: {
          partnerA: "I hear that you're feeling frustrated with this situation. This is a long response with multiple sentences.",
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
          total_sentences: 7,
          version: "couple_v2.0"
        }
      };

      const validation = validateTherapistCoupleV20(invalidResponse);
      expect(validation.ok).toBe(false);
      if (!validation.ok) {
        expect(validation.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Solo Mode Evaluation', () => {
    it('should validate solo response schema', () => {
      const validSoloResponse = {
        reflect: "You're feeling overwhelmed and need some support right now.",
        reframe: "This might be about wanting to feel heard and understood in your relationship.",
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

    it('should reject solo response with missing fields', () => {
      const invalidResponse = {
        reflect: "You're feeling overwhelmed.",
        // Missing required fields
        meta: {
          total_sentences: 1,
          version: "solo_v1.0"
        }
      };

      const validation = validateTherapistSoloV10(invalidResponse);
      expect(validation.ok).toBe(false);
      if (!validation.ok) {
        expect(validation.errors.length).toBeGreaterThan(0);
      }
    });

    it('should reject solo response with wrong sentence counts', () => {
      const invalidResponse = {
        reflect: "You're feeling overwhelmed and need some support right now. This is a long response with multiple sentences.",
        reframe: "This might be about wanting to feel heard and understood in your relationship.",
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

      const validation = validateTherapistSoloV10(invalidResponse);
      expect(validation.ok).toBe(false);
      if (!validation.ok) {
        expect(validation.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Quality Metrics', () => {
    it('should validate response structure for quality assessment', () => {
      const coupleResponse = {
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
          total_sentences: 7,
          version: "couple_v2.0"
        }
      };

      const validation = validateTherapistCoupleV20(coupleResponse);
      expect(validation.ok).toBe(true);
      
      if (validation.ok) {
        const response = validation.value;
        expect(response.meta.version).toBe("couple_v2.0");
        expect(response.meta.total_sentences).toBe(7);
        expect(response.mirror.partnerA).toBeDefined();
        expect(response.mirror.partnerB).toBeDefined();
        expect(response.clarify).toBeDefined();
        expect(response.explore).toBeDefined();
        expect(response.micro_actions).toHaveLength(2);
        expect(response.check).toBeDefined();
      }
    });

    it('should validate solo response structure for quality assessment', () => {
      const soloResponse = {
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

      const validation = validateTherapistSoloV10(soloResponse);
      expect(validation.ok).toBe(true);
      
      if (validation.ok) {
        const response = validation.value;
        expect(response.meta.version).toBe("solo_v1.0");
        expect(response.meta.total_sentences).toBe(6);
        expect(response.reflect).toBeDefined();
        expect(response.reframe).toBeDefined();
        expect(response.options).toHaveLength(2);
        expect(response.starter).toBeDefined();
        expect(response.check).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', () => {
      const invalidResponse = {
        invalid: "response"
      };

      const coupleValidation = validateTherapistCoupleV20(invalidResponse as any);
      expect(coupleValidation.ok).toBe(false);
      if (!coupleValidation.ok) {
        expect(coupleValidation.errors.length).toBeGreaterThan(0);
      }

      const soloValidation = validateTherapistSoloV10(invalidResponse as any);
      expect(soloValidation.ok).toBe(false);
      if (!soloValidation.ok) {
        expect(soloValidation.errors.length).toBeGreaterThan(0);
      }
    });

    it('should provide meaningful error messages', () => {
      const invalidResponse = {
        mirror: {
          partnerA: "I hear you.",
          partnerB: "I understand."
        },
        // Missing required fields
        meta: {
          total_sentences: 2,
          version: "couple_v2.0"
        }
      };

      const validation = validateTherapistCoupleV20(invalidResponse);
      expect(validation.ok).toBe(false);
      if (!validation.ok) {
        expect(validation.errors).toContain(" must have required property 'clarify'");
        expect(validation.errors).toContain(" must have required property 'explore'");
        expect(validation.errors).toContain(" must have required property 'micro_actions'");
        expect(validation.errors).toContain(" must have required property 'check'");
      }
    });
  });

  describe('Performance Metrics', () => {
    it('should validate response within reasonable time', () => {
      const startTime = Date.now();
      
      const validResponse = {
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
          total_sentences: 7,
          version: "couple_v2.0"
        }
      };

      const validation = validateTherapistCoupleV20(validResponse);
      const endTime = Date.now();
      
      expect(validation.ok).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should be under 100ms
    });

    it('should handle multiple validations efficiently', () => {
      const responses = Array.from({ length: 10 }, (_, i) => ({
        mirror: {
          partnerA: `I hear that you're feeling frustrated with situation ${i}.`,
          partnerB: `I understand you're also feeling overwhelmed about this.`
        },
        clarify: `This seems to be about communication issue ${i}.`,
        explore: `What would help you both feel heard about this?`,
        micro_actions: [
          "You might try taking turns speaking.",
          "You could practice active listening."
        ],
        check: "Did I capture both perspectives fairly?",
        meta: {
          total_sentences: 7,
          version: "couple_v2.0"
        }
      }));

      const startTime = Date.now();
      
      responses.forEach(response => {
        const validation = validateTherapistCoupleV20(response);
        expect(validation.ok).toBe(true);
      });
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(500); // Should handle 10 validations under 500ms
    });
  });
});