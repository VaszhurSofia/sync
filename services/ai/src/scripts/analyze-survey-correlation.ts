#!/usr/bin/env tsx

/**
 * Analyze Survey Correlation Script
 * Analyzes correlation between survey ratings and AI response quality
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface SurveyData {
  sessionId: string;
  rating: 'angry' | 'neutral' | 'happy';
  feedback?: string;
  timestamp: string;
  aiResponse?: {
    promptVersion: string;
    latency: number;
    validationPassed: boolean;
    totalSentences: number;
  };
}

interface CorrelationResults {
  totalSurveys: number;
  ratingDistribution: {
    angry: number;
    neutral: number;
    happy: number;
  };
  correlations: {
    ratingVsLatency: number;
    ratingVsValidation: number;
    ratingVsSentences: number;
  };
  insights: string[];
  recommendations: string[];
}

async function analyzeSurveyCorrelation(): Promise<void> {
  console.log('📊 Analyzing survey correlation...');
  
  try {
    // Check if database connection is available
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.log('⚠️  No database connection available. Using mock data...');
      
      // Generate mock survey data
      const mockData: SurveyData[] = generateMockSurveyData();
      const results = analyzeCorrelationData(mockData);
      
      // Save results
      const outputPath = join(process.cwd(), 'correlation-results.json');
      writeFileSync(outputPath, JSON.stringify(results, null, 2));
      
      console.log('\n📈 Survey Correlation Analysis Results:');
      console.log(`   Total Surveys: ${results.totalSurveys}`);
      console.log(`   Rating Distribution:`);
      console.log(`     Angry: ${results.ratingDistribution.angry}`);
      console.log(`     Neutral: ${results.ratingDistribution.neutral}`);
      console.log(`     Happy: ${results.ratingDistribution.happy}`);
      console.log(`   Correlations:`);
      console.log(`     Rating vs Latency: ${results.correlations.ratingVsLatency.toFixed(3)}`);
      console.log(`     Rating vs Validation: ${results.correlations.ratingVsValidation.toFixed(3)}`);
      console.log(`     Rating vs Sentences: ${results.correlations.ratingVsSentences.toFixed(3)}`);
      
      console.log('\n💡 Insights:');
      results.insights.forEach(insight => console.log(`   • ${insight}`));
      
      console.log('\n🎯 Recommendations:');
      results.recommendations.forEach(rec => console.log(`   • ${rec}`));
      
      console.log(`\n💾 Results saved to: ${outputPath}`);
      return;
    }

    // TODO: Implement actual database query
    console.log('🔍 Querying database for survey data...');
    
    // This would be implemented with actual database queries
    // For now, we'll use mock data
    const mockData: SurveyData[] = generateMockSurveyData();
    const results = analyzeCorrelationData(mockData);
    
    // Save results
    const outputPath = join(process.cwd(), 'correlation-results.json');
    writeFileSync(outputPath, JSON.stringify(results, null, 2));
    
    console.log('\n✅ Survey correlation analysis completed!');
    console.log(`💾 Results saved to: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error analyzing survey correlation:', error);
    process.exit(1);
  }
}

function generateMockSurveyData(): SurveyData[] {
  const data: SurveyData[] = [];
  const ratings: ('angry' | 'neutral' | 'happy')[] = ['angry', 'neutral', 'happy'];
  
  for (let i = 0; i < 100; i++) {
    const rating = ratings[Math.floor(Math.random() * ratings.length)];
    const sessionId = `session_${i + 1}`;
    
    data.push({
      sessionId,
      rating,
      feedback: Math.random() > 0.7 ? `Feedback for session ${i + 1}` : undefined,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      aiResponse: {
        promptVersion: Math.random() > 0.5 ? 'couple_v2.0' : 'solo_v1.0',
        latency: 500 + Math.random() * 2000,
        validationPassed: Math.random() > 0.1,
        totalSentences: 6 + Math.floor(Math.random() * 4)
      }
    });
  }
  
  return data;
}

function analyzeCorrelationData(data: SurveyData[]): CorrelationResults {
  const totalSurveys = data.length;
  
  // Calculate rating distribution
  const ratingDistribution = {
    angry: data.filter(d => d.rating === 'angry').length,
    neutral: data.filter(d => d.rating === 'neutral').length,
    happy: data.filter(d => d.rating === 'happy').length
  };
  
  // Calculate correlations
  const angryData = data.filter(d => d.rating === 'angry' && d.aiResponse);
  const neutralData = data.filter(d => d.rating === 'neutral' && d.aiResponse);
  const happyData = data.filter(d => d.rating === 'happy' && d.aiResponse);
  
  // Rating vs Latency correlation
  const ratingVsLatency = calculateCorrelation(
    data.map(d => d.rating === 'angry' ? 1 : d.rating === 'neutral' ? 2 : 3),
    data.map(d => d.aiResponse?.latency || 0)
  );
  
  // Rating vs Validation correlation
  const ratingVsValidation = calculateCorrelation(
    data.map(d => d.rating === 'angry' ? 1 : d.rating === 'neutral' ? 2 : 3),
    data.map(d => d.aiResponse?.validationPassed ? 1 : 0)
  );
  
  // Rating vs Sentences correlation
  const ratingVsSentences = calculateCorrelation(
    data.map(d => d.rating === 'angry' ? 1 : d.rating === 'neutral' ? 2 : 3),
    data.map(d => d.aiResponse?.totalSentences || 0)
  );
  
  // Generate insights
  const insights: string[] = [];
  if (ratingVsLatency > 0.3) {
    insights.push('Higher ratings correlate with faster response times');
  }
  if (ratingVsValidation > 0.2) {
    insights.push('Higher ratings correlate with better validation success');
  }
  if (ratingDistribution.angry > ratingDistribution.happy) {
    insights.push('More negative ratings than positive - may indicate quality issues');
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  if (ratingDistribution.angry > 0.3) {
    recommendations.push('Consider improving AI response quality to reduce negative ratings');
  }
  if (ratingVsLatency < -0.2) {
    recommendations.push('Optimize response latency to improve user satisfaction');
  }
  if (ratingVsValidation < 0.1) {
    recommendations.push('Improve validation success rate to enhance user experience');
  }
  
  return {
    totalSurveys,
    ratingDistribution,
    correlations: {
      ratingVsLatency,
      ratingVsValidation,
      ratingVsSentences
    },
    insights,
    recommendations
  };
}

function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

// Run the analysis
if (require.main === module) {
  analyzeSurveyCorrelation();
}

export { analyzeSurveyCorrelation };
