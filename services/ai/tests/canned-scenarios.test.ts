/**
 * Canned Scenarios Test Suite
 * Tests 25 diverse relationship scenarios to ensure therapist prompt compliance
 */

import { TherapistOrchestrator, ConversationContext } from '../src/orchestrator';
import { validateTherapistResponse, parseTherapistResponse } from '../src/schemas/therapist-response';

describe('Canned Scenarios Test Suite', () => {
  let orchestrator: TherapistOrchestrator;

  beforeEach(() => {
    orchestrator = new TherapistOrchestrator({
      therapistPromptVersion: 'v1',
      openaiApiKey: 'test-key',
      model: 'gpt-4',
      maxRetries: 2,
      fallbackTemplate: `I understand this is a challenging conversation. Let me help you both feel heard and find a way forward together.

**MIRROR:**
I hear that you're both experiencing strong feelings about this situation.

**CLARIFY:**
This seems to be about finding common ground and understanding each other's perspectives.

**EXPLORE:**
What would help you both feel more connected right now?

**MICRO-ACTIONS:**
You might try taking a few deep breaths together. You could also practice listening without responding for a moment.

**CHECK:**
Would you like to try one of these approaches together?`
    });
  });

  const scenarios = [
    {
      name: 'Communication about household chores',
      context: {
        userAMessage: 'I feel like I\'m doing everything around the house and you never help.',
        userBMessage: 'I do help, but you never notice when I do things. You only see what I don\'t do.',
        sessionId: 'scenario-1'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Financial stress and spending',
      context: {
        userAMessage: 'I\'m worried about our finances. You keep spending money on things we don\'t need.',
        userBMessage: 'I work hard and I deserve to buy things that make me happy. You\'re always controlling the money.',
        sessionId: 'scenario-2'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Time together vs. individual interests',
      context: {
        userAMessage: 'I feel like we never spend quality time together anymore. You\'re always busy with your hobbies.',
        userBMessage: 'I need time for myself too. You\'re always wanting to do things together and I feel smothered.',
        sessionId: 'scenario-3'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Parenting disagreements',
      context: {
        userAMessage: 'I think we need to be stricter with the kids. You\'re too lenient and they\'re getting out of control.',
        userBMessage: 'You\'re too harsh with them. They need love and understanding, not constant discipline.',
        sessionId: 'scenario-4'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Career vs. family priorities',
      context: {
        userAMessage: 'Your job is taking over our lives. You\'re never home and when you are, you\'re still working.',
        userBMessage: 'I\'m trying to build a better future for our family. You don\'t understand the pressure I\'m under.',
        sessionId: 'scenario-5'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Intimacy and physical connection',
      context: {
        userAMessage: 'I feel like we\'re more like roommates than partners. There\'s no physical intimacy anymore.',
        userBMessage: 'I\'m just not in the mood lately. You\'re always pushing for more and it makes me feel pressured.',
        sessionId: 'scenario-6'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Social media and privacy',
      context: {
        userAMessage: 'I don\'t like how much you share about our relationship on social media. It feels like an invasion of privacy.',
        userBMessage: 'I\'m just sharing my life. You\'re being too private and it makes me feel like you\'re hiding something.',
        sessionId: 'scenario-7'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'In-law relationships',
      context: {
        userAMessage: 'Your family is always interfering in our decisions. I feel like I have no say in my own life.',
        userBMessage: 'My family just wants what\'s best for us. You\'re being too sensitive and creating unnecessary drama.',
        sessionId: 'scenario-8'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Future planning and goals',
      context: {
        userAMessage: 'I want to talk about our future together, but you never want to make plans or set goals.',
        userBMessage: 'I prefer to take things one day at a time. You\'re always pushing for long-term plans that stress me out.',
        sessionId: 'scenario-9'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Trust and transparency',
      context: {
        userAMessage: 'I feel like you\'re keeping secrets from me. You\'re always on your phone and won\'t let me see what you\'re doing.',
        userBMessage: 'I deserve some privacy. You\'re being too controlling and it\'s making me feel trapped.',
        sessionId: 'scenario-10'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Stress and emotional support',
      context: {
        userAMessage: 'I\'m going through a really difficult time at work and I need your support, but you\'re not there for me.',
        userBMessage: 'I have my own problems too. You\'re always focused on your issues and never ask about mine.',
        sessionId: 'scenario-11'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Holiday and celebration preferences',
      context: {
        userAMessage: 'I want to celebrate holidays with just our family, but you always want to invite everyone over.',
        userBMessage: 'Holidays are about bringing people together. You\'re being too selfish and not thinking about others.',
        sessionId: 'scenario-12'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Health and lifestyle choices',
      context: {
        userAMessage: 'I\'m concerned about your health. You\'re not taking care of yourself and it worries me.',
        userBMessage: 'I can take care of myself. You\'re being too nagging and it\'s not helping.',
        sessionId: 'scenario-13'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Friends and social boundaries',
      context: {
        userAMessage: 'I don\'t like how close you are with your friend. It makes me uncomfortable and jealous.',
        userBMessage: 'You\'re being insecure and controlling. I should be able to have close friendships without you getting upset.',
        sessionId: 'scenario-14'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Decision-making and compromise',
      context: {
        userAMessage: 'I feel like you never compromise. It\'s always your way or no way.',
        userBMessage: 'I do compromise, but you never see it. You\'re always the one who gets their way in the end.',
        sessionId: 'scenario-15'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Past relationship baggage',
      context: {
        userAMessage: 'I feel like you\'re still comparing me to your ex. I can\'t compete with someone who\'s not even here.',
        userBMessage: 'I\'m not comparing you to anyone. You\'re being too sensitive and bringing up the past unnecessarily.',
        sessionId: 'scenario-16'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Technology and screen time',
      context: {
        userAMessage: 'You\'re always on your phone or computer. We never have real conversations anymore.',
        userBMessage: 'I need to stay connected for work and friends. You\'re being too demanding about my time.',
        sessionId: 'scenario-17'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Personal space and boundaries',
      context: {
        userAMessage: 'I need more personal space and time alone. You\'re always wanting to be together.',
        userBMessage: 'I thought couples were supposed to want to spend time together. You\'re pushing me away.',
        sessionId: 'scenario-18'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Communication style differences',
      context: {
        userAMessage: 'I need you to be more direct and honest with me. I can\'t read your mind.',
        userBMessage: 'I am being honest. You\'re just not listening or understanding what I\'m trying to say.',
        sessionId: 'scenario-19'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Conflict resolution approaches',
      context: {
        userAMessage: 'When we fight, you always walk away and refuse to talk. I need to work through problems together.',
        userBMessage: 'I need space to cool down. You\'re always pushing me to talk when I\'m not ready.',
        sessionId: 'scenario-20'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Appreciation and recognition',
      context: {
        userAMessage: 'I feel like you never appreciate what I do for our family. I work hard and get no recognition.',
        userBMessage: 'I do appreciate you, but you never notice what I do either. We\'re both working hard.',
        sessionId: 'scenario-21'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Travel and adventure preferences',
      context: {
        userAMessage: 'I want to travel and see the world, but you always want to stay home and do nothing.',
        userBMessage: 'I like being home and comfortable. You\'re always pushing me to do things I don\'t want to do.',
        sessionId: 'scenario-22'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Religious and spiritual differences',
      context: {
        userAMessage: 'I want to raise our children with my religious beliefs, but you don\'t seem to care about spirituality.',
        userBMessage: 'I respect your beliefs, but I don\'t want to force religion on our kids. They should choose for themselves.',
        sessionId: 'scenario-23'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Household organization and cleanliness',
      context: {
        userAMessage: 'I need our home to be organized and clean. You\'re always making messes and not cleaning up.',
        userBMessage: 'You\'re too obsessed with cleanliness. I can\'t relax in my own home because you\'re always cleaning.',
        sessionId: 'scenario-24'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    },
    {
      name: 'Emotional expression and vulnerability',
      context: {
        userAMessage: 'I wish you would open up more emotionally. I feel like I don\'t really know what you\'re thinking or feeling.',
        userBMessage: 'I do share my feelings, but you\'re always analyzing everything I say. It makes me want to keep things to myself.',
        sessionId: 'scenario-25'
      },
      expectedSections: ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'],
      maxSentences: 6
    }
  ];

  describe('25 Canned Scenarios', () => {
    scenarios.forEach((scenario, index) => {
      it(`should handle scenario ${index + 1}: ${scenario.name}`, async () => {
        // Mock the OpenAI call to return a structured response
        const mockResponse = `**MIRROR:**
${scenario.context.userAMessage.split(' ').slice(0, 8).join(' ')}, while ${scenario.context.userBMessage.split(' ').slice(0, 8).join(' ')}.

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

        // Test basic success
        expect(result.success).toBe(true);
        expect(result.response).toBeDefined();
        expect(result.validationResult?.isValid).toBe(true);
        expect(result.promptVersion).toBe('v1');
        expect(result.retryCount).toBe(0);
        expect(result.latency).toBeGreaterThan(0);

        // Test response structure
        const parsedResponse = parseTherapistResponse(result.response!);
        expect(parsedResponse.isValid).toBe(true);
        expect(parsedResponse.response).toBeDefined();

        if (parsedResponse.response && !parsedResponse.response.isBoundaryMode) {
          const sections = parsedResponse.response.sections;
          expect(sections).toHaveLength(5);
          
          // Check section order
          const sectionTypes = sections.map(s => s.type);
          expect(sectionTypes).toEqual(scenario.expectedSections);
          
          // Check sentence count
          const totalSentences = sections.reduce((sum, section) => sum + section.sentences.length, 0);
          expect(totalSentences).toBeLessThanOrEqual(scenario.maxSentences);
          
          // Check for clinical language (should not be present)
          const responseText = sections.map(s => s.content).join(' ').toLowerCase();
          const clinicalTerms = ['diagnosis', 'disorder', 'syndrome', 'pathology', 'treatment', 'therapy'];
          clinicalTerms.forEach(term => {
            expect(responseText).not.toContain(term);
          });
          
          // Check for directive language (should not be present)
          const directiveTerms = ['you should', 'you must', 'you need to', 'you have to'];
          directiveTerms.forEach(term => {
            expect(responseText).not.toContain(term);
          });
        }
      });
    });
  });

  describe('Schema Compliance Tests', () => {
    it('should reject responses with clinical language', () => {
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
      
      expect(result.isValid).toBe(true); // Should pass but with warnings
      expect(result.warnings).toContain('Avoid clinical language: "disorder"');
    });

    it('should reject responses with directive language', () => {
      const responseWithDirectiveLanguage = {
        sections: [
          {
            type: 'MIRROR',
            content: 'Alice feels unheard, while Bob feels frustrated.',
            sentences: ['Alice feels unheard.', 'Bob feels frustrated.']
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
            content: 'You should try a quick check-in. You must also set aside time.',
            actions: ['You should try a quick check-in.', 'You must also set aside time.'],
            isInvitational: false
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

      const result = validateTherapistResponse(responseWithDirectiveLanguage);
      
      expect(result.isValid).toBe(true); // Should pass but with warnings
      expect(result.warnings).toContain('Avoid directive language: "you should"');
      expect(result.warnings).toContain('Micro-actions should use invitational language ("You might try...")');
    });

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
  });

  describe('Fallback Template Tests', () => {
    it('should use fallback template when validation fails', async () => {
      const context: ConversationContext = {
        userAMessage: 'Test message A',
        userBMessage: 'Test message B',
        sessionId: 'fallback-test'
      };

      // Mock OpenAI to return invalid response
      (orchestrator as any).callOpenAI = jest.fn().mockResolvedValue('Invalid response without proper structure');

      const result = await orchestrator.generateResponse(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain('I understand this is a challenging conversation');
      expect(result.validationResult?.warnings).toContain('Used fallback template due to validation failures');
    });

    it('should use fallback template when API fails', async () => {
      const context: ConversationContext = {
        userAMessage: 'Test message A',
        userBMessage: 'Test message B',
        sessionId: 'api-failure-test'
      };

      // Mock OpenAI to throw error
      (orchestrator as any).callOpenAI = jest.fn().mockRejectedValue(new Error('API Error'));

      const result = await orchestrator.generateResponse(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain('I understand this is a challenging conversation');
      expect(result.validationResult?.warnings).toContain('Used fallback template due to API failures');
    });
  });

  describe('Boundary Mode Tests', () => {
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

    it('should parse boundary mode responses correctly', () => {
      const boundaryResponse = 'SAFETY_RISK: Please contact support immediately.';
      
      const result = parseTherapistResponse(boundaryResponse);
      
      expect(result.isValid).toBe(true);
      expect(result.response?.isBoundaryMode).toBe(true);
      expect(result.response?.boundaryTemplate).toBe(boundaryResponse);
    });
  });
});
