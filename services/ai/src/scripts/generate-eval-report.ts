#!/usr/bin/env tsx

/**
 * Generate Evaluation Report Script
 * Runs prompt evaluation and generates comprehensive reports
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { EvaluationHarness } from '../evaluation/eval-harness';
import { TherapistOrchestrator } from '../orchestrator';
import { SurveyCorrelationAnalyzer } from '../evaluation/survey-correlation';
import { logger } from '../logger';

async function main() {
  try {
    logger.info('Starting evaluation report generation');

    // Initialize orchestrator
    const orchestrator = new TherapistOrchestrator({
      therapistPromptVersion: process.env.THERAPIST_PROMPT_VERSION || 'v1',
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4',
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '2'),
      fallbackTemplate: 'Fallback template'
    });

    const evaluationHarness = new EvaluationHarness(orchestrator);
    const surveyAnalyzer = new SurveyCorrelationAnalyzer();

    // Get configuration from environment
    const promptVersions = (process.env.THERAPIST_PROMPT_VERSION || 'v1,v2').split(',');
    const scenarioSet = process.env.EVALUATION_SCENARIO_SET || 'basic';

    logger.info('Configuration', {
      promptVersions,
      scenarioSet,
      openaiApiKey: process.env.OPENAI_API_KEY ? '***' : 'not set'
    });

    // Run evaluations for each prompt version
    const reports = [];
    for (const version of promptVersions) {
      logger.info(`Evaluating prompt version: ${version}`);
      const report = await evaluationHarness.evaluatePromptVersion(version, scenarioSet);
      reports.push(report);
    }

    // Run A/B test if multiple versions
    let abTestResult = null;
    if (promptVersions.length > 1) {
      logger.info('Running A/B test');
      abTestResult = await evaluationHarness.runABTest({
        versions: promptVersions,
        scenarioSet,
        randomizeOrder: false,
        includeSurveyRatings: false
      });
    }

    // Generate survey correlation analysis (mock data for now)
    const mockSurveyData = generateMockSurveyData(promptVersions);
    const correlationReport = await surveyAnalyzer.analyzeCorrelation(mockSurveyData, reports);

    // Create results directory
    const resultsDir = join(process.cwd(), 'evaluation-results');
    const reportsDir = join(process.cwd(), 'eval-reports');
    mkdirSync(resultsDir, { recursive: true });
    mkdirSync(reportsDir, { recursive: true });

    // Save individual reports
    reports.forEach(report => {
      const filename = `report-${report.promptVersion}-${new Date().toISOString().split('T')[0]}.json`;
      const filepath = join(reportsDir, filename);
      writeFileSync(filepath, JSON.stringify(report, null, 2));
      logger.info(`Saved report: ${filename}`);
    });

    // Save A/B test results
    if (abTestResult) {
      const abTestFilename = `ab-test-${new Date().toISOString().split('T')[0]}.json`;
      const abTestFilepath = join(resultsDir, abTestFilename);
      writeFileSync(abTestFilepath, JSON.stringify(abTestResult, null, 2));
      logger.info(`Saved A/B test results: ${abTestFilename}`);
    }

    // Save correlation report
    const correlationFilename = `correlation-${new Date().toISOString().split('T')[0]}.json`;
    const correlationFilepath = join(resultsDir, correlationFilename);
    writeFileSync(correlationFilepath, JSON.stringify(correlationReport, null, 2));
    logger.info(`Saved correlation report: ${correlationFilename}`);

    // Generate summary report
    const summaryReport = {
      timestamp: new Date().toISOString(),
      configuration: {
        promptVersions,
        scenarioSet,
        totalScenarios: reports[0]?.totalScenarios || 0
      },
      results: {
        reports: reports.map(r => ({
          version: r.promptVersion,
          schemaCompliance: r.schemaCompliance,
          averageQualityScore: r.averageQualityScore,
          averageLatency: r.averageLatency,
          successRate: r.successfulResponses / r.totalScenarios
        })),
        abTest: abTestResult ? {
          winner: abTestResult.comparison.winner,
          scoreDifference: abTestResult.comparison.scoreDifference,
          significantDifference: abTestResult.comparison.significantDifference
        } : null,
        correlation: {
          isSignificant: correlationReport.statisticalSignificance.isSignificant,
          pValue: correlationReport.statisticalSignificance.pValue,
          recommendations: correlationReport.recommendations
        }
      }
    };

    // Save summary report
    const summaryFilename = 'latest-results.json';
    const summaryFilepath = join(resultsDir, summaryFilename);
    writeFileSync(summaryFilepath, JSON.stringify(summaryReport, null, 2));
    logger.info(`Saved summary report: ${summaryFilename}`);

    // Generate markdown report
    const markdownReport = generateMarkdownReport(summaryReport);
    const markdownFilename = `evaluation-report-${new Date().toISOString().split('T')[0]}.md`;
    const markdownFilepath = join(reportsDir, markdownFilename);
    writeFileSync(markdownFilepath, markdownReport);
    logger.info(`Saved markdown report: ${markdownFilename}`);

    // Export correlation data
    const correlationData = surveyAnalyzer.exportCorrelationData(correlationReport);
    const csvFilename = `correlation-data-${new Date().toISOString().split('T')[0]}.csv`;
    const csvFilepath = join(resultsDir, csvFilename);
    writeFileSync(csvFilepath, correlationData.csv);
    logger.info(`Saved correlation CSV: ${csvFilename}`);

    logger.info('Evaluation report generation completed successfully');

    // Print summary to console
    console.log('\n📊 EVALUATION SUMMARY');
    console.log('====================');
    console.log(`Prompt Versions: ${promptVersions.join(', ')}`);
    console.log(`Scenario Set: ${scenarioSet}`);
    console.log(`Total Scenarios: ${summaryReport.configuration.totalScenarios}`);
    console.log('\n📈 RESULTS:');
    
    reports.forEach(report => {
      console.log(`\n${report.promptVersion}:`);
      console.log(`  Schema Compliance: ${(report.schemaCompliance * 100).toFixed(1)}%`);
      console.log(`  Quality Score: ${(report.averageQualityScore * 100).toFixed(1)}%`);
      console.log(`  Success Rate: ${((report.successfulResponses / report.totalScenarios) * 100).toFixed(1)}%`);
      console.log(`  Avg Latency: ${report.averageLatency.toFixed(0)}ms`);
    });

    if (abTestResult) {
      console.log(`\n🏆 A/B TEST WINNER: ${abTestResult.comparison.winner}`);
      console.log(`Score Difference: ${(abTestResult.comparison.scoreDifference * 100).toFixed(1)}%`);
      console.log(`Significant: ${abTestResult.comparison.significantDifference ? 'Yes' : 'No'}`);
    }

    console.log(`\n📋 RECOMMENDATIONS:`);
    correlationReport.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });

  } catch (error) {
    logger.error('Evaluation report generation failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

/**
 * Generate mock survey data for testing
 */
