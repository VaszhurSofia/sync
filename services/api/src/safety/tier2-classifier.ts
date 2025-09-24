// Stub implementation for AI safety tier2-classifier
// This is a temporary implementation until the AI service is re-enabled

export interface Tier2Result {
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  concerns: string[];
}

export function classifyTier2Safety(content: string): Tier2Result {
  // Simple stub implementation
  const concerns: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  let confidence = 0.5;
  
  // Check for concerning patterns
  if (/emotional.*abuse/i.test(content)) {
    concerns.push('potential emotional abuse language');
    riskLevel = 'medium';
    confidence = 0.7;
  }
  
  if (/manipulat/i.test(content)) {
    concerns.push('potential manipulation language');
    riskLevel = 'high';
    confidence = 0.8;
  }
  
  return {
    riskLevel,
    confidence,
    concerns
  };
}
