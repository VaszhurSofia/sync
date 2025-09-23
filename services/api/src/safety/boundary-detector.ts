/**
 * M4: Safety & Boundary Detection
 * Tier-1 regex-based content filtering for safety
 */

export interface BoundaryResult {
  isSafe: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  concerns: string[];
  shouldProceed: boolean;
  matchedPatterns: string[];
  suggestedAction: 'allow' | 'warn' | 'block' | 'redirect';
}

export interface SafetyTemplate {
  id: string;
  name: string;
  description: string;
  response: {
    message: string;
    resources: string[];
    action: 'continue' | 'pause' | 'redirect';
  };
}

// Safety patterns for boundary detection
const SAFETY_PATTERNS = {
  // High-risk patterns (immediate block)
  high: [
    {
      pattern: /\b(kill|murder|suicide|self-harm|hurt myself|end it all)\b/i,
      concern: 'self-harm or violence',
      action: 'block' as const
    },
    {
      pattern: /\b(abuse|hit me|beat me|hurt you|violence|threaten)\b/i,
      concern: 'abuse or violence',
      action: 'block' as const
    },
    {
      pattern: /\b(drugs|cocaine|heroin|overdose|pills)\b/i,
      concern: 'substance abuse',
      action: 'block' as const
    }
  ],
  
  // Medium-risk patterns (warning)
  medium: [
    {
      pattern: /\b(divorce|break up|leave you|hate you|can't stand)\b/i,
      concern: 'relationship crisis',
      action: 'warn' as const
    },
    {
      pattern: /\b(depressed|hopeless|worthless|useless|failure)\b/i,
      concern: 'mental health concerns',
      action: 'warn' as const
    },
    {
      pattern: /\b(cheat|affair|betrayal|lying|secrets)\b/i,
      concern: 'trust issues',
      action: 'warn' as const
    }
  ],
  
  // Low-risk patterns (monitor)
  low: [
    {
      pattern: /\b(stressed|overwhelmed|tired|exhausted)\b/i,
      concern: 'stress indicators',
      action: 'allow' as const
    },
    {
      pattern: /\b(frustrated|annoyed|irritated|upset)\b/i,
      concern: 'emotional distress',
      action: 'allow' as const
    }
  ]
};

// EU Support Resources
const EU_RESOURCES = {
  mental_health: [
    'European Mental Health Network: https://www.mentalhealth-europe.eu/',
    'EU Crisis Helpline: 116 123 (available in all EU countries)',
    'Your local mental health services (contact your GP)'
  ],
  relationship: [
    'EU Family Support Network: https://www.family-support.eu/',
    'Couples counseling services in your area',
    'Relationship support hotlines'
  ],
  general: [
    'EU Citizens\' Rights: https://europa.eu/youreurope/',
    'Local social services',
    'Emergency services: 112 (EU-wide emergency number)'
  ]
};

// Safety templates for different scenarios
const SAFETY_TEMPLATES: Record<string, SafetyTemplate> = {
  self_harm: {
    id: 'self_harm',
    name: 'Self-Harm Concerns',
    description: 'Content suggests self-harm or suicidal ideation',
    response: {
      message: 'I\'m concerned about what you\'ve shared. Your safety is the most important thing right now. Please reach out to someone you trust or contact emergency services immediately.',
      resources: [
        'Emergency services: 112 (EU-wide)',
        'Crisis helpline: 116 123',
        'Your local emergency room',
        'A trusted friend or family member'
      ],
      action: 'redirect'
    }
  },
  
  abuse: {
    id: 'abuse',
    name: 'Abuse or Violence',
    description: 'Content suggests abuse or violence',
    response: {
      message: 'I\'m worried about your safety. If you\'re in immediate danger, please call emergency services (112) right away. There are people who can help you.',
      resources: [
        'Emergency services: 112',
        'EU Domestic Violence Helpline',
        'Local women\'s/men\'s shelters',
        'Your local police station'
      ],
      action: 'redirect'
    }
  },
  
  relationship_crisis: {
    id: 'relationship_crisis',
    name: 'Relationship Crisis',
    description: 'Content suggests serious relationship problems',
    response: {
      message: 'It sounds like you\'re going through a really difficult time in your relationship. Sometimes it helps to take a step back and consider professional support.',
      resources: [
        'Couples counseling services',
        'Individual therapy options',
        'Relationship support groups',
        'Your local family services'
      ],
      action: 'pause'
    }
  },
  
  mental_health: {
    id: 'mental_health',
    name: 'Mental Health Concerns',
    description: 'Content suggests mental health struggles',
    response: {
      message: 'It sounds like you\'re dealing with some challenging emotions. Remember that it\'s okay to ask for help, and there are professionals who can support you.',
      resources: [
        'EU Mental Health Network',
        'Your local mental health services',
        'Crisis helpline: 116 123',
        'Your GP or family doctor'
      ],
      action: 'continue'
    }
  }
};

/**
 * Analyze content for safety concerns using regex patterns
 */
export function analyzeContentSafety(content: string): BoundaryResult {
  const concerns: string[] = [];
  const matchedPatterns: string[] = [];
  let maxRiskLevel: 'low' | 'medium' | 'high' = 'low';
  let suggestedAction: 'allow' | 'warn' | 'block' | 'redirect' = 'allow';
  
  // Check high-risk patterns
  for (const { pattern, concern, action } of SAFETY_PATTERNS.high) {
    if (pattern.test(content)) {
      concerns.push(concern);
      matchedPatterns.push(pattern.source);
      maxRiskLevel = 'high';
      suggestedAction = action;
    }
  }
  
  // Check medium-risk patterns (only if no high-risk found)
  if (maxRiskLevel === 'low') {
    for (const { pattern, concern, action } of SAFETY_PATTERNS.medium) {
      if (pattern.test(content)) {
        concerns.push(concern);
        matchedPatterns.push(pattern.source);
        maxRiskLevel = 'medium';
        suggestedAction = action;
      }
    }
  }
  
  // Check low-risk patterns (only if no higher risk found)
  if (maxRiskLevel === 'low') {
    for (const { pattern, concern, action } of SAFETY_PATTERNS.low) {
      if (pattern.test(content)) {
        concerns.push(concern);
        matchedPatterns.push(pattern.source);
        maxRiskLevel = 'low';
        suggestedAction = action;
      }
    }
  }
  
  const isSafe = maxRiskLevel === 'low' && suggestedAction === 'allow';
  const shouldProceed = suggestedAction !== 'block';
  
  return {
    isSafe,
    riskLevel: maxRiskLevel,
    concerns,
    shouldProceed,
    matchedPatterns,
    suggestedAction
  };
}

/**
 * Get appropriate safety template based on concerns
 */
export function getSafetyTemplate(concerns: string[]): SafetyTemplate | null {
  // Check for high-priority concerns first
  if (concerns.some(c => c.includes('self-harm') || c.includes('violence'))) {
    return SAFETY_TEMPLATES.self_harm;
  }
  
  if (concerns.some(c => c.includes('abuse') || c.includes('violence'))) {
    return SAFETY_TEMPLATES.abuse;
  }
  
  if (concerns.some(c => c.includes('relationship crisis'))) {
    return SAFETY_TEMPLATES.relationship_crisis;
  }
  
  if (concerns.some(c => c.includes('mental health'))) {
    return SAFETY_TEMPLATES.mental_health;
  }
  
  return null;
}

/**
 * Get EU resources for specific concern types
 */
export function getEUResources(concerns: string[]): string[] {
  const resources: string[] = [];
  
  if (concerns.some(c => c.includes('mental health'))) {
    resources.push(...EU_RESOURCES.mental_health);
  }
  
  if (concerns.some(c => c.includes('relationship'))) {
    resources.push(...EU_RESOURCES.relationship);
  }
  
  // Always include general resources
  resources.push(...EU_RESOURCES.general);
  
  // Remove duplicates
  return [...new Set(resources)];
}

/**
 * Create a safety response for boundary violations
 */
export function createSafetyResponse(boundaryResult: BoundaryResult): {
  message: string;
  resources: string[];
  action: string;
  template?: SafetyTemplate;
} {
  const template = getSafetyTemplate(boundaryResult.concerns);
  const resources = getEUResources(boundaryResult.concerns);
  
  if (template) {
    return {
      message: template.response.message,
      resources: [...template.response.resources, ...resources],
      action: template.response.action,
      template
    };
  }
  
  // Default safety response
  return {
    message: 'I\'m concerned about what you\'ve shared. Your safety and wellbeing are important. Please consider reaching out to someone you trust or a professional for support.',
    resources,
    action: boundaryResult.suggestedAction
  };
}

/**
 * Validate content before processing
 */
export function validateContentSafety(content: string): {
  isValid: boolean;
  boundaryResult: BoundaryResult;
  safetyResponse?: ReturnType<typeof createSafetyResponse>;
} {
  const boundaryResult = analyzeContentSafety(content);
  
  if (!boundaryResult.shouldProceed) {
    return {
      isValid: false,
      boundaryResult,
      safetyResponse: createSafetyResponse(boundaryResult)
    };
  }
  
  return {
    isValid: true,
    boundaryResult
  };
}
