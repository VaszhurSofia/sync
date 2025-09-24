// Stub implementation for AI safety tier1-detector
// This is a temporary implementation until the AI service is re-enabled

export interface Tier1Result {
  detected: boolean;
  patterns: string[];
  riskLevel: 'low' | 'medium' | 'high';
  isSafe: boolean;
  message: string;
  resources: string[];
  concerns: string[];
  action: string;
}

export function detectTier1Safety(content: string): Tier1Result {
  // Simple stub implementation
  const dangerousPatterns = [
    /self.?harm/i,
    /suicide/i,
    /kill.*self/i,
    /hurt.*self/i,
    /violence/i,
    /abuse/i,
    /threat/i
  ];
  
  const detectedPatterns: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) {
      detectedPatterns.push(pattern.source);
      riskLevel = 'high';
    }
  }
  
  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    riskLevel,
    isSafe: detectedPatterns.length === 0,
    message: detectedPatterns.length > 0 ? 'Safety concerns detected' : 'Content appears safe',
    resources: detectedPatterns.length > 0 ? ['Emergency: 112', 'Crisis helpline: 116 123'] : [],
    concerns: detectedPatterns,
    action: detectedPatterns.length > 0 ? 'block' : 'allow'
  };
}
