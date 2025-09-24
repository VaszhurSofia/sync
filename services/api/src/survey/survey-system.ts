/**
 * M5: Survey System
 * 3-emoji feedback system for session evaluation
 */

export interface SurveyResponse {
  id: string;
  sessionId: string;
  userId: string;
  rating: 'angry' | 'neutral' | 'happy';
  submittedAt: string;
  feedback?: string; // Optional text feedback
}

export interface SurveyAnalytics {
  totalResponses: number;
  ratingDistribution: {
    angry: number;
    neutral: number;
    happy: number;
  };
  averageRating: number; // 1-3 scale (angry=1, neutral=2, happy=3)
  responseRate: number; // Percentage of sessions with feedback
  recentTrends: {
    last7Days: SurveyResponse[];
    last30Days: SurveyResponse[];
  };
}

export interface SurveyConfig {
  enabled: boolean;
  required: boolean; // Whether survey is mandatory after each session
  emojiOptions: {
    angry: { emoji: string; label: string; value: 1 };
    neutral: { emoji: string; label: string; value: 2 };
    happy: { emoji: string; label: string; value: 3 };
  };
  textFeedback: {
    enabled: boolean;
    maxLength: number;
    placeholder: string;
  };
  analytics: {
    enabled: boolean;
    retentionDays: number; // How long to keep survey data
  };
}

// Default survey configuration
export const DEFAULT_SURVEY_CONFIG: SurveyConfig = {
  enabled: true,
  required: false, // Optional by default
  emojiOptions: {
    angry: { emoji: '😞', label: 'Not helpful', value: 1 },
    neutral: { emoji: '😐', label: 'Neutral', value: 2 },
    happy: { emoji: '😊', label: 'Helpful', value: 3 },
  },
  textFeedback: {
    enabled: true,
    maxLength: 500,
    placeholder: 'Any additional feedback? (optional)',
  },
  analytics: {
    enabled: true,
    retentionDays: 90, // Keep survey data for 90 days
  },
};

/**
 * Validate survey response
 */
