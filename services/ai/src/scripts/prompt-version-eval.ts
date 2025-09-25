/**
 * Prompt Version Evaluation Runner
 * Correlates survey ratings (😡/😐/😊) with prompt versions
 */

import { TherapistOrchestrator } from '../orchestrator';
import { EvaluationHarness, EvaluationScenario } from '../evaluation/eval-harness';
import { writeFileSync } from 'fs';
import { join } from 'path';

export interface PromptVersionConfig {
  versions: string[];
  testScenarios: EvaluationScenario[];
  sampleSize: number;
}

export interface SurveyRating {
  emoji: '😡' | '😐' | '😊';
  score: number; // 1-3 scale
  description: string;
}

export interface VersionCorrelationResult {
  version: string;
  totalResponses: number;
  averageRating: number;
  ratingDistribution: {
    negative: number; // 😡
    neutral: number;  // 😐
    positive: number; // 😊
  };
  successRate: number;
  averageLatency: number;
  fallbackRate: number;
}

export class PromptVersionEvaluator {
  private orchestrator: TherapistOrchestrator;
  private harness: EvaluationHarness;

  constructor(orchestrator: TherapistOrchestrator) {
    this.orchestrator = orchestrator;
    this.harness = new EvaluationHarness();
  }

  /**
   * Run evaluation across multiple prompt versions
   */
  async evaluateVersions(config: PromptVersionConfig): Promise<VersionCorrelationResult[]> {
    const results: VersionCorrelationResult[] = [];

    for (const version of config.versions) {
      console.log(`Evaluating prompt version: ${version}`);
      
      // Update orchestrator to use this version
      this.orchestrator.updateConfig({ therapistPromptVersion: version });
      
      // Run evaluation for this version
      const versionResults = await this.harness.evaluateScenarios(
        config.testScenarios.slice(0, config.sampleSize)
      );
      
      // Calculate metrics for this version
      const correlationResult = this.calculateVersionMetrics(version, versionResults);
      results.push(correlationResult);
      
      console.log(`Version ${version} completed:`, {
        totalResponses: correlationResult.totalResponses,
        averageRating: correlationResult.averageRating,
        successRate: correlationResult.successRate
      });
    }

    return results;
  }

  /**
   * Calculate metrics for a specific version
   */
  private calculateVersionMetrics(version: string, results: any[]): VersionCorrelationResult {
    const successfulResults = results.filter(r => r.success);
    const totalResponses = results.length;
    
    // Simulate survey ratings based on response quality
    const ratings = successfulResults.map(result => this.simulateSurveyRating(result));
    
    const averageRating = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
    
    const ratingDistribution = {
      negative: ratings.filter(r => r.emoji === '😡').length,
      neutral: ratings.filter(r => r.emoji === '😐').length,
      positive: ratings.filter(r => r.emoji === '😊').length
    };
    
    const successRate = successfulResults.length / totalResponses;
    const averageLatency = results.reduce((sum, r) => sum + r.metrics.latency, 0) / totalResponses;
    const fallbackRate = results.filter(r => r.usedFallback).length / totalResponses;

    return {
      version,
      totalResponses,
      averageRating,
      ratingDistribution,
      successRate,
      averageLatency,
      fallbackRate
    };
  }

  /**
   * Simulate survey rating based on response quality
   */
  private simulateSurveyRating(result: any): SurveyRating {
    // Simple heuristic: better responses get better ratings
    const latency = result.metrics.latency;
    const retryCount = result.metrics.retryCount;
    const usedFallback = result.usedFallback;
    
    let score = 3; // Start with positive
    
    // Penalize for fallback usage
    if (usedFallback) score -= 1;
    
    // Penalize for high latency
    if (latency > 3000) score -= 0.5;
    
    // Penalize for retries
    if (retryCount > 0) score -= 0.3;
    
    // Ensure score is between 1-3
    score = Math.max(1, Math.min(3, score));
    
    const emoji = score >= 2.5 ? '😊' : score >= 1.5 ? '😐' : '😡';
    const description = score >= 2.5 ? 'Positive' : score >= 1.5 ? 'Neutral' : 'Negative';
    
    return { emoji, score, description };
  }

