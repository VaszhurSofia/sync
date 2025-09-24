/**
 * M4: Safety Configuration
 * Centralized configuration for safety and boundary features
 */

export const SAFETY_CONFIG = {
  // Feature toggles
  enabled: true,
  strictMode: false, // In strict mode, even low-risk content gets flagged
  
  // Rate limiting configuration
  rateLimiting: {
    enabled: true,
    maxViolations: 3, // Max violations before lockout
    maxViolationsBeforeLock: 3, // Max violations before lockout
    lockoutDuration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    warningThreshold: 1, // Show warning after this many violations
    maxRequests: 100, // Max requests per window
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  
  // Content length thresholds
  contentThresholds: {
    minLength: 10, // Minimum content length to analyze
    maxLength: 4000, // Maximum content length allowed
  },
  
  // EU Resources configuration
  euResources: {
    region: 'EU',
    emergencyNumber: '112',
    crisisHelpline: '116 123',
    mentalHealthNetwork: 'https://www.mentalhealth-europe.eu/',
    familySupport: 'https://www.family-support.eu/',
  },
  
  // Safety templates configuration
  templates: {
    selfHarm: {
      id: 'self_harm',
      name: 'Self-Harm Concerns',
      priority: 'high',
      autoBlock: true,
    },
    abuse: {
      id: 'abuse',
      name: 'Abuse or Violence',
      priority: 'high',
      autoBlock: true,
    },
    relationshipCrisis: {
      id: 'relationship_crisis',
      name: 'Relationship Crisis',
      priority: 'medium',
      autoBlock: false,
    },
    mentalHealth: {
      id: 'mental_health',
      name: 'Mental Health Concerns',
      priority: 'medium',
      autoBlock: false,
    },
  },
  
  // Frontend lock configuration
  frontendLock: {
    enabled: true,
    violationThreshold: 3, // Lock after this many violations
    lockDuration: 24 * 60 * 60 * 1000, // 24 hours
    warningThreshold: 1, // Show warning after this many violations
  },
  
  // Logging configuration
  logging: {
    enabled: true,
    logLevel: 'warn', // 'info', 'warn', 'error'
    logViolations: true,
    logRateLimits: true,
    logFrontendLocks: true,
  },
  
  // AI integration safety
  aiSafety: {
    enabled: true,
    validateAIResponses: true,
    fallbackOnError: true,
    maxRetries: 3,
  },
  
  // Safety templates
  safetyTemplates: {
    selfHarm: {
      id: 'self_harm',
      name: 'Self-Harm Concerns',
      priority: 'high',
      autoBlock: true,
      response: 'Safety concerns detected - please seek professional help',
    },
    abuse: {
      id: 'abuse',
      name: 'Abuse or Violence',
      priority: 'high',
      autoBlock: true,
      response: 'Safety concerns detected - please contact authorities if needed',
    },
    relationshipCrisis: {
      id: 'relationship_crisis',
      name: 'Relationship Crisis',
      priority: 'medium',
      autoBlock: false,
      response: 'Consider seeking couples counseling or professional support',
    },
    mentalHealth: {
      id: 'mental_health',
      name: 'Mental Health Concerns',
      priority: 'medium',
      autoBlock: false,
      response: 'Consider speaking with a mental health professional',
    },
    frontend_lock: {
      id: 'frontend_lock',
      name: 'Frontend Lock',
      priority: 'high',
      autoBlock: true,
      response: 'Account temporarily locked for safety review',
    },
  },

  // Safety guidelines
  safetyGuidelines: [
    'Be respectful and kind in your communication',
    'Avoid content that could be harmful to yourself or others',
    'Seek professional help if you\'re struggling with serious issues',
    'Remember that this is a communication tool, not a replacement for therapy',
    'If you\'re in immediate danger, contact emergency services (112)',
    'Use "I" statements to express your feelings and needs',
    'Take breaks if conversations become too intense',
    'Respect your partner\'s boundaries and communicate your own'
  ],

  // Development/testing overrides
  development: {
    bypassSafety: false, // Set to true to bypass safety checks in development
    testMode: false, // Set to true to use test patterns
    verboseLogging: false, // Set to true for detailed safety logs
  },
};

/**
 * Get safety configuration with environment overrides
 */
export function getSafetyConfig() {
  const config = { ...SAFETY_CONFIG };
  
  // Override with environment variables if available
  if (process.env.SAFETY_ENABLED !== undefined) {
    config.enabled = process.env.SAFETY_ENABLED === 'true';
  }
  
  if (process.env.SAFETY_STRICT_MODE !== undefined) {
    config.strictMode = process.env.SAFETY_STRICT_MODE === 'true';
  }
  
  if (process.env.SAFETY_BYPASS !== undefined) {
    config.development.bypassSafety = process.env.SAFETY_BYPASS === 'true';
  }
  
  if (process.env.SAFETY_TEST_MODE !== undefined) {
    config.development.testMode = process.env.SAFETY_TEST_MODE === 'true';
  }
  
  return config;
}

/**
 * Check if safety features are enabled
 */
export function isSafetyEnabled(): boolean {
  const config = getSafetyConfig();
  return config.enabled && !config.development.bypassSafety;
}

/**
 * Check if we're in strict mode
 */
export function isStrictMode(): boolean {
  const config = getSafetyConfig();
  return config.strictMode;
}

/**
 * Check if we're in test mode
 */
export function isTestMode(): boolean {
  const config = getSafetyConfig();
  return config.development.testMode;
}

/**
 * Get EU resources for a specific concern type
 */
export function getEUResourcesForConcern(concernType: string): string[] {
  const config = getSafetyConfig();
  const resources: string[] = [];
  
  switch (concernType) {
    case 'mental_health':
      resources.push(
        `EU Mental Health Network: ${config.euResources.mentalHealthNetwork}`,
        `Crisis helpline: ${config.euResources.crisisHelpline}`,
        'Your local mental health services (contact your GP)'
      );
      break;
      
    case 'relationship':
      resources.push(
        `EU Family Support Network: ${config.euResources.familySupport}`,
        'Couples counseling services in your area',
        'Relationship support hotlines'
      );
      break;
      
    case 'abuse':
      resources.push(
        `Emergency services: ${config.euResources.emergencyNumber}`,
        'EU Domestic Violence Helpline',
        'Local women\'s/men\'s shelters',
        'Your local police station'
      );
      break;
      
    default:
      resources.push(
        'EU Citizens\' Rights: https://europa.eu/youreurope/',
        'Local social services',
        `Emergency services: ${config.euResources.emergencyNumber}`
      );
  }
  
  return resources;
}

/**
 * Get safety guidelines
 */
export function getSafetyGuidelines(): string[] {
  return [
    'Be respectful and kind in your communication',
    'Avoid content that could be harmful to yourself or others',
    'Seek professional help if you\'re struggling with serious issues',
    'Remember that this is a communication tool, not a replacement for therapy',
    'If you\'re in immediate danger, contact emergency services (112)',
    'Use "I" statements to express your feelings and needs',
    'Take breaks if conversations become too intense',
    'Respect your partner\'s boundaries and communicate your own'
  ];
}
