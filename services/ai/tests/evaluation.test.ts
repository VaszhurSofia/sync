/**
 * Evaluation Harness Tests
 * Tests the A/B testing and evaluation system for prompt versions
 */

import { EvaluationHarness } from '../src/evaluation/eval-harness';
import { TherapistOrchestrator } from '../src/orchestrator';

describe('Evaluation Harness', () => {
  let orchestrator: TherapistOrchestrator;
  let evaluationHarness: EvaluationHarness;

  beforeEach(() => {
    orchestrator = new TherapistOrchestrator({
      therapistPromptVersion: 'v1',
      openaiApiKey: 'test-key',
      model: 'gpt-4',
      maxRetries: 2,
      fallbackTemplate: 'Fallback template'
    });

    evaluationHarness = new EvaluationHarness(orchestrator);
  });

  describe('Scenario Loading', () => {
    it('should load basic scenarios', () => {
      const scenarioSets = evaluationHarness.getAvailableScenarioSets();
      expect(scenarioSets).toContain('basic');
      expect(scenarioSets).toContain('complex');
      expect(scenarioSets).toContain('edge-cases');
    });

    it('should have correct number of scenarios', () => {
      expect(evaluationHarness.getScenarioCount('basic')).toBe(3);
      expect(evaluationHarness.getScenarioCount('complex')).toBe(2);
      expect(evaluationHarness.getScenarioCount('edge-cases')).toBe(3);
    });
  });

  describe('Single Version Evaluation', () => {
    it('should evaluate v1 prompt successfully', async () => {
      // Mock the orchestrator's generateResponse method
      (orchestrator as any).generateResponse = jest.fn().mockResolvedValue({
        success: true,
        response: `**MIRROR:**
I hear that you're both experiencing strong feelings about this situation.

**CLARIFY:**
This seems to be about different perspectives on communication.

**EXPLORE:**
What would help you both feel more understood?

**MICRO-ACTIONS:**
You might try listening without responding for a moment.

**CHECK:**
Does this capture what you're both experiencing?`,
        promptVersion: 'v1',
        retryCount: 0,
        latency: 1000
      });

      const report = await evaluationHarness.evaluatePromptVersion('v1', 'basic');

      expect(report.promptVersion).toBe('v1');
      expect(report.totalScenarios).toBe(3);
      expect(report.successfulResponses).toBe(3);
      expect(report.failedResponses).toBe(0);
      expect(report.schemaCompliance).toBeGreaterThan(0);
      expect(report.averageQualityScore).toBeGreaterThan(0);
      expect(report.results).toHaveLength(3);
    });

    it('should evaluate v2 prompt successfully', async () => {
      // Mock the orchestrator's generateResponse method
      (orchestrator as any).generateResponse = jest.fn().mockResolvedValue({
        success: true,
        response: `**MIRROR:**
Alice feels frustrated and unheard when plans change, while Bob feels hurt when his flexibility isn't recognized.

**CLARIFY:**
This seems to be about different communication styles around planning and spontaneity, where both partners have valid needs.

**EXPLORE:**
What does feeling respected in decision-making look like for each of you?

**MICRO-ACTIONS:**
You might try a gentle check-in: "I'd love to make sure this works for both of us."

**CHECK:**
How does this feel for each of you?`,
        promptVersion: 'v2',
        retryCount: 0,
        latency: 1200
      });

      const report = await evaluationHarness.evaluatePromptVersion('v2', 'basic');

      expect(report.promptVersion).toBe('v2');
      expect(report.totalScenarios).toBe(3);
      expect(report.successfulResponses).toBe(3);
      expect(report.failedResponses).toBe(0);
      expect(report.schemaCompliance).toBeGreaterThan(0);
      expect(report.averageQualityScore).toBeGreaterThan(0);
    });

    it('should handle evaluation failures gracefully', async () => {
      // Mock the orchestrator to fail for some scenarios
      (orchestrator as any).generateResponse = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          response: 'Valid response',
          promptVersion: 'v1',
          retryCount: 0,
          latency: 1000
        })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          success: true,
          response: 'Another valid response',
          promptVersion: 'v1',
          retryCount: 0,
          latency: 1000
        });

      const report = await evaluationHarness.evaluatePromptVersion('v1', 'basic');

      expect(report.totalScenarios).toBe(3);
      expect(report.successfulResponses).toBe(2);
      expect(report.failedResponses).toBe(1);
      expect(report.results.some(r => !r.success)).toBe(true);
    });
  });

  describe('A/B Testing', () => {
    it('should run A/B test between v1 and v2', async () => {
      // Mock different responses for different versions
      (orchestrator as any).generateResponse = jest.fn()
        .mockImplementation(async (context) => {
          const version = (orchestrator as any).config.therapistPromptVersion;
          if (version === 'v1') {
            return {
              success: true,
              response: `**MIRROR:**
I hear that you're both experiencing strong feelings.

**CLARIFY:**
This seems to be about different perspectives.

**EXPLORE:**
What would help you both feel more understood?

**MICRO-ACTIONS:**
You might try listening without responding.

**CHECK:**
Does this capture what you're both experiencing?`,
              promptVersion: 'v1',
              retryCount: 0,
              latency: 1000
            };
          } else {
            return {
              success: true,
              response: `**MIRROR:**
Alice feels frustrated and unheard, while Bob feels hurt when his flexibility isn't recognized.

**CLARIFY:**
This seems to be about different communication styles, where both partners have valid needs.

**EXPLORE:**
What does feeling respected in decision-making look like for each of you?

**MICRO-ACTIONS:**
You might try a gentle check-in: "I'd love to make sure this works for both of us."

**CHECK:**
How does this feel for each of you?`,
              promptVersion: 'v2',
              retryCount: 0,
              latency: 1200
            };
          }
        });

      const abTestResult = await evaluationHarness.runABTest({
        versions: ['v1', 'v2'],
        scenarioSet: 'basic',
        randomizeOrder: false,
        includeSurveyRatings: false
      });

      expect(abTestResult.reports).toHaveLength(2);
      expect(abTestResult.reports[0].promptVersion).toBe('v1');
      expect(abTestResult.reports[1].promptVersion).toBe('v2');
      expect(abTestResult.comparison.winner).toBeDefined();
      expect(abTestResult.comparison.scoreDifference).toBeDefined();
    });

    it('should identify significant differences', async () => {
      // Mock v2 to be significantly better
      (orchestrator as any).generateResponse = jest.fn()
        .mockImplementation(async (context) => {
          const version = (orchestrator as any).config.therapistPromptVersion;
          if (version === 'v1') {
            return {
              success: true,
              response: `**MIRROR:**
I hear that you're both experiencing strong feelings.

**CLARIFY:**
This seems to be about different perspectives.

**EXPLORE:**
What would help you both feel more understood?

**MICRO-ACTIONS:**
You might try listening without responding.

**CHECK:**
Does this capture what you're both experiencing?`,
              promptVersion: 'v1',
              retryCount: 0,
              latency: 1000
            };
          } else {
            return {
              success: true,
              response: `**MIRROR:**
Alice feels frustrated and unheard when plans change, while Bob feels hurt when his flexibility isn't recognized.

**CLARIFY:**
This seems to be about different communication styles around planning and spontaneity, where both partners have valid needs that aren't being met.

**EXPLORE:**
What does feeling respected in decision-making look like for each of you?

**MICRO-ACTIONS:**
You might try a gentle check-in: "I'd love to make sure this works for both of us." You could also practice acknowledging each other's strengths before discussing changes.

**CHECK:**
How does this feel for each of you?`,
              promptVersion: 'v2',
              retryCount: 0,
              latency: 1200
            };
          }
        });

      const abTestResult = await evaluationHarness.runABTest({
        versions: ['v1', 'v2'],
        scenarioSet: 'basic',
        randomizeOrder: false,
        includeSurveyRatings: false
      });

      expect(abTestResult.comparison.winner).toBe('v2');
      expect(abTestResult.comparison.scoreDifference).toBeGreaterThan(0);
    });
  });

  describe('Quality Scoring', () => {
    it('should calculate neutrality score correctly', async () => {
      // Mock response with bias indicators
      (orchestrator as any).generateResponse = jest.fn().mockResolvedValue({
        success: true,
        response: `**MIRROR:**
I hear that you're both experiencing strong feelings.

**CLARIFY:**
This seems to be about different perspectives.

**EXPLORE:**
What would help you both feel more understood?

**MICRO-ACTIONS:**
You should try listening without responding.

**CHECK:**
Does this capture what you're both experiencing?`,
        promptVersion: 'v1',
        retryCount: 0,
        latency: 1000
      });

      const report = await evaluationHarness.evaluatePromptVersion('v1', 'basic');

      expect(report.qualityBreakdown.neutrality).toBeLessThan(1); // Should be penalized for "You should"
    });

    it('should calculate empathy score correctly', async () => {
      // Mock response with empathy indicators
      (orchestrator as any).generateResponse = jest.fn().mockResolvedValue({
        success: true,
        response: `**MIRROR:**
I hear that you're both experiencing strong feelings and I understand your concerns.

**CLARIFY:**
This seems to be about different perspectives and I appreciate both of your viewpoints.

**EXPLORE:**
What would help you both feel more understood and supported?

**MICRO-ACTIONS:**
You might try listening without responding to show you care.

**CHECK:**
Does this capture what you're both experiencing?`,
        promptVersion: 'v1',
        retryCount: 0,
        latency: 1000
      });

      const report = await evaluationHarness.evaluatePromptVersion('v1', 'basic');

      expect(report.qualityBreakdown.empathy).toBeGreaterThan(0.5); // Should have high empathy score
    });

    it('should calculate structure score correctly', async () => {
      // Mock response with invalid structure
      (orchestrator as any).generateResponse = jest.fn().mockResolvedValue({
        success: true,
        response: `This is not a properly structured response. It doesn't follow the required format.`,
        promptVersion: 'v1',
        retryCount: 0,
        latency: 1000
      });

      const report = await evaluationHarness.evaluatePromptVersion('v1', 'basic');

      expect(report.qualityBreakdown.structure).toBeLessThan(1); // Should be penalized for invalid structure
    });

    it('should calculate safety score correctly', async () => {
      // Mock response with safety boundary
      (orchestrator as any).generateResponse = jest.fn().mockResolvedValue({
        success: true,
        response: 'BOUNDARY_TEMPLATE: Safety risk detected. Please contact support immediately.',
        promptVersion: 'v1',
        retryCount: 0,
        latency: 1000
      });

      const report = await evaluationHarness.evaluatePromptVersion('v1', 'edge-cases');

      expect(report.qualityBreakdown.safety).toBe(1); // Should have perfect safety score for proper boundary handling
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive report', async () => {
      (orchestrator as any).generateResponse = jest.fn().mockResolvedValue({
        success: true,
        response: `**MIRROR:**
I hear that you're both experiencing strong feelings.

**CLARIFY:**
This seems to be about different perspectives.

**EXPLORE:**
What would help you both feel more understood?

**MICRO-ACTIONS:**
You might try listening without responding.

**CHECK:**
Does this capture what you're both experiencing?`,
        promptVersion: 'v1',
        retryCount: 0,
        latency: 1000
      });

      const report = await evaluationHarness.evaluatePromptVersion('v1', 'basic');

      expect(report).toHaveProperty('promptVersion');
      expect(report).toHaveProperty('totalScenarios');
      expect(report).toHaveProperty('successfulResponses');
      expect(report).toHaveProperty('failedResponses');
      expect(report).toHaveProperty('averageLatency');
      expect(report).toHaveProperty('averageRetryCount');
      expect(report).toHaveProperty('schemaCompliance');
      expect(report).toHaveProperty('averageQualityScore');
      expect(report).toHaveProperty('qualityBreakdown');
      expect(report).toHaveProperty('commonErrors');
      expect(report).toHaveProperty('commonWarnings');
      expect(report).toHaveProperty('results');
      expect(report).toHaveProperty('timestamp');
    });

    it('should track common errors and warnings', async () => {
      // Mock response with validation errors
      (orchestrator as any).generateResponse = jest.fn().mockResolvedValue({
        success: true,
        response: `**MIRROR:**
I hear that you're both experiencing strong feelings.

**CLARIFY:**
This seems to be about different perspectives.

**EXPLORE:**
What would help you both feel more understood?

**MICRO-ACTIONS:**
You should try listening without responding.

**CHECK:**
Does this capture what you're both experiencing?`,
        promptVersion: 'v1',
        retryCount: 0,
        latency: 1000
      });

      const report = await evaluationHarness.evaluatePromptVersion('v1', 'basic');

      expect(report.commonErrors).toBeDefined();
      expect(report.commonWarnings).toBeDefined();
      expect(Array.isArray(report.commonErrors)).toBe(true);
      expect(Array.isArray(report.commonWarnings)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short messages', async () => {
      (orchestrator as any).generateResponse = jest.fn().mockResolvedValue({
        success: true,
        response: `**MIRROR:**
I hear that you're both experiencing strong feelings.

**CLARIFY:**
This seems to be about different perspectives.

**EXPLORE:**
What would help you both feel more understood?

**MICRO-ACTIONS:**
You might try listening without responding.

**CHECK:**
Does this capture what you're both experiencing?`,
        promptVersion: 'v1',
        retryCount: 0,
        latency: 1000
      });

      const report = await evaluationHarness.evaluatePromptVersion('v1', 'edge-cases');

      expect(report.totalScenarios).toBe(3);
      expect(report.successfulResponses).toBe(3);
    });

    it('should handle safety boundary scenarios', async () => {
      (orchestrator as any).generateResponse = jest.fn().mockResolvedValue({
        success: true,
        response: 'BOUNDARY_TEMPLATE: Safety risk detected. Please contact support immediately.',
        promptVersion: 'v1',
        retryCount: 0,
        latency: 1000
      });

      const report = await evaluationHarness.evaluatePromptVersion('v1', 'edge-cases');

      expect(report.totalScenarios).toBe(3);
      expect(report.successfulResponses).toBe(3);
      expect(report.qualityBreakdown.safety).toBe(1);
    });
  });
});