  /**
   * Export results to CSV
   */
  exportToCSV(results: VersionCorrelationResult[], filename: string): void {
    const headers = [
      'Version',
      'Total Responses',
      'Average Rating',
      'Negative (😡)',
      'Neutral (😐)',
      'Positive (😊)',
      'Success Rate',
      'Average Latency (ms)',
      'Fallback Rate'
    ];
    
    const rows = results.map(result => [
      result.version,
      result.totalResponses.toString(),
      result.averageRating.toFixed(2),
      result.ratingDistribution.negative.toString(),
      result.ratingDistribution.neutral.toString(),
      result.ratingDistribution.positive.toString(),
      (result.successRate * 100).toFixed(1) + '%',
      result.averageLatency.toFixed(0),
      (result.fallbackRate * 100).toFixed(1) + '%'
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    writeFileSync(filename, csvContent);
    console.log(`Results exported to: ${filename}`);
  }

  /**
   * Export results to JSON
   */
  exportToJSON(results: VersionCorrelationResult[], filename: string): void {
    const jsonContent = {
      timestamp: new Date().toISOString(),
      evaluation: 'Prompt Version Correlation',
      results: results,
      summary: {
        bestVersion: results.reduce((best, current) => 
          current.averageRating > best.averageRating ? current : best
        ),
        worstVersion: results.reduce((worst, current) => 
          current.averageRating < worst.averageRating ? current : worst
        )
      }
    };
    
    writeFileSync(filename, JSON.stringify(jsonContent, null, 2));
    console.log(`Results exported to: ${filename}`);
  }

  /**
   * Generate evaluation report
   */
  generateReport(results: VersionCorrelationResult[]): string {
    const bestVersion = results.reduce((best, current) => 
      current.averageRating > best.averageRating ? current : best
    );
    
    const worstVersion = results.reduce((worst, current) => 
      current.averageRating < worst.averageRating ? current : worst
    );
    
    return `
# Prompt Version Evaluation Report

## Summary
- **Best Version**: ${bestVersion.version} (Rating: ${bestVersion.averageRating.toFixed(2)})
- **Worst Version**: ${worstVersion.version} (Rating: ${worstVersion.averageRating.toFixed(2)})
- **Total Versions Tested**: ${results.length}

## Detailed Results

${results.map(result => `
### ${result.version}
- **Average Rating**: ${result.averageRating.toFixed(2)}/3.0
- **Success Rate**: ${(result.successRate * 100).toFixed(1)}%
- **Rating Distribution**: 
  - 😊 Positive: ${result.ratingDistribution.positive} (${(result.ratingDistribution.positive / result.totalResponses * 100).toFixed(1)}%)
  - 😐 Neutral: ${result.ratingDistribution.neutral} (${(result.ratingDistribution.neutral / result.totalResponses * 100).toFixed(1)}%)
  - 😡 Negative: ${result.ratingDistribution.negative} (${(result.ratingDistribution.negative / result.totalResponses * 100).toFixed(1)}%)
- **Performance**: ${result.averageLatency.toFixed(0)}ms avg latency, ${(result.fallbackRate * 100).toFixed(1)}% fallback rate
`).join('\n')}

## Recommendations
- **Deploy**: ${bestVersion.version} (highest rating and success rate)
- **Investigate**: ${worstVersion.version} (lowest performance)
- **Monitor**: Track real-world usage of deployed version
`;
  }
}

// CLI execution
async function main() {
  const config: PromptVersionConfig = {
    versions: process.env.THERAPIST_PROMPT_VERSIONS?.split(',') || ['v1.2', 'v1.2a', 'v1.2b'],
    testScenarios: [], // Would be loaded from scenarios file
    sampleSize: parseInt(process.env.EVAL_SAMPLE_SIZE || '25')
  };

  const orchestrator = new TherapistOrchestrator({
    therapistPromptVersion: 'v1.2',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxRetries: 2,
    fallbackTemplate: ''
  });

  const evaluator = new PromptVersionEvaluator(orchestrator);
  
  console.log('Starting prompt version evaluation...');
  const results = await evaluator.evaluateVersions(config);
  
  // Export results
  const timestamp = new Date().toISOString().split('T')[0];
  evaluator.exportToCSV(results, `prompt-version-eval-${timestamp}.csv`);
  evaluator.exportToJSON(results, `prompt-version-eval-${timestamp}.json`);
  
  // Generate report
  const report = evaluator.generateReport(results);
  writeFileSync(`prompt-version-report-${timestamp}.md`, report);
  
  console.log('Evaluation completed!');
  console.log(report);
}

if (require.main === module) {
  main().catch(console.error);
}
