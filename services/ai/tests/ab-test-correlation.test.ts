/**
 * A/B Test and Correlation Analysis Tests
 * Tests prompt versioning, A/B testing, and survey correlation analysis
 */

import { TherapistOrchestrator } from '../src/orchestrator';
import { EvaluationHarness, ABTestConfig } from '../src/evaluation/eval-harness';
import { SurveyCorrelationAnalyzer, SurveyRating } from '../src/evaluation/survey-correlation';

describe('A/B Test and Correlation Analysis', () => {
  let orchestrator: TherapistOrchestrator;
  let evaluationHarness: EvaluationHarness;
  let correlationAnalyzer: SurveyCorrelationAnalyzer;

  beforeEach(() => {
    orchestrator = new TherapistOrchestrator({
      therapistPromptVersion: 'v1',
      openaiApiKey: 'test-key',
      model: 'gpt-4',
      maxRetries: 2,
      fallbackTemplate: 'Fallback template'
    });
    
    evaluationHarness = new EvaluationHarness(orchestrator);
    correlationAnalyzer = new SurveyCorrelationAnalyzer();
  });

  describe('Prompt Versioning', () => {
    it('should support multiple prompt versions', () => {
      const versions = orchestrator.getAvailableVersions();
      expect(versions).toContain('v1');
      expect(versions).toContain('v2');
    });

    it('should switch between prompt versions', () => {
      orchestrator.updateConfig({ therapistPromptVersion: 'v2' });
      const config = orchestrator.getConfig();
      expect(config.therapistPromptVersion).toBe('v2');
    });

    it('should maintain version-specific configuration', () => {
      const v1Config = { therapistPromptVersion: 'v1', maxRetries: 1 };
      const v2Config = { therapistPromptVersion: 'v2', maxRetries: 3 };
      
      orchestrator.updateConfig(v1Config);
      expect(orchestrator.getConfig().therapistPromptVersion).toBe('v1');
      expect(orchestrator.getConfig().maxRetries).toBe(1);
      
      orchestrator.updateConfig(v2Config);
      expect(orchestrator.getConfig().therapistPromptVersion).toBe('v2');
      expect(orchestrator.getConfig().maxRetries).toBe(3);
    });
  });

  describe('A/B Testing', () => {
    it('should run A/B test between prompt versions', async () => {
      const config: ABTestConfig = {
        versions: ['v1', 'v2'],
        scenarioSet: 'basic',
        randomizeOrder: false,
        includeSurveyRatings: false,
        sessionLogging: true,
        correlationAnalysis: false
      };

      // Mock the orchestrator's callOpenAI method
      (orchestrator as any).callOpenAI = jest.fn().mockResolvedValue(`**MIRROR:**
Test response for scenario.

**CLARIFY:**
This seems to be about different perspectives.

**EXPLORE:**
What would help you both feel more understood?

**MICRO-ACTIONS:**
You might try listening without responding for a moment.

**CHECK:**
Does this capture what you're both experiencing?`);

      const result = await evaluationHarness.runABTest(config);

      expect(result.reports).toHaveLength(2);
      expect(result.comparison).toBeDefined();
      expect(result.comparison.winner).toBeDefined();
      expect(result.sessionLogs).toBeDefined();
      expect(result.sessionLogs!.length).toBeGreaterThan(0);
    });

    it('should log session data without content', async () => {
      const config: ABTestConfig = {
        versions: ['v1'],
        scenarioSet: 'basic',
        randomizeOrder: false,
        includeSurveyRatings: false,
        sessionLogging: true,
        correlationAnalysis: false
      };

      // Mock the orchestrator's callOpenAI method
      (orchestrator as any).callOpenAI = jest.fn().mockResolvedValue(`**MIRROR:**
Test response.

**CLARIFY:**
This seems to be about different perspectives.

**EXPLORE:**
What would help you both feel more understood?

**MICRO-ACTIONS:**
You might try listening without responding for a moment.

**CHECK:**
Does this capture what you're both experiencing?`);

      await evaluationHarness.runABTest(config);
      const sessionLogs = evaluationHarness.getSessionLogs();

      expect(sessionLogs.length).toBeGreaterThan(0);
      sessionLogs.forEach(log => {
        expect(log.sessionId).toBeDefined();
        expect(log.promptVersion).toBeDefined();
        expect(log.timestamp).toBeDefined();
        expect(log.metrics).toBeDefined();
        expect(log.metrics.latency).toBeGreaterThanOrEqual(0);
        expect(log.metrics.retryCount).toBeGreaterThanOrEqual(0);
        expect(typeof log.metrics.success).toBe('boolean');
        expect(typeof log.metrics.schemaCompliant).toBe('boolean');
        // Ensure no content fields are present
        expect(log).not.toHaveProperty('content');
        expect(log).not.toHaveProperty('response');
        expect(log).not.toHaveProperty('userAMessage');
        expect(log).not.toHaveProperty('userBMessage');
      });
    });

    it('should compare prompt versions correctly', async () => {
      const config: ABTestConfig = {
        versions: ['v1', 'v2'],
        scenarioSet: 'basic',
        randomizeOrder: false,
        includeSurveyRatings: false,
        sessionLogging: false,
        correlationAnalysis: false
      };

      // Mock different responses for different versions
      (orchestrator as any).callOpenAI = jest.fn()
        .mockResolvedValueOnce(`**MIRROR:**
Version 1 response.

**CLARIFY:**
This seems to be about different perspectives.

**EXPLORE:**
What would help you both feel more understood?

**MICRO-ACTIONS:**
You might try listening without responding for a moment.

**CHECK:**
Does this capture what you're both experiencing?`)
        .mockResolvedValueOnce(`**MIRROR:**
Version 2 response.

**CLARIFY:**
This seems to be about different perspectives.

**EXPLORE:**
What would help you both feel more understood?

**MICRO-ACTIONS:**
You might try listening without responding for a moment.

**CHECK:**
Does this capture what you're both experiencing?`);

      const result = await evaluationHarness.runABTest(config);

      expect(result.reports).toHaveLength(2);
      expect(result.comparison.winner).toBeDefined();
      expect(result.comparison.scoreDifference).toBeDefined();
      expect(typeof result.comparison.significantDifference).toBe('boolean');
    });
  });

  describe('Survey Correlation Analysis', () => {
    it('should analyze survey ratings correlation', async () => {
      const mockRatings: SurveyRating[] = [
        {
          sessionId: 'session-1',
          promptVersion: 'v1',
          rating: 4,
          feedback: 'Very helpful and empathetic',
          timestamp: new Date()
        },
        {
          sessionId: 'session-2',
          promptVersion: 'v1',
          rating: 5,
          feedback: 'Excellent guidance and clear structure',
          timestamp: new Date()
        },
        {
          sessionId: 'session-3',
          promptVersion: 'v2',
          rating: 3,
          feedback: 'Good but a bit generic',
          timestamp: new Date()
        },
        {
          sessionId: 'session-4',
          promptVersion: 'v2',
          rating: 2,
          feedback: 'Too clinical and not helpful',
          timestamp: new Date()
        }
      ];

      const mockEvaluationResults = [
        { promptVersion: 'v1', averageQualityScore: 0.85 },
        { promptVersion: 'v2', averageQualityScore: 0.65 }
      ];

      const report = await correlationAnalyzer.analyzeCorrelation(mockRatings, mockEvaluationResults);

      expect(report.promptVersions).toHaveLength(2);
      expect(report.statisticalSignificance).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify best performing version', async () => {
      const mockRatings: SurveyRating[] = [
        {
          sessionId: 'session-1',
          promptVersion: 'v1',
          rating: 5,
          feedback: 'Excellent',
          timestamp: new Date()
        },
        {
          sessionId: 'session-2',
          promptVersion: 'v1',
          rating: 4,
          feedback: 'Very good',
          timestamp: new Date()
        },
        {
          sessionId: 'session-3',
          promptVersion: 'v2',
          rating: 2,
          feedback: 'Poor',
          timestamp: new Date()
        },
        {
          sessionId: 'session-4',
          promptVersion: 'v2',
          rating: 3,
          feedback: 'Average',
          timestamp: new Date()
        }
      ];

      const report = await correlationAnalyzer.analyzeCorrelation(mockRatings, []);

      const v1Data = report.promptVersions.find(v => v.promptVersion === 'v1');
      const v2Data = report.promptVersions.find(v => v.promptVersion === 'v2');

      expect(v1Data).toBeDefined();
      expect(v2Data).toBeDefined();
      expect(v1Data!.averageRating).toBeGreaterThan(v2Data!.averageRating);
    });

    it('should analyze feedback keywords', async () => {
      const mockRatings: SurveyRating[] = [
        {
          sessionId: 'session-1',
          promptVersion: 'v1',
          rating: 5,
          feedback: 'Very helpful and empathetic response',
          timestamp: new Date()
        },
        {
          sessionId: 'session-2',
          promptVersion: 'v1',
          rating: 4,
          feedback: 'Clear and supportive guidance',
          timestamp: new Date()
        },
        {
          sessionId: 'session-3',
          promptVersion: 'v2',
          rating: 2,
          feedback: 'Too clinical and generic response',
          timestamp: new Date()
        },
        {
          sessionId: 'session-4',
          promptVersion: 'v2',
          rating: 3,
          feedback: 'Confusing and unhelpful',
          timestamp: new Date()
        }
      ];

      const report = await correlationAnalyzer.analyzeCorrelation(mockRatings, []);

      const v1Data = report.promptVersions.find(v => v.promptVersion === 'v1');
      const v2Data = report.promptVersions.find(v => v.promptVersion === 'v2');

      expect(v1Data!.feedbackAnalysis.positiveKeywords.length).toBeGreaterThan(0);
      expect(v2Data!.feedbackAnalysis.negativeKeywords.length).toBeGreaterThan(0);
    });

    it('should export correlation data', async () => {
      const mockRatings: SurveyRating[] = [
        {
          sessionId: 'session-1',
          promptVersion: 'v1',
          rating: 4,
          feedback: 'Good response',
          timestamp: new Date()
        }
      ];

      const report = await correlationAnalyzer.analyzeCorrelation(mockRatings, []);
      const exportData = correlationAnalyzer.exportCorrelationData(report);

      expect(exportData.csv).toContain('Prompt Version,Average Rating');
      expect(exportData.json).toContain('"promptVersions"');
      expect(exportData.csv).toContain('v1');
      expect(exportData.json).toContain('v1');
    });
  });

  describe('Integration Tests', () => {
    it('should run complete A/B test with correlation analysis', async () => {
      const config: ABTestConfig = {
        versions: ['v1', 'v2'],
        scenarioSet: 'basic',
        randomizeOrder: false,
        includeSurveyRatings: true,
        sessionLogging: true,
        correlationAnalysis: true
      };

      // Mock the orchestrator's callOpenAI method
      (orchestrator as any).callOpenAI = jest.fn().mockResolvedValue(`**MIRROR:**
Test response.

**CLARIFY:**
This seems to be about different perspectives.

**EXPLORE:**
What would help you both feel more understood?

**MICRO-ACTIONS:**
You might try listening without responding for a moment.

**CHECK:**
Does this capture what you're both experiencing?`);

      const result = await evaluationHarness.runABTest(config);

      expect(result.reports).toHaveLength(2);
      expect(result.comparison).toBeDefined();
      expect(result.sessionLogs).toBeDefined();
      expect(result.correlationReport).toBeDefined();
    });

    it('should handle A/B test with different scenario sets', async () => {
      const scenarioSets = ['basic', 'complex', 'edge-cases'];
      
      for (const scenarioSet of scenarioSets) {
        const config: ABTestConfig = {
          versions: ['v1'],
          scenarioSet,
          randomizeOrder: false,
          includeSurveyRatings: false,
          sessionLogging: true,
          correlationAnalysis: false
        };

        // Mock the orchestrator's callOpenAI method
        (orchestrator as any).callOpenAI = jest.fn().mockResolvedValue(`**MIRROR:**
Test response for ${scenarioSet}.

**CLARIFY:**
This seems to be about different perspectives.

**EXPLORE:**
What would help you both feel more understood?

**MICRO-ACTIONS:**
You might try listening without responding for a moment.

**CHECK:**
Does this capture what you're both experiencing?`);

        const result = await evaluationHarness.runABTest(config);

        expect(result.reports).toHaveLength(1);
        expect(result.reports[0].totalScenarios).toBeGreaterThan(0);
        expect(result.sessionLogs).toBeDefined();
      }
    });
  });

  describe('Session Logging Privacy', () => {
    it('should not log any content in session logs', async () => {
      const config: ABTestConfig = {
        versions: ['v1'],
        scenarioSet: 'basic',
        randomizeOrder: false,
        includeSurveyRatings: false,
        sessionLogging: true,
        correlationAnalysis: false
      };

      // Mock the orchestrator's callOpenAI method
      (orchestrator as any).callOpenAI = jest.fn().mockResolvedValue(`**MIRROR:**
Sensitive user message content here.

**CLARIFY:**
This seems to be about different perspectives.

**EXPLORE:**
What would help you both feel more understood?

**MICRO-ACTIONS:**
You might try listening without responding for a moment.

**CHECK:**
Does this capture what you're both experiencing?`);

      await evaluationHarness.runABTest(config);
      const sessionLogs = evaluationHarness.getSessionLogs();

      // Verify no content is logged
      sessionLogs.forEach(log => {
        const logString = JSON.stringify(log);
        expect(logString).not.toContain('Sensitive user message content');
        expect(logString).not.toContain('userAMessage');
        expect(logString).not.toContain('userBMessage');
        expect(logString).not.toContain('response');
        expect(logString).not.toContain('content');
      });
    });

    it('should clear session logs', () => {
      // Add some mock session logs
      evaluationHarness.getSessionLogs().push({
        sessionId: 'test-session',
        promptVersion: 'v1',
        timestamp: new Date(),
        metrics: {
          latency: 100,
          retryCount: 0,
          success: true,
          schemaCompliant: true
        }
      });

      expect(evaluationHarness.getSessionLogs().length).toBeGreaterThan(0);
      
      evaluationHarness.clearSessionLogs();
      
      expect(evaluationHarness.getSessionLogs().length).toBe(0);
    });
  });
});
