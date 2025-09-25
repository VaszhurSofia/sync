/**
 * Therapist v1.2 Comprehensive Tests
 * Tests for PR-AI-21: Add v1.2 JSON schema + validator + tests
 */

import { validateTherapistV12, createSafeFallback, createBoundaryTemplate, TherapistV12 } from '../src/validation/therapistValidator';

describe('Therapist v1.2 Validator Tests', () => {
  describe('Happy Path Tests', () => {
    it('should validate a perfect 8-sentence response', () => {
      const validResponse: TherapistV12 = {
        mirror: {
          partnerA: "Partner A feels unheard when decisions are made without consultation.",
          partnerB: "Partner B feels frustrated when their input seems to be dismissed."
        },
        clarify: "This seems to be about balancing autonomy with collaboration in decision-making.",
        explore: "What would it look like to make decisions together in a way that honors both of your needs?",
        micro_actions: [
          "You might try setting aside time each week to discuss upcoming decisions together.",
          "You could try taking turns leading the conversation about different topics."
        ],
        check: "Did I capture both of your perspectives fairly?",
        meta: {
          total_sentences: 8,
          version: "therapist_v1.2"
        }
      };

      const result = validateTherapistV12(validResponse);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(validResponse);
      }
    });

    it('should validate a minimal 6-sentence response', () => {
      const minimalResponse: TherapistV12 = {
        mirror: {
          partnerA: "Partner A feels overwhelmed by the current situation.",
          partnerB: "Partner B feels uncertain about the next steps."
        },
        clarify: "This seems to be about finding clarity and direction together.",
        explore: "What would help you both feel more grounded in this moment?",
        micro_actions: [],
        check: "Did I understand both of your concerns?",
        meta: {
          total_sentences: 6,
          version: "therapist_v1.2"
        }
      };

      const result = validateTherapistV12(minimalResponse);
      expect(result.ok).toBe(true);
    });

    it('should validate a 7-sentence response with one micro-action', () => {
      const sevenSentenceResponse: TherapistV12 = {
        mirror: {
          partnerA: "Partner A feels disconnected from the relationship.",
          partnerB: "Partner B feels like they're trying to bridge the gap alone."
        },
        clarify: "This seems to be about rebuilding connection and mutual effort.",
        explore: "What would help you both feel more connected to each other?",
        micro_actions: [
          "You might try spending 15 minutes each day just listening to each other without trying to fix anything."
        ],
        check: "Did I capture both of your experiences accurately?",
        meta: {
          total_sentences: 7,
          version: "therapist_v1.2"
        }
      };

      const result = validateTherapistV12(sevenSentenceResponse);
      expect(result.ok).toBe(true);
    });
  });

  describe('Validation Error Tests', () => {
    it('should reject mirror with 2 sentences in partnerA', () => {
      const invalidResponse = {
        mirror: {
          partnerA: "Partner A feels frustrated. They also feel unheard.",
          partnerB: "Partner B feels overwhelmed."
        },
        clarify: "This seems to be about communication.",
        explore: "What would help you both?",
        micro_actions: [],
        check: "Did I capture both perspectives?",
        meta: {
          total_sentences: 6,
          version: "therapist_v1.2"
        }
      };

      const result = validateTherapistV12(invalidResponse);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain("mirror.partnerA must be exactly 1 sentence.");
      }
    });

    it('should reject explore that starts with "Why"', () => {
      const invalidResponse = {
        mirror: {
          partnerA: "Partner A feels frustrated.",
          partnerB: "Partner B feels overwhelmed."
        },
        clarify: "This seems to be about communication.",
        explore: "Why do you think this is happening?",
        micro_actions: [],
        check: "Did I capture both perspectives?",
        meta: {
          total_sentences: 6,
          version: "therapist_v1.2"
        }
      };

      const result = validateTherapistV12(invalidResponse);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain("explore must avoid starting with 'Why'.");
      }
    });

    it('should reject yes/no questions in explore', () => {
      const invalidResponse = {
        mirror: {
          partnerA: "Partner A feels frustrated.",
          partnerB: "Partner B feels overwhelmed."
        },
        clarify: "This seems to be about communication.",
        explore: "Do you want to try a different approach?",
        micro_actions: [],
        check: "Did I capture both perspectives?",
        meta: {
          total_sentences: 6,
          version: "therapist_v1.2"
        }
      };

      const result = validateTherapistV12(invalidResponse);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain("explore must be open-ended (not yes/no).");
      }
    });

    it('should reject banned terms', () => {
      const invalidResponse = {
        mirror: {
          partnerA: "Partner A feels frustrated.",
          partnerB: "Partner B feels overwhelmed."
        },
        clarify: "This seems to be about communication.",
        explore: "What would help you both?",
        micro_actions: ["You should try talking more."],
        check: "Did I capture both perspectives?",
        meta: {
          total_sentences: 6,
          version: "therapist_v1.2"
        }
      };

      const result = validateTherapistV12(invalidResponse);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain("output contains banned terms (tone/clinical/labels).");
      }
    });

    it('should reject micro-actions that start with imperative verbs', () => {
      const invalidResponse = {
        mirror: {
          partnerA: "Partner A feels frustrated.",
          partnerB: "Partner B feels overwhelmed."
        },
        clarify: "This seems to be about communication.",
        explore: "What would help you both?",
        micro_actions: ["Do this exercise together.", "Stop avoiding the topic."],
        check: "Did I capture both perspectives?",
        meta: {
          total_sentences: 6,
          version: "therapist_v1.2"
        }
      };

      const result = validateTherapistV12(invalidResponse);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain("each micro_action must start with 'You might' or 'You could'.");
      }
    });

    it('should reject check that doesn\'t verify fairness', () => {
      const invalidResponse = {
        mirror: {
          partnerA: "Partner A feels frustrated.",
          partnerB: "Partner B feels overwhelmed."
        },
        clarify: "This seems to be about communication.",
        explore: "What would help you both?",
        micro_actions: [],
        check: "What do you think about this?",
        meta: {
          total_sentences: 6,
          version: "therapist_v1.2"
        }
      };

      const result = validateTherapistV12(invalidResponse);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain("check must verify fairness/accuracy for both partners.");
      }
    });

    it('should reject total sentence count mismatch', () => {
      const invalidResponse = {
        mirror: {
          partnerA: "Partner A feels frustrated.",
          partnerB: "Partner B feels overwhelmed."
        },
        clarify: "This seems to be about communication.",
        explore: "What would help you both?",
        micro_actions: [],
        check: "Did I capture both perspectives fairly?",
        meta: {
          total_sentences: 5, // Should be 6
          version: "therapist_v1.2"
        }
      };

      const result = validateTherapistV12(invalidResponse);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain("meta.total_sentences must equal the computed sentence count.");
      }
    });

    it('should reject total sentence count exceeding 8', () => {
      const invalidResponse = {
        mirror: {
          partnerA: "Partner A feels frustrated.",
          partnerB: "Partner B feels overwhelmed."
        },
        clarify: "This seems to be about communication. It's a complex issue.",
        explore: "What would help you both?",
        micro_actions: ["You might try this.", "You could try that."],
        check: "Did I capture both perspectives fairly?",
        meta: {
          total_sentences: 9,
          version: "therapist_v1.2"
        }
      };

      const result = validateTherapistV12(invalidResponse);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain("total sentence count exceeds 8.");
      }
    });
  });

  describe('Helper Function Tests', () => {
    it('should create a valid safe fallback', () => {
      const fallback = createSafeFallback();
      const result = validateTherapistV12(fallback);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.meta.version).toBe("therapist_v1.2");
        expect(result.value.meta.total_sentences).toBe(8);
      }
    });

    it('should create a valid boundary template', () => {
      const boundary = createBoundaryTemplate();
      const result = validateTherapistV12(boundary);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.meta.version).toBe("therapist_v1.2");
        expect(result.value.meta.total_sentences).toBe(8);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty micro_actions array', () => {
      const response = {
        mirror: {
          partnerA: "Partner A feels frustrated.",
          partnerB: "Partner B feels overwhelmed."
        },
        clarify: "This seems to be about communication.",
        explore: "What would help you both?",
        micro_actions: [],
        check: "Did I capture both perspectives fairly?",
        meta: {
          total_sentences: 6,
          version: "therapist_v1.2"
        }
      };

      const result = validateTherapistV12(response);
      expect(result.ok).toBe(true);
    });

    it('should handle single micro_action', () => {
      const response = {
        mirror: {
          partnerA: "Partner A feels frustrated.",
          partnerB: "Partner B feels overwhelmed."
        },
        clarify: "This seems to be about communication.",
        explore: "What would help you both?",
        micro_actions: ["You might try taking a break and coming back to this."],
        check: "Did I capture both perspectives fairly?",
        meta: {
          total_sentences: 7,
          version: "therapist_v1.2"
        }
      };

      const result = validateTherapistV12(response);
      expect(result.ok).toBe(true);
    });

    it('should handle maximum 2 micro_actions', () => {
      const response = {
        mirror: {
          partnerA: "Partner A feels frustrated.",
          partnerB: "Partner B feels overwhelmed."
        },
        clarify: "This seems to be about communication.",
        explore: "What would help you both?",
        micro_actions: [
          "You might try taking a break and coming back to this.",
          "You could try writing down your thoughts separately."
        ],
        check: "Did I capture both perspectives fairly?",
        meta: {
          total_sentences: 8,
          version: "therapist_v1.2"
        }
      };

      const result = validateTherapistV12(response);
      expect(result.ok).toBe(true);
    });
  });

  describe('JSON Schema Validation', () => {
    it('should reject missing required fields', () => {
      const invalidResponse = {
        mirror: {
          partnerA: "Partner A feels frustrated."
          // Missing partnerB
        },
        clarify: "This seems to be about communication.",
        explore: "What would help you both?",
        micro_actions: [],
        check: "Did I capture both perspectives fairly?",
        meta: {
          total_sentences: 6,
          version: "therapist_v1.2"
        }
      };

      const result = validateTherapistV12(invalidResponse);
      expect(result.ok).toBe(false);
    });

    it('should reject wrong version', () => {
      const invalidResponse = {
        mirror: {
          partnerA: "Partner A feels frustrated.",
          partnerB: "Partner B feels overwhelmed."
        },
        clarify: "This seems to be about communication.",
        explore: "What would help you both?",
        micro_actions: [],
        check: "Did I capture both perspectives fairly?",
        meta: {
          total_sentences: 6,
          version: "therapist_v1.1" // Wrong version
        }
      };

      const result = validateTherapistV12(invalidResponse);
      expect(result.ok).toBe(false);
    });

    it('should reject invalid total_sentences range', () => {
      const invalidResponse = {
        mirror: {
          partnerA: "Partner A feels frustrated.",
          partnerB: "Partner B feels overwhelmed."
        },
        clarify: "This seems to be about communication.",
        explore: "What would help you both?",
        micro_actions: [],
        check: "Did I capture both perspectives fairly?",
        meta: {
          total_sentences: 0, // Too low
          version: "therapist_v1.2"
        }
      };

      const result = validateTherapistV12(invalidResponse);
      expect(result.ok).toBe(false);
    });
  });
});
