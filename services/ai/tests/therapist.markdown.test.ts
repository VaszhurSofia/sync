/**
 * Therapist Markdown Validator Tests
 * Tests for PR-AI-23: Optional Markdown validator fallback
 */

import { parseMarkdownResponse, validateMarkdownResponse, formatTherapistV12AsMarkdown } from '../src/validation/therapistMarkdown';
import { TherapistV12 } from '../src/validation/therapistValidator';

describe('Therapist Markdown Validator Tests', () => {
  describe('parseMarkdownResponse', () => {
    it('should parse a valid markdown response', () => {
      const markdown = `**MIRROR**
- Partner A: I feel frustrated when my concerns are dismissed.
- Partner B: I feel overwhelmed when there are too many issues to address.

**CLARIFY**
This seems to be about balancing different priorities and communication styles.

**EXPLORE**
What would help you both feel more heard in this conversation?

**MICRO-ACTIONS**
- You might try taking turns sharing your perspective without interruption.
- You could try focusing on one issue at a time.

**CHECK**
Did I capture both of your perspectives fairly?`;

      const result = parseMarkdownResponse(markdown);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.mirror.partnerA).toBe('I feel frustrated when my concerns are dismissed.');
      expect(result.data?.mirror.partnerB).toBe('I feel overwhelmed when there are too many issues to address.');
      expect(result.data?.clarify).toBe('This seems to be about balancing different priorities and communication styles.');
      expect(result.data?.explore).toBe('What would help you both feel more heard in this conversation?');
      expect(result.data?.micro_actions).toEqual([
        'You might try taking turns sharing your perspective without interruption.',
        'You could try focusing on one issue at a time.'
      ]);
      expect(result.data?.check).toBe('Did I capture both of your perspectives fairly?');
      expect(result.data?.meta.version).toBe('therapist_v1.2');
    });

    it('should parse markdown with no micro-actions', () => {
      const markdown = `**MIRROR**
- Partner A: I feel uncertain about the next steps.
- Partner B: I feel confused about what to do.

**CLARIFY**
This seems to be about finding direction together.

**EXPLORE**
What would help you both feel more confident about moving forward?

**CHECK**
Did I understand both of your concerns?`;

      const result = parseMarkdownResponse(markdown);
      
      expect(result.success).toBe(true);
      expect(result.data?.micro_actions).toEqual([]);
    });

    it('should fail when MIRROR section is missing', () => {
      const markdown = `**CLARIFY**
This seems to be about communication.

**EXPLORE**
What would help you both?

**CHECK**
Did I capture both perspectives?`;

      const result = parseMarkdownResponse(markdown);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing MIRROR section');
    });

    it('should fail when Partner A is missing in MIRROR', () => {
      const markdown = `**MIRROR**
- Partner B: I feel overwhelmed.

**CLARIFY**
This seems to be about communication.

**EXPLORE**
What would help you both?

**CHECK**
Did I capture both perspectives?`;

      const result = parseMarkdownResponse(markdown);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing Partner A in MIRROR section');
    });

    it('should handle malformed markdown gracefully', () => {
      const markdown = `This is not properly formatted markdown.`;

      const result = parseMarkdownResponse(markdown);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateMarkdownResponse', () => {
    it('should validate a correct markdown response', () => {
      const markdown = `**MIRROR**
- Partner A: I feel frustrated when my concerns are dismissed.
- Partner B: I feel overwhelmed when there are too many issues to address.

**CLARIFY**
This seems to be about balancing different priorities and communication styles.

**EXPLORE**
What would help you both feel more heard in this conversation?

**MICRO-ACTIONS**
- You might try taking turns sharing your perspective without interruption.
- You could try focusing on one issue at a time.

**CHECK**
Did I capture both of your perspectives fairly?`;

      const result = validateMarkdownResponse(markdown);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.meta.version).toBe('therapist_v1.2');
        expect(result.value.meta.total_sentences).toBe(8);
      }
    });

    it('should reject markdown with validation errors', () => {
      const markdown = `**MIRROR**
- Partner A: I feel frustrated. I also feel unheard.
- Partner B: I feel overwhelmed.

**CLARIFY**
This seems to be about communication.

**EXPLORE**
Do you want to try a different approach?

**CHECK**
What do you think?`;

      const result = validateMarkdownResponse(markdown);
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain("mirror.partnerA must be exactly 1 sentence.");
        expect(result.errors).toContain("explore must be open-ended (not yes/no).");
        expect(result.errors).toContain("check must verify fairness/accuracy for both partners.");
      }
    });
  });

  describe('formatTherapistV12AsMarkdown', () => {
    it('should format TherapistV12 as markdown', () => {
      const data: TherapistV12 = {
        mirror: {
          partnerA: "I feel frustrated when my concerns are dismissed.",
          partnerB: "I feel overwhelmed when there are too many issues to address."
        },
        clarify: "This seems to be about balancing different priorities and communication styles.",
        explore: "What would help you both feel more heard in this conversation?",
        micro_actions: [
          "You might try taking turns sharing your perspective without interruption.",
          "You could try focusing on one issue at a time."
        ],
        check: "Did I capture both of your perspectives fairly?",
        meta: {
          total_sentences: 8,
          version: "therapist_v1.2"
        }
      };

      const markdown = formatTherapistV12AsMarkdown(data);
      
      expect(markdown).toContain('**MIRROR**');
      expect(markdown).toContain('- Partner A: I feel frustrated when my concerns are dismissed.');
      expect(markdown).toContain('- Partner B: I feel overwhelmed when there are too many issues to address.');
      expect(markdown).toContain('**CLARIFY**');
      expect(markdown).toContain('This seems to be about balancing different priorities and communication styles.');
      expect(markdown).toContain('**EXPLORE**');
      expect(markdown).toContain('What would help you both feel more heard in this conversation?');
      expect(markdown).toContain('**MICRO-ACTIONS**');
      expect(markdown).toContain('- You might try taking turns sharing your perspective without interruption.');
      expect(markdown).toContain('- You could try focusing on one issue at a time.');
      expect(markdown).toContain('**CHECK**');
      expect(markdown).toContain('Did I capture both of your perspectives fairly?');
    });

    it('should format TherapistV12 with no micro-actions', () => {
      const data: TherapistV12 = {
        mirror: {
          partnerA: "I feel uncertain about the next steps.",
          partnerB: "I feel confused about what to do."
        },
        clarify: "This seems to be about finding direction together.",
        explore: "What would help you both feel more confident about moving forward?",
        micro_actions: [],
        check: "Did I understand both of your concerns?",
        meta: {
          total_sentences: 6,
          version: "therapist_v1.2"
        }
      };

      const markdown = formatTherapistV12AsMarkdown(data);
      
      expect(markdown).toContain('**MIRROR**');
      expect(markdown).toContain('**CLARIFY**');
      expect(markdown).toContain('**EXPLORE**');
      expect(markdown).toContain('**CHECK**');
      expect(markdown).not.toContain('**MICRO-ACTIONS**');
    });
  });

  describe('Round-trip conversion', () => {
    it('should maintain data integrity through markdown conversion', () => {
      const originalData: TherapistV12 = {
        mirror: {
          partnerA: "I feel frustrated when my concerns are dismissed.",
          partnerB: "I feel overwhelmed when there are too many issues to address."
        },
        clarify: "This seems to be about balancing different priorities and communication styles.",
        explore: "What would help you both feel more heard in this conversation?",
        micro_actions: [
          "You might try taking turns sharing your perspective without interruption.",
          "You could try focusing on one issue at a time."
        ],
        check: "Did I capture both of your perspectives fairly?",
        meta: {
          total_sentences: 8,
          version: "therapist_v1.2"
        }
      };

      // Convert to markdown
      const markdown = formatTherapistV12AsMarkdown(originalData);
      
      // Parse back from markdown
      const parseResult = parseMarkdownResponse(markdown);
      
      expect(parseResult.success).toBe(true);
      if (parseResult.success) {
        expect(parseResult.data?.mirror.partnerA).toBe(originalData.mirror.partnerA);
        expect(parseResult.data?.mirror.partnerB).toBe(originalData.mirror.partnerB);
        expect(parseResult.data?.clarify).toBe(originalData.clarify);
        expect(parseResult.data?.explore).toBe(originalData.explore);
        expect(parseResult.data?.micro_actions).toEqual(originalData.micro_actions);
        expect(parseResult.data?.check).toBe(originalData.check);
        expect(parseResult.data?.meta.version).toBe(originalData.meta.version);
      }
    });
  });
});