export function validateSurveyResponse(response: Partial<SurveyResponse>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!response.sessionId) {
    errors.push('Session ID is required');
  }

  if (!response.userId) {
    errors.push('User ID is required');
  }

  if (!response.rating) {
    errors.push('Rating is required');
  } else if (!['angry', 'neutral', 'happy'].includes(response.rating)) {
    errors.push('Rating must be one of: angry, neutral, happy');
  }

  if (response.feedback && response.feedback.length > DEFAULT_SURVEY_CONFIG.textFeedback.maxLength) {
    errors.push(`Feedback must be less than ${DEFAULT_SURVEY_CONFIG.textFeedback.maxLength} characters`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate survey analytics
 */
export function calculateSurveyAnalytics(responses: SurveyResponse[]): SurveyAnalytics {
  const totalResponses = responses.length;
  
  if (totalResponses === 0) {
    return {
      totalResponses: 0,
      ratingDistribution: { angry: 0, neutral: 0, happy: 0 },
      averageRating: 0,
      responseRate: 0,
      recentTrends: {
        last7Days: [],
        last30Days: [],
      },
    };
  }

  // Count ratings
  const ratingDistribution = responses.reduce(
    (acc, response) => {
      acc[response.rating]++;
      return acc;
    },
    { angry: 0, neutral: 0, happy: 0 }
  );

  // Calculate average rating (1-3 scale)
  const totalRatingValue = responses.reduce((sum, response) => {
    return sum + DEFAULT_SURVEY_CONFIG.emojiOptions[response.rating].value;
  }, 0);
  const averageRating = totalRatingValue / totalResponses;

  // Calculate recent trends
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const last7Days = responses.filter(response => 
    new Date(response.submittedAt) >= sevenDaysAgo
  );
  const last30Days = responses.filter(response => 
    new Date(response.submittedAt) >= thirtyDaysAgo
  );

  return {
    totalResponses,
    ratingDistribution,
    averageRating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
    responseRate: 0, // This would need to be calculated with total sessions
    recentTrends: {
      last7Days,
      last30Days,
    },
  };
}

/**
 * Generate survey insights
 */
export function generateSurveyInsights(analytics: SurveyAnalytics): {
  insights: string[];
  recommendations: string[];
} {
  const insights: string[] = [];
  const recommendations: string[] = [];

  if (analytics.totalResponses === 0) {
    insights.push('No survey responses yet');
    recommendations.push('Encourage users to provide feedback after sessions');
    return { insights, recommendations };
  }

  // Rating distribution insights
  const { angry, neutral, happy } = analytics.ratingDistribution;
  const total = analytics.totalResponses;

  if (happy / total > 0.7) {
    insights.push('High satisfaction rate - most users find sessions helpful');
    recommendations.push('Continue current approach, consider expanding features');
  } else if (angry / total > 0.3) {
    insights.push('Significant dissatisfaction detected');
    recommendations.push('Review session quality, improve AI responses, gather detailed feedback');
  } else if (neutral / total > 0.5) {
    insights.push('Many users feel neutral about sessions');
    recommendations.push('Enhance AI responses, add more engaging features');
  }

  // Average rating insights
  if (analytics.averageRating >= 2.5) {
    insights.push('Overall positive user experience');
  } else if (analytics.averageRating <= 1.5) {
    insights.push('Overall negative user experience');
    recommendations.push('Urgent review needed - consider pausing new features to fix core issues');
  } else {
    insights.push('Mixed user experience - room for improvement');
    recommendations.push('Focus on improving session quality and user engagement');
  }

  // Recent trends
  if (analytics.recentTrends.last7Days.length > 0) {
    const recentAvg = calculateSurveyAnalytics(analytics.recentTrends.last7Days).averageRating;
    if (recentAvg > analytics.averageRating) {
      insights.push('Recent sessions show improvement');
    } else if (recentAvg < analytics.averageRating) {
      insights.push('Recent sessions show decline');
      recommendations.push('Investigate recent changes that may have affected user experience');
    }
  }

  return { insights, recommendations };
}

/**
 * Check if survey is required for a session
 */
export function isSurveyRequired(sessionId: string, userId: string, config: SurveyConfig): boolean {
  if (!config.enabled) return false;
  return config.required;
}

/**
 * Get survey configuration with environment overrides
 */
export function getSurveyConfig(): SurveyConfig {
  const config = { ...DEFAULT_SURVEY_CONFIG };

  // Override with environment variables if available
  if (process.env.SURVEY_ENABLED !== undefined) {
    config.enabled = process.env.SURVEY_ENABLED === 'true';
  }

  if (process.env.SURVEY_REQUIRED !== undefined) {
    config.required = process.env.SURVEY_REQUIRED === 'true';
  }

  if (process.env.SURVEY_TEXT_FEEDBACK !== undefined) {
    config.textFeedback.enabled = process.env.SURVEY_TEXT_FEEDBACK === 'true';
  }

  return config;
}

/**
 * Create a survey response
 */
export function createSurveyResponse(
  sessionId: string,
  userId: string,
  rating: 'angry' | 'neutral' | 'happy',
  feedback?: string
): SurveyResponse {
  return {
    id: `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId,
    userId,
    rating,
    submittedAt: new Date().toISOString(),
    feedback: feedback?.trim() || undefined,
  };
}

/**
 * Format survey response for display
 */
export function formatSurveyResponse(response: SurveyResponse): {
  id: string;
  sessionId: string;
  rating: {
    emoji: string;
    label: string;
    value: number;
  };
  feedback?: string;
  submittedAt: string;
} {
  const config = getSurveyConfig();
  
  return {
    id: response.id,
    sessionId: response.sessionId,
    rating: {
      emoji: config.emojiOptions[response.rating].emoji,
      label: config.emojiOptions[response.rating].label,
      value: config.emojiOptions[response.rating].value,
    },
    feedback: response.feedback,
    submittedAt: response.submittedAt,
  };
}

/**
 * Submit a survey response (stub implementation)
 */
export async function submitSurvey(
  sessionId: string,
  userId: string,
  rating: 'angry' | 'neutral' | 'happy',
  feedback?: string
): Promise<SurveyResponse> {
  const response = createSurveyResponse(sessionId, userId, rating, feedback);
  // In a real implementation, this would save to database
  console.log('Survey submitted:', response);
  return response;
}

/**
 * Get survey analytics (stub implementation)
 */
export async function getSurveyAnalytics(): Promise<SurveyAnalytics> {
  // In a real implementation, this would query the database
  return {
    totalResponses: 0,
    ratingDistribution: { angry: 0, neutral: 0, happy: 0 },
    averageRating: 0,
    responseRate: 0,
    recentTrends: {
      last7Days: [],
      last30Days: [],
    },
  };
}

/**
 * Get AI insights from survey data (stub implementation)
 */
export async function getAIInsights(): Promise<{
  insights: string[];
  recommendations: string[];
}> {
  return {
    insights: ['No survey data available yet'],
    recommendations: ['Encourage users to provide feedback'],
  };
}

/**
 * Clear survey responses (stub implementation)
 */
export async function clearSurveyResponses(): Promise<void> {
  // In a real implementation, this would clear from database
  console.log('Survey responses cleared');
}
