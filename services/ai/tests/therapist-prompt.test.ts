/**
 * Therapist Prompt Tests
 * Tests the therapist prompt system with 25 canned scenarios and validation
 */

import { TherapistOrchestrator, ConversationContext } from '../src/orchestrator';
import { validateTherapistResponse, parseTherapistResponse } from '../src/schemas/therapist-response';

describe('Therapist Prompt System', () => {
  let orchestrator: TherapistOrchestrator;

  beforeEach(() => {
    orchestrator = new TherapistOrchestrator({
      therapistPromptVersion: 'v1',
      openaiApiKey: 'test-key',
      model: 'gpt-4',
      maxRetries: 2,
      fallbackTemplate: 'Fallback template'
    });
  });

  describe('Prompt Loading', () => {
    it('should load v1 prompt successfully', () => {
      const prompt = (orchestrator as any).loadTherapistPrompt('v1');
      
      expect(prompt).toBeDefined();
      expect(prompt).toContain('professional couples facilitator');
      expect(prompt).toContain('MIRROR:');
      expect(prompt).toContain('CLARIFY:');
      expect(prompt).toContain('EXPLORE:');
      expect(prompt).toContain('MICRO-ACTIONS:');
      expect(prompt).toContain('CHECK:');
    });

    it('should load v2 prompt successfully', () => {
      const prompt = (orchestrator as any).loadTherapistPrompt('v2');
      
      expect(prompt).toBeDefined();
      expect(prompt).toContain('professional couples facilitator');
      expect(prompt).toContain('emotion labeling');
      expect(prompt).toContain('Gottman-style');
    });

    it('should cache loaded prompts', () => {
      const prompt1 = (orchestrator as any).loadTherapistPrompt('v1');
      const prompt2 = (orchestrator as any).loadTherapistPrompt('v1');
      
      expect(prompt1).toBe(prompt2); // Same reference due to caching
    });

    it('should throw error for invalid prompt version', () => {
      expect(() => {
        (orchestrator as any).loadTherapistPrompt('invalid');
      }).toThrow('Failed to load therapist prompt version invalid');
    });
  });

  describe('Response Validation', () => {
    it('should validate correct response structure', () => {
      const validResponse = {
        sections: [
          {
            type: 'MIRROR',
            content: 'Alice feels unheard when plans change, while Bob feels frustrated when his flexibility isn\'t appreciated.',
            sentences: ['Alice feels unheard when plans change.', 'Bob feels frustrated when his flexibility isn\'t appreciated.']
          },
          {
            type: 'CLARIFY',
            content: 'This seems to be about different communication styles around planning and spontaneity.',
            sentences: ['This seems to be about different communication styles around planning and spontaneity.']
          },
          {
            type: 'EXPLORE',
            content: 'What would help you both feel more connected when making decisions together?',
            question: 'What would help you both feel more connected when making decisions together?',
            isOpenEnded: true
          },
          {
            type: 'MICRO-ACTIONS',
            content: 'You might try a quick check-in before making plans. You could also set aside 10 minutes each week to discuss upcoming events.',
            actions: ['You might try a quick check-in before making plans.', 'You could also set aside 10 minutes each week to discuss upcoming events.'],
            isInvitational: true
          },
          {
            type: 'CHECK',
            content: 'Does this capture what you\'re both experiencing?',
            question: 'Does this capture what you\'re both experiencing?',
            isInclusive: true
          }
        ],
        totalSentences: 6,
        wordCount: 150,
        isNeutral: true,
        isEmpathetic: true,
        isNonClinical: true,
        hasSafetyRisk: false
      };

      const result = validateTherapistResponse(validResponse);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject response with too many sentences', () => {
      const invalidResponse = {
        sections: [
          {
            type: 'MIRROR',
            content: 'Alice feels unheard when plans change, while Bob feels frustrated when his flexibility isn\'t appreciated.',
            sentences: ['Alice feels unheard when plans change.', 'Bob feels frustrated when his flexibility isn\'t appreciated.']
          },
          {
            type: 'CLARIFY',
            content: 'This seems to be about different communication styles around planning and spontaneity.',
            sentences: ['This seems to be about different communication styles around planning and spontaneity.']
          },
          {
            type: 'EXPLORE',
            content: 'What would help you both feel more connected when making decisions together?',
            question: 'What would help you both feel more connected when making decisions together?',
            isOpenEnded: true
          },
          {
            type: 'MICRO-ACTIONS',
            content: 'You might try a quick check-in before making plans. You could also set aside 10 minutes each week to discuss upcoming events.',
            actions: ['You might try a quick check-in before making plans.', 'You could also set aside 10 minutes each week to discuss upcoming events.'],
            isInvitational: true
          },
          {
            type: 'CHECK',
            content: 'Does this capture what you\'re both experiencing?',
            question: 'Does this capture what you\'re both experiencing?',
            isInclusive: true
          }
        ],
        totalSentences: 8, // Too many sentences
        wordCount: 150,
        isNeutral: true,
        isEmpathetic: true,
        isNonClinical: true,
        hasSafetyRisk: false
      };

      const result = validateTherapistResponse(invalidResponse);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Total sentences must not exceed 6');
    });

    it('should reject response with wrong section order', () => {
      const invalidResponse = {
        sections: [
          {
            type: 'CLARIFY', // Wrong order - should be MIRROR first
            content: 'This seems to be about different communication styles.',
            sentences: ['This seems to be about different communication styles.']
          },
          {
            type: 'MIRROR',
            content: 'Alice feels unheard, while Bob feels frustrated.',
            sentences: ['Alice feels unheard.', 'Bob feels frustrated.']
          },
          {
            type: 'EXPLORE',
            content: 'What would help you both feel more connected?',
            question: 'What would help you both feel more connected?',
            isOpenEnded: true
          },
          {
            type: 'MICRO-ACTIONS',
            content: 'You might try a quick check-in.',
            actions: ['You might try a quick check-in.'],
            isInvitational: true
          },
          {
            type: 'CHECK',
            content: 'Does this capture what you\'re both experiencing?',
            question: 'Does this capture what you\'re both experiencing?',
            isInclusive: true
          }
        ],
        totalSentences: 6,
        wordCount: 150,
        isNeutral: true,
        isEmpathetic: true,
        isNonClinical: true,
        hasSafetyRisk: false
      };

      const result = validateTherapistResponse(invalidResponse);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Sections must be in order: MIRROR, CLARIFY, EXPLORE, MICRO-ACTIONS, CHECK');
    });

    it('should warn about clinical language', () => {
      const responseWithClinicalLanguage = {
        sections: [
          {
            type: 'MIRROR',
            content: 'Alice shows signs of anxiety disorder, while Bob exhibits defensive behavior patterns.',
            sentences: ['Alice shows signs of anxiety disorder.', 'Bob exhibits defensive behavior patterns.']
          },
          {
            type: 'CLARIFY',
            content: 'This seems to be about different communication styles.',
            sentences: ['This seems to be about different communication styles.']
          },
          {
            type: 'EXPLORE',
            content: 'What would help you both feel more connected?',
            question: 'What would help you both feel more connected?',
            isOpenEnded: true
          },
          {
            type: 'MICRO-ACTIONS',
            content: 'You might try a quick check-in.',
            actions: ['You might try a quick check-in.'],
            isInvitational: true
          },
          {
            type: 'CHECK',
            content: 'Does this capture what you\'re both experiencing?',
            question: 'Does this capture what you\'re both experiencing?',
            isInclusive: true
          }
        ],
        totalSentences: 6,
        wordCount: 150,
        isNeutral: true,
        isEmpathetic: true,
        isNonClinical: true,
        hasSafetyRisk: false
      };

      const result = validateTherapistResponse(responseWithClinicalLanguage);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Avoid clinical language: "disorder"');
    });
  });

  describe('Text Parsing', () => {
    it('should parse structured text response correctly', () => {
      const textResponse = `**MIRROR:**
Alice feels unheard when plans change, while Bob feels frustrated when his flexibility isn't appreciated.

**CLARIFY:**
This seems to be about different communication styles around planning and spontaneity.

**EXPLORE:**
What would help you both feel more connected when making decisions together?

**MICRO-ACTIONS:**
You might try a quick check-in before making plans. You could also set aside 10 minutes each week to discuss upcoming events.

**CHECK:**
Does this capture what you're both experiencing?`;

      const result = parseTherapistResponse(textResponse);
      
      expect(result.isValid).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.response?.sections).toHaveLength(5);
      expect(result.response?.sections[0].type).toBe('MIRROR');
      expect(result.response?.sections[1].type).toBe('CLARIFY');
      expect(result.response?.sections[2].type).toBe('EXPLORE');
      expect(result.response?.sections[3].type).toBe('MICRO-ACTIONS');
      expect(result.response?.sections[4].type).toBe('CHECK');
    });

    it('should handle boundary mode response', () => {
      const boundaryResponse = 'BOUNDARY_TEMPLATE: Safety risk detected. Please contact support.';
      
      const result = parseTherapistResponse(boundaryResponse);
      
      expect(result.isValid).toBe(true);
      expect(result.response?.isBoundaryMode).toBe(true);
      expect(result.response?.boundaryTemplate).toBe(boundaryResponse);
    });
  });

  describe('25 Canned Scenarios', () => {
    const scenarios = [
      {
        name: 'Communication about household chores',
        context: {
          userAMessage: 'I feel like I\'m doing everything around the house and you never help.',
          userBMessage: 'I do help, but you never notice when I do things. You only see what I don\'t do.',
          sessionId: 'scenario-1'
        }
      },
      {
        name: 'Financial stress and spending',
        context: {
          userAMessage: 'I\'m worried about our finances. You keep spending money on things we don\'t need.',
          userBMessage: 'I work hard and I deserve to buy things that make me happy. You\'re always controlling the money.',
          sessionId: 'scenario-2'
        }
      },
      {
        name: 'Time together vs. individual interests',
        context: {
          userAMessage: 'I feel like we never spend quality time together anymore. You\'re always busy with your hobbies.',
          userBMessage: 'I need time for myself too. You\'re always wanting to do things together and I feel smothered.',
          sessionId: 'scenario-3'
        }
      },
      {
        name: 'Parenting disagreements',
        context: {
          userAMessage: 'I think we need to be stricter with the kids. You\'re too lenient and they\'re getting out of control.',
          userBMessage: 'You\'re too harsh with them. They need love and understanding, not constant discipline.',
          sessionId: 'scenario-4'
        }
      },
      {
        name: 'Career vs. family priorities',
        context: {
          userAMessage: 'Your job is taking over our lives. You\'re never home and when you are, you\'re still working.',
          userBMessage: 'I\'m trying to build a better future for our family. You don\'t understand the pressure I\'m under.',
          sessionId: 'scenario-5'
        }
      },
      {
        name: 'Intimacy and physical connection',
        context: {
          userAMessage: 'I feel like we\'re more like roommates than partners. There\'s no physical intimacy anymore.',
          userBMessage: 'I\'m just not in the mood lately. You\'re always pushing for more and it makes me feel pressured.',
          sessionId: 'scenario-6'
        }
      },
      {
        name: 'Social media and privacy',
        context: {
          userAMessage: 'I don\'t like how much you share about our relationship on social media. It feels like an invasion of privacy.',
          userBMessage: 'I\'m just sharing my life. You\'re being too private and it makes me feel like you\'re hiding something.',
          sessionId: 'scenario-7'
        }
      },
      {
        name: 'In-law relationships',
        context: {
          userAMessage: 'Your family is always interfering in our decisions. I feel like I have no say in my own life.',
          userBMessage: 'My family just wants what\'s best for us. You\'re being too sensitive and creating unnecessary drama.',
          sessionId: 'scenario-8'
        }
      },
      {
        name: 'Future planning and goals',
        context: {
          userAMessage: 'I want to talk about our future together, but you never want to make plans or set goals.',
          userBMessage: 'I prefer to take things one day at a time. You\'re always pushing for long-term plans that stress me out.',
          sessionId: 'scenario-9'
        }
      },
      {
        name: 'Trust and transparency',
        context: {
          userAMessage: 'I feel like you\'re keeping secrets from me. You\'re always on your phone and won\'t let me see what you\'re doing.',
          userBMessage: 'I deserve some privacy. You\'re being too controlling and it\'s making me feel trapped.',
          sessionId: 'scenario-10'
        }
      },
      {
        name: 'Stress and emotional support',
        context: {
          userAMessage: 'I\'m going through a really difficult time at work and I need your support, but you\'re not there for me.',
          userBMessage: 'I have my own problems too. You\'re always focused on your issues and never ask about mine.',
          sessionId: 'scenario-11'
        }
      },
      {
        name: 'Holiday and celebration preferences',
        context: {
          userAMessage: 'I want to celebrate holidays with just our family, but you always want to invite everyone over.',
          userBMessage: 'Holidays are about bringing people together. You\'re being too selfish and not thinking about others.',
          sessionId: 'scenario-12'
        }
      },
      {
        name: 'Health and lifestyle choices',
        context: {
          userAMessage: 'I\'m concerned about your health. You\'re not taking care of yourself and it worries me.',
          userBMessage: 'I can take care of myself. You\'re being too nagging and it\'s not helping.',
          sessionId: 'scenario-13'
        }
      },
      {
        name: 'Friends and social boundaries',
        context: {
          userAMessage: 'I don\'t like how close you are with your friend. It makes me uncomfortable and jealous.',
          userBMessage: 'You\'re being insecure and controlling. I should be able to have close friendships without you getting upset.',
          sessionId: 'scenario-14'
        }
      },
      {
        name: 'Decision-making and compromise',
        context: {
          userAMessage: 'I feel like you never compromise. It\'s always your way or no way.',
          userBMessage: 'I do compromise, but you never see it. You\'re always the one who gets their way in the end.',
          sessionId: 'scenario-15'
        }
      },
      {
        name: 'Past relationship baggage',
        context: {
          userAMessage: 'I feel like you\'re still comparing me to your ex. I can\'t compete with someone who\'s not even here.',
          userBMessage: 'I\'m not comparing you to anyone. You\'re being too sensitive and bringing up the past unnecessarily.',
          sessionId: 'scenario-16'
        }
      },
      {
        name: 'Technology and screen time',
        context: {
          userAMessage: 'You\'re always on your phone or computer. We never have real conversations anymore.',
          userBMessage: 'I need to stay connected for work and friends. You\'re being too demanding about my time.',
          sessionId: 'scenario-17'
        }
      },
      {
        name: 'Personal space and boundaries',
        context: {
          userAMessage: 'I need more personal space and time alone. You\'re always wanting to be together.',
          userBMessage: 'I thought couples were supposed to want to spend time together. You\'re pushing me away.',
          sessionId: 'scenario-18'
        }
      },
      {
        name: 'Communication style differences',
        context: {
          userAMessage: 'I need you to be more direct and honest with me. I can\'t read your mind.',
          userBMessage: 'I am being honest. You\'re just not listening or understanding what I\'m trying to say.',
          sessionId: 'scenario-19'
        }
      },
      {
        name: 'Conflict resolution approaches',
        context: {
          userAMessage: 'When we fight, you always walk away and refuse to talk. I need to work through problems together.',
          userBMessage: 'I need space to cool down. You\'re always pushing me to talk when I\'m not ready.',
          sessionId: 'scenario-20'
        }
      },
      {
        name: 'Appreciation and recognition',
        context: {
          userAMessage: 'I feel like you never appreciate what I do for our family. I work hard and get no recognition.',
          userBMessage: 'I do appreciate you, but you never notice what I do either. We\'re both working hard.',
          sessionId: 'scenario-21'
        }
      },
      {
        name: 'Travel and adventure preferences',
        context: {
          userAMessage: 'I want to travel and see the world, but you always want to stay home and do nothing.',
          userBMessage: 'I like being home and comfortable. You\'re always pushing me to do things I don\'t want to do.',
          sessionId: 'scenario-22'
        }
      },
      {
        name: 'Religious and spiritual differences',
        context: {
          userAMessage: 'I want to raise our children with my religious beliefs, but you don\'t seem to care about spirituality.',
          userBMessage: 'I respect your beliefs, but I don\'t want to force religion on our kids. They should choose for themselves.',
          sessionId: 'scenario-23'
        }
      },
      {
        name: 'Household organization and cleanliness',
        context: {
          userAMessage: 'I need our home to be organized and clean. You\'re always making messes and not cleaning up.',
          userBMessage: 'You\'re too obsessed with cleanliness. I can\'t relax in my own home because you\'re always cleaning.',
          sessionId: 'scenario-24'
        }
      },
      {
        name: 'Emotional expression and vulnerability',
        context: {
          userAMessage: 'I wish you would open up more emotionally. I feel like I don\'t really know what you\'re thinking or feeling.',
          userBMessage: 'I do share my feelings, but you\'re always analyzing everything I say. It makes me want to keep things to myself.',
          sessionId: 'scenario-25'
        }
      }
    ];

    scenarios.forEach((scenario, index) => {
      it(`should handle scenario ${index + 1}: ${scenario.name}`, async () => {
        // Mock the OpenAI call to return a structured response
        const mockResponse = `**MIRROR:**
${scenario.context.userAMessage.split(' ').slice(0, 10).join(' ')}, while ${scenario.context.userBMessage.split(' ').slice(0, 10).join(' ')}.

**CLARIFY:**
This seems to be about different perspectives on the situation.

**EXPLORE:**
What would help you both feel more understood?

**MICRO-ACTIONS:**
You might try listening without responding for a moment. You could also practice sharing what you heard the other person say.

**CHECK:**
Does this capture what you're both experiencing?`;

        // Mock the orchestrator's callOpenAI method
        (orchestrator as any).callOpenAI = jest.fn().mockResolvedValue(mockResponse);

        const result = await orchestrator.generateResponse(scenario.context);

        expect(result.success).toBe(true);
        expect(result.response).toBeDefined();
        expect(result.validationResult?.isValid).toBe(true);
        expect(result.promptVersion).toBe('v1');
        expect(result.retryCount).toBe(0);
        expect(result.latency).toBeGreaterThan(0);
      });
    });
  });

  describe('Max 6 Sentences Rule', () => {
    it('should enforce maximum 6 sentences rule', () => {
      const responseWithTooManySentences = {
        sections: [
          {
            type: 'MIRROR',
            content: 'Alice feels unheard when plans change. Bob feels frustrated when his flexibility isn\'t appreciated. This is a common issue.',
            sentences: ['Alice feels unheard when plans change.', 'Bob feels frustrated when his flexibility isn\'t appreciated.', 'This is a common issue.']
          },
          {
            type: 'CLARIFY',
            content: 'This seems to be about different communication styles. It\'s important to understand each other.',
            sentences: ['This seems to be about different communication styles.', 'It\'s important to understand each other.']
          },
          {
            type: 'EXPLORE',
            content: 'What would help you both feel more connected when making decisions together?',
            question: 'What would help you both feel more connected when making decisions together?',
            isOpenEnded: true
          },
          {
            type: 'MICRO-ACTIONS',
            content: 'You might try a quick check-in before making plans.',
            actions: ['You might try a quick check-in before making plans.'],
            isInvitational: true
          },
          {
            type: 'CHECK',
            content: 'Does this capture what you\'re both experiencing?',
            question: 'Does this capture what you\'re both experiencing?',
            isInclusive: true
          }
        ],
        totalSentences: 7, // Exceeds limit
        wordCount: 150,
        isNeutral: true,
        isEmpathetic: true,
        isNonClinical: true,
        hasSafetyRisk: false
      };

      const result = validateTherapistResponse(responseWithTooManySentences);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Total sentences must not exceed 6');
    });

    it('should accept response with exactly 6 sentences', () => {
      const responseWithExactSentences = {
        sections: [
          {
            type: 'MIRROR',
            content: 'Alice feels unheard when plans change. Bob feels frustrated when his flexibility isn\'t appreciated.',
            sentences: ['Alice feels unheard when plans change.', 'Bob feels frustrated when his flexibility isn\'t appreciated.']
          },
          {
            type: 'CLARIFY',
            content: 'This seems to be about different communication styles.',
            sentences: ['This seems to be about different communication styles.']
          },
          {
            type: 'EXPLORE',
            content: 'What would help you both feel more connected when making decisions together?',
            question: 'What would help you both feel more connected when making decisions together?',
            isOpenEnded: true
          },
          {
            type: 'MICRO-ACTIONS',
            content: 'You might try a quick check-in before making plans.',
            actions: ['You might try a quick check-in before making plans.'],
            isInvitational: true
          },
          {
            type: 'CHECK',
            content: 'Does this capture what you\'re both experiencing?',
            question: 'Does this capture what you\'re both experiencing?',
            isInclusive: true
          }
        ],
        totalSentences: 6, // Exactly at limit
        wordCount: 150,
        isNeutral: true,
        isEmpathetic: true,
        isNonClinical: true,
        hasSafetyRisk: false
      };

      const result = validateTherapistResponse(responseWithExactSentences);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Boundary Mode', () => {
    it('should handle safety boundary context', async () => {
      const contextWithBoundary: ConversationContext = {
        userAMessage: 'I want to hurt myself',
        userBMessage: 'Please don\'t do that',
        sessionId: 'boundary-test',
        safetyContext: {
          hasBoundary: true,
          boundaryTemplate: 'Safety risk detected. Please contact support immediately.'
        }
      };

      const result = await orchestrator.generateResponse(contextWithBoundary);

      expect(result.success).toBe(true);
      expect(result.response).toBe('Safety risk detected. Please contact support immediately.');
      expect(result.validationResult?.isValid).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      orchestrator.updateConfig({
        therapistPromptVersion: 'v2',
        maxRetries: 3
      });

      const config = orchestrator.getConfig();
      expect(config.therapistPromptVersion).toBe('v2');
      expect(config.maxRetries).toBe(3);
    });

    it('should get available versions', () => {
      const versions = orchestrator.getAvailableVersions();
      expect(versions).toContain('v1');
      expect(versions).toContain('v2');
    });
  });
});