function generateMockSurveyData(promptVersions: string[]): any[] {
  const mockData = [];
  
  promptVersions.forEach(version => {
    // Generate 50 mock ratings per version
    for (let i = 0; i < 50; i++) {
      const rating = Math.floor(Math.random() * 5) + 1; // 1-5 scale
      const feedback = generateMockFeedback(rating);
      
      mockData.push({
        sessionId: `session-${version}-${i}`,
        promptVersion: version,
        rating,
        feedback,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Last 30 days
      });
    }
  });

  return mockData;
}

/**
 * Generate mock feedback based on rating
 */
function generateMockFeedback(rating: number): string {
  const feedbacks = {
    1: ['Very unhelpful', 'Too clinical', 'Didn\'t understand the issue', 'Generic response'],
    2: ['Not very useful', 'Confusing', 'Too short', 'Didn\'t address the problem'],
    3: ['Okay', 'Average', 'Fine', 'Standard response'],
    4: ['Helpful', 'Clear and understanding', 'Good suggestions', 'Empathetic'],
    5: ['Very helpful', 'Excellent guidance', 'Perfect response', 'Very supportive and clear']
  };

  const options = feedbacks[rating as keyof typeof feedbacks] || feedbacks[3];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(summary: any): string {
  return `# Prompt Evaluation Report

Generated: ${summary.timestamp}

## Configuration
- **Prompt Versions**: ${summary.configuration.promptVersions.join(', ')}
- **Scenario Set**: ${summary.configuration.scenarioSet}
- **Total Scenarios**: ${summary.configuration.totalScenarios}

## Results

### Individual Version Performance

${summary.results.reports.map((report: any) => `
#### ${report.version}
- **Schema Compliance**: ${(report.schemaCompliance * 100).toFixed(1)}%
- **Quality Score**: ${(report.averageQualityScore * 100).toFixed(1)}%
- **Success Rate**: ${(report.successRate * 100).toFixed(1)}%
- **Average Latency**: ${report.averageLatency.toFixed(0)}ms
`).join('')}

### A/B Test Results

${summary.results.abTest ? `
- **Winner**: ${summary.results.abTest.winner}
- **Score Difference**: ${(summary.results.abTest.scoreDifference * 100).toFixed(1)}%
- **Significant Difference**: ${summary.results.abTest.significantDifference ? 'Yes' : 'No'}
` : 'No A/B test performed (single version)'}

### Survey Correlation Analysis

- **Statistical Significance**: ${summary.results.correlation.isSignificant ? 'Yes' : 'No'}
- **P-Value**: ${summary.results.correlation.pValue.toFixed(3)}
- **Confidence Level**: ${summary.results.correlation.isSignificant ? '95%' : '50%'}

## Recommendations

${summary.results.correlation.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

---
*Report generated by Sync AI Evaluation System*
`;
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}
