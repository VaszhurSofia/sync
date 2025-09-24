import { logger } from '../logger';

export interface SurveyRating {
  sessionId: string;
  promptVersion: string;
  rating: number; // 1-5 scale
  feedback?: string;
  timestamp: Date;
}

export interface CorrelationData {
  promptVersion: string;
  averageRating: number;
  ratingCount: number;
  ratingDistribution: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
  feedbackAnalysis: {
    positiveKeywords: string[];
    negativeKeywords: string[];
    neutralKeywords: string[];
  };
}

export interface CorrelationReport {
  promptVersions: CorrelationData[];
  statisticalSignificance: {
    isSignificant: boolean;
    pValue: number;
    confidenceLevel: number;
  };
  recommendations: string[];
  timestamp: Date;
}

export class SurveyCorrelationAnalyzer {
  /**
   * Analyze survey ratings correlation with prompt versions
   */
  async analyzeCorrelation(
    ratings: SurveyRating[],
    evaluationResults: any[]
  ): Promise<CorrelationReport> {
    logger.info('Starting survey correlation analysis', {
      ratingCount: ratings.length,
      evaluationResultCount: evaluationResults.length
    });

    // Group ratings by prompt version
    const ratingsByVersion = this.groupRatingsByVersion(ratings);
    
    // Calculate correlation data for each version
    const promptVersions = Array.from(ratingsByVersion.keys()).map(version => {
      const versionRatings = ratingsByVersion.get(version) || [];
      return this.calculateVersionData(version, versionRatings);
    });

    // Perform statistical analysis
    const statisticalSignificance = this.calculateStatisticalSignificance(ratingsByVersion);

    // Generate recommendations
    const recommendations = this.generateRecommendations(promptVersions, statisticalSignificance);

    const report: CorrelationReport = {
      promptVersions,
      statisticalSignificance,
      recommendations,
      timestamp: new Date()
    };

    logger.info('Survey correlation analysis completed', {
      versions: promptVersions.length,
      isSignificant: statisticalSignificance.isSignificant,
      recommendations: recommendations.length
    });

    return report;
  }

  /**
   * Group ratings by prompt version
   */
  private groupRatingsByVersion(ratings: SurveyRating[]): Map<string, SurveyRating[]> {
    const grouped = new Map<string, SurveyRating[]>();

    ratings.forEach(rating => {
      if (!grouped.has(rating.promptVersion)) {
        grouped.set(rating.promptVersion, []);
      }
      grouped.get(rating.promptVersion)!.push(rating);
    });

    return grouped;
  }

  /**
   * Calculate correlation data for a specific version
   */
  private calculateVersionData(version: string, ratings: SurveyRating[]): CorrelationData {
    const averageRating = ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length;
    
    const ratingDistribution = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0
    };

    ratings.forEach(rating => {
      ratingDistribution[rating.rating.toString() as keyof typeof ratingDistribution]++;
    });

    const feedbackAnalysis = this.analyzeFeedback(ratings);

