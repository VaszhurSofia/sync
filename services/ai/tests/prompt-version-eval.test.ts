/**
 * Prompt Version Evaluation Tests
 * Tests for PR-AI-24: Prompt Versioning + Outcome Correlation
 */

import { PromptVersionEvaluator, PromptVersionConfig, VersionCorrelationResult } from '../src/scripts/prompt-version-eval';
import { TherapistOrchestrator } from '../src/orchestrator';

describe('Prompt Version Evaluation Tests', () => {
  let evaluator: PromptVersionEvaluator;
  let mockOrchestrator: jest.Mocked<TherapistOrchestrator>;

  beforeEach(() => {
    mockOrchestrator = {
      updateConfig: jest.fn(),
      generateResponse: jest.fn()
    } as any;

    evaluator = new PromptVersionEvaluator(mockOrchestrator);
  });

  describe('Version Correlation', () => {
    it('should calculate version metrics correctly', () => {
      const mockResults = [
        {
          success: true,
          metrics: { latency: 1500, retryCount: 0 },
          usedFallback: false
        },
        {
          success: true,
          metrics: { latency: 2000, retryCount: 1 },
          usedFallback: false
        },
        {
          success: false,
          metrics: { latency: 3000, retryCount: 2 },
          usedFallback: true
        }
      ];

      // Access private method for testing
      const calculateMetrics = (evaluator as any).calculateVersionMetrics.bind(evaluator);
      const result = calculateMetrics('v1.2', mockResults);

      expect(result.version).toBe('v1.2');
      expect(result.totalResponses).toBe(3);
      expect(result.successRate).toBe(2/3);
      expect(result.fallbackRate).toBe(1/3);
      expect(result.averageLatency).toBe((1500 + 2000 + 3000) / 3);
    });

    it('should simulate survey ratings based on response quality', () => {
      const goodResult = {
        success: true,
        metrics: { latency: 1000, retryCount: 0 },
        usedFallback: false
      };

      const badResult = {
        success: true,
        metrics: { latency: 5000, retryCount: 2 },
        usedFallback: true
      };

      // Access private method for testing
      const simulateRating = (evaluator as any).simulateSurveyRating.bind(evaluator);
      
      const goodRating = simulateRating(goodResult);
      const badRating = simulateRating(badResult);

      expect(goodRating.score).toBeGreaterThan(badRating.score);
      expect(goodRating.emoji).toBe('😊');
      expect(badRating.emoji).toBe('😡');
    });
  });

  describe('Export Functions', () => {
    it('should export results to CSV format', () => {
      const results: VersionCorrelationResult[] = [
        {
          version: 'v1.2',
          totalResponses: 10,
          averageRating: 2.5,
          ratingDistribution: { negative: 2, neutral: 3, positive: 5 },
          successRate: 0.9,
          averageLatency: 1500,
          fallbackRate: 0.1
        }
      ];

      // Mock writeFileSync
      const writeFileSync = jest.fn();
      jest.doMock('fs', () => ({ writeFileSync }));

      evaluator.exportToCSV(results, 'test-results.csv');

      expect(writeFileSync).toHaveBeenCalledWith(
        'test-results.csv',
        expect.stringContaining('Version,Total Responses,Average Rating')
      );
    });

    it('should export results to JSON format', () => {
      const results: VersionCorrelationResult[] = [
        {
          version: 'v1.2',
          totalResponses: 10,
          averageRating: 2.5,
          ratingDistribution: { negative: 2, neutral: 3, positive: 5 },
          successRate: 0.9,
          averageLatency: 1500,
          fallbackRate: 0.1
        }
      ];

      // Mock writeFileSync
      const writeFileSync = jest.fn();
      jest.doMock('fs', () => ({ writeFileSync }));

      evaluator.exportToJSON(results, 'test-results.json');

      expect(writeFileSync).toHaveBeenCalledWith(
        'test-results.json',
        expect.stringContaining('"version":"v1.2"')
      );
    });

    it('should generate evaluation report', () => {
      const results: VersionCorrelationResult[] = [
        {
          version: 'v1.2',
          totalResponses: 10,
          averageRating: 2.8,
          ratingDistribution: { negative: 1, neutral: 2, positive: 7 },
          successRate: 0.95,
          averageLatency: 1200,
          fallbackRate: 0.05
        },
        {
          version: 'v1.2a',
          totalResponses: 10,
          averageRating: 2.2,
          ratingDistribution: { negative: 3, neutral: 4, positive: 3 },
          successRate: 0.8,
          averageLatency: 1800,
          fallbackRate: 0.2
        }
      ];

      const report = evaluator.generateReport(results);

      expect(report).toContain('Best Version: v1.2');
      expect(report).toContain('Worst Version: v1.2a');
      expect(report).toContain('Total Versions Tested: 2');
      expect(report).toContain('v1.2');
      expect(report).toContain('v1.2a');
    });
  });

  describe('Configuration', () => {
    it('should handle environment variables for configuration', () => {
      const originalEnv = process.env;
      
      process.env.THERAPIST_PROMPT_VERSIONS = 'v1.2,v1.2a,v1.2b';
      process.env.EVAL_SAMPLE_SIZE = '50';
      
      // Test that environment variables are read correctly
      expect(process.env.THERAPIST_PROMPT_VERSIONS).toBe('v1.2,v1.2a,v1.2b');
      expect(process.env.EVAL_SAMPLE_SIZE).toBe('50');
      
      process.env = originalEnv;
    });
  });

  describe('Rating Simulation', () => {
    it('should assign higher ratings to better responses', () => {
      const excellentResult = {
        success: true,
        metrics: { latency: 800, retryCount: 0 },
        usedFallback: false
      };

      const poorResult = {
        success: true,
        metrics: { latency: 4000, retryCount: 2 },
        usedFallback: true
      };

      // Access private method for testing
      const simulateRating = (evaluator as any).simulateSurveyRating.bind(evaluator);
      
      const excellentRating = simulateRating(excellentResult);
      const poorRating = simulateRating(poorResult);

      expect(excellentRating.score).toBeGreaterThan(poorRating.score);
      expect(excellentRating.emoji).toBe('😊');
      expect(poorRating.emoji).toBe('😡');
    });

    it('should handle edge cases in rating simulation', () => {
      const edgeCaseResult = {
        success: true,
        metrics: { latency: 2500, retryCount: 1 },
        usedFallback: false
      };

      // Access private method for testing
      const simulateRating = (evaluator as any).simulateSurveyRating.bind(evaluator);
      const rating = simulateRating(edgeCaseResult);

      expect(rating.score).toBeGreaterThanOrEqual(1);
      expect(rating.score).toBeLessThanOrEqual(3);
      expect(['😡', '😐', '😊']).toContain(rating.emoji);
    });
  });
});