    return {
      promptVersion: version,
      averageRating,
      ratingCount: ratings.length,
      ratingDistribution,
      feedbackAnalysis
    };
  }

  /**
   * Analyze feedback text for keywords
   */
  private analyzeFeedback(ratings: SurveyRating[]): CorrelationData['feedbackAnalysis'] {
    const positiveKeywords = [
      'helpful', 'useful', 'clear', 'understanding', 'empathy', 'supportive',
      'neutral', 'balanced', 'insightful', 'constructive', 'calming', 'reassuring'
    ];

    const negativeKeywords = [
      'unhelpful', 'confusing', 'biased', 'judgmental', 'clinical', 'cold',
      'generic', 'repetitive', 'too long', 'too short', 'irrelevant', 'unclear'
    ];

    const neutralKeywords = [
      'okay', 'fine', 'average', 'standard', 'typical', 'normal', 'acceptable'
    ];

    const allFeedback = ratings
      .filter(r => r.feedback)
      .map(r => r.feedback!.toLowerCase())
      .join(' ');

    const positiveMatches = positiveKeywords.filter(keyword => 
      allFeedback.includes(keyword)
    );

    const negativeMatches = negativeKeywords.filter(keyword => 
      allFeedback.includes(keyword)
    );

    const neutralMatches = neutralKeywords.filter(keyword => 
      allFeedback.includes(keyword)
    );

    return {
      positiveKeywords: positiveMatches,
      negativeKeywords: negativeMatches,
      neutralKeywords: neutralMatches
    };
  }

  /**
   * Calculate statistical significance between versions
   */
  private calculateStatisticalSignificance(
    ratingsByVersion: Map<string, SurveyRating[]>
  ): CorrelationReport['statisticalSignificance'] {
    const versions = Array.from(ratingsByVersion.keys());
    
    if (versions.length < 2) {
      return {
        isSignificant: false,
        pValue: 1.0,
        confidenceLevel: 0
      };
    }

    // Simple t-test simulation (in production, use proper statistical library)
    const version1Ratings = ratingsByVersion.get(versions[0]) || [];
    const version2Ratings = ratingsByVersion.get(versions[1]) || [];

    if (version1Ratings.length < 10 || version2Ratings.length < 10) {
      return {
        isSignificant: false,
        pValue: 0.5,
        confidenceLevel: 50
      };
    }

    const mean1 = version1Ratings.reduce((sum, r) => sum + r.rating, 0) / version1Ratings.length;
    const mean2 = version2Ratings.reduce((sum, r) => sum + r.rating, 0) / version2Ratings.length;
    
    const variance1 = version1Ratings.reduce((sum, r) => sum + Math.pow(r.rating - mean1, 2), 0) / version1Ratings.length;
    const variance2 = version2Ratings.reduce((sum, r) => sum + Math.pow(r.rating - mean2, 2), 0) / version2Ratings.length;
    
    const pooledVariance = ((version1Ratings.length - 1) * variance1 + (version2Ratings.length - 1) * variance2) / 
                          (version1Ratings.length + version2Ratings.length - 2);
    
    const standardError = Math.sqrt(pooledVariance * (1/version1Ratings.length + 1/version2Ratings.length));
    const tStatistic = Math.abs(mean1 - mean2) / standardError;
    
    // Simplified p-value calculation (in production, use proper statistical library)
    const pValue = Math.max(0.001, Math.min(0.5, 1 / (1 + tStatistic)));
    const isSignificant = pValue < 0.05;
    const confidenceLevel = isSignificant ? 95 : 50;

    return {
      isSignificant,
      pValue,
      confidenceLevel
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    promptVersions: CorrelationData[],
    statisticalSignificance: CorrelationReport['statisticalSignificance']
  ): string[] {
    const recommendations: string[] = [];

    if (promptVersions.length === 0) {
      recommendations.push('No survey data available for analysis');
      return recommendations;
    }

    // Find best performing version
    const bestVersion = promptVersions.reduce((best, current) => 
      current.averageRating > best.averageRating ? current : best
    );

    const worstVersion = promptVersions.reduce((worst, current) => 
      current.averageRating < worst.averageRating ? current : worst
    );

    // Statistical significance recommendations
    if (statisticalSignificance.isSignificant) {
      recommendations.push(`Statistical analysis shows significant difference between prompt versions (p-value: ${statisticalSignificance.pValue.toFixed(3)})`);
      recommendations.push(`Recommend using ${bestVersion.promptVersion} as the primary prompt version`);
      
      if (bestVersion.averageRating - worstVersion.averageRating > 0.5) {
        recommendations.push(`Consider deprecating ${worstVersion.promptVersion} due to significantly lower ratings`);
      }
    } else {
      recommendations.push('No statistically significant difference found between prompt versions');
      recommendations.push('Consider collecting more survey data or running longer A/B tests');
    }

    // Rating-based recommendations
    if (bestVersion.averageRating >= 4.0) {
      recommendations.push(`${bestVersion.promptVersion} shows excellent user satisfaction (${bestVersion.averageRating.toFixed(2)}/5)`);
    } else if (bestVersion.averageRating >= 3.0) {
      recommendations.push(`${bestVersion.promptVersion} shows good user satisfaction (${bestVersion.averageRating.toFixed(2)}/5)`);
    } else {
      recommendations.push('All prompt versions show room for improvement in user satisfaction');
    }

    // Feedback analysis recommendations
    promptVersions.forEach(version => {
      if (version.feedbackAnalysis.negativeKeywords.length > version.feedbackAnalysis.positiveKeywords.length) {
        recommendations.push(`${version.promptVersion} shows more negative feedback keywords - consider prompt improvements`);
      }
      
      if (version.feedbackAnalysis.positiveKeywords.includes('clinical')) {
        recommendations.push(`${version.promptVersion} may be too clinical - consider more empathetic language`);
      }
      
      if (version.feedbackAnalysis.negativeKeywords.includes('generic')) {
        recommendations.push(`${version.promptVersion} may be too generic - consider more personalized responses`);
      }
    });

    // Sample size recommendations
    promptVersions.forEach(version => {
      if (version.ratingCount < 50) {
        recommendations.push(`${version.promptVersion} has limited survey data (${version.ratingCount} ratings) - collect more feedback`);
      }
    });

    return recommendations;
  }

  /**
   * Export correlation data for external analysis
   */
  exportCorrelationData(report: CorrelationReport): {
    csv: string;
    json: string;
  } {
    // Generate CSV
    const csvHeaders = 'Prompt Version,Average Rating,Rating Count,1-Star,2-Star,3-Star,4-Star,5-Star,Positive Keywords,Negative Keywords';
    const csvRows = report.promptVersions.map(version => {
      const positiveKeywords = version.feedbackAnalysis.positiveKeywords.join(';');
      const negativeKeywords = version.feedbackAnalysis.negativeKeywords.join(';');
      
      return [
        version.promptVersion,
        version.averageRating.toFixed(2),
        version.ratingCount,
        version.ratingDistribution['1'],
        version.ratingDistribution['2'],
        version.ratingDistribution['3'],
        version.ratingDistribution['4'],
        version.ratingDistribution['5'],
        positiveKeywords,
        negativeKeywords
      ].join(',');
    });

    const csv = [csvHeaders, ...csvRows].join('\n');

    // Generate JSON
    const json = JSON.stringify(report, null, 2);

    return { csv, json };
  }
}
