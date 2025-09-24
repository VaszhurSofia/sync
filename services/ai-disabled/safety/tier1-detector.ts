import keywords from './keywords.json';

interface SafetyResult {
  isSafe: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  action: 'allow' | 'warn' | 'block' | 'boundary';
  concerns: string[];
  message?: string;
  resources?: string[];
}

export class Tier1SafetyDetector {
  private keywords: any;

  constructor() {
    this.keywords = keywords;
  }

  /**
   * Check message against all safety patterns
   */
  checkMessage(content: string): SafetyResult {
    const lowerContent = content.toLowerCase();
    const concerns: string[] = [];
    let highestRisk: 'low' | 'medium' | 'high' = 'low';
    let action: 'allow' | 'warn' | 'block' | 'boundary' = 'allow';

    // Check Tier 1 patterns (highest priority)
    const tier1Result = this.checkTier1(lowerContent);
    if (tier1Result.concerns.length > 0) {
      concerns.push(...tier1Result.concerns);
      if (tier1Result.riskLevel === 'high') {
        highestRisk = 'high';
        action = 'block';
      }
    }

    // Check Tier 2 patterns
    const tier2Result = this.checkTier2(lowerContent);
    if (tier2Result.concerns.length > 0 && highestRisk !== 'high') {
      concerns.push(...tier2Result.concerns);
      if (tier2Result.riskLevel === 'medium') {
        highestRisk = 'medium';
        action = 'warn';
      }
    }

    // Check Red Team patterns
    const redTeamResult = this.checkRedTeam(lowerContent);
    if (redTeamResult.concerns.length > 0 && highestRisk !== 'high') {
      concerns.push(...redTeamResult.concerns);
      if (redTeamResult.riskLevel === 'high') {
        highestRisk = 'high';
        action = 'block';
      } else if (redTeamResult.riskLevel === 'medium' && highestRisk === 'low') {
        highestRisk = 'medium';
        action = 'warn';
      }
    }

    // Check for false positives (normal conflict language)
    const falsePositiveResult = this.checkFalsePositives(lowerContent);
    if (falsePositiveResult.isNormalConflict && highestRisk !== 'high') {
      // Override medium risk if it's normal conflict language
      if (highestRisk === 'medium') {
        highestRisk = 'low';
        action = 'allow';
        concerns.length = 0; // Clear concerns for normal conflict
      }
    }

    const isSafe = highestRisk === 'low';
    
    // Get appropriate message and resources
    let message: string | undefined;
    let resources: string[] | undefined;

    if (!isSafe) {
      const template = this.getBoundaryTemplate(highestRisk);
      message = template.message;
      resources = template.resources;
    }

    return {
      isSafe,
      riskLevel: highestRisk,
      action,
      concerns,
      message,
      resources
    };
  }

  /**
   * Check Tier 1 patterns (high risk)
   */
  private checkTier1(content: string): { concerns: string[]; riskLevel: 'low' | 'medium' | 'high' } {
    const concerns: string[] = [];

    // Check self-harm patterns
    for (const pattern of this.keywords.tier1.self_harm.patterns) {
      if (content.includes(pattern)) {
        concerns.push('self_harm');
        break;
      }
    }

    // Check violence patterns
    for (const pattern of this.keywords.tier1.violence.patterns) {
      if (content.includes(pattern)) {
        concerns.push('violence');
        break;
      }
    }

    // Check abuse patterns
    for (const pattern of this.keywords.tier1.abuse.patterns) {
      if (content.includes(pattern)) {
        concerns.push('abuse');
        break;
      }
    }

    return {
      concerns,
      riskLevel: concerns.length > 0 ? 'high' : 'low'
    };
  }

  /**
   * Check Tier 2 patterns (medium risk)
   */
  private checkTier2(content: string): { concerns: string[]; riskLevel: 'low' | 'medium' | 'high' } {
    const concerns: string[] = [];

    // Check emotional distress patterns
    for (const pattern of this.keywords.tier2.emotional_distress.patterns) {
      if (content.includes(pattern)) {
        concerns.push('emotional_distress');
        break;
      }
    }

    // Check relationship abuse patterns
    for (const pattern of this.keywords.tier2.relationship_abuse.patterns) {
      if (content.includes(pattern)) {
        concerns.push('relationship_abuse');
        break;
      }
    }

    // Check manipulation patterns
    for (const pattern of this.keywords.tier2.manipulation.patterns) {
      if (content.includes(pattern)) {
        concerns.push('manipulation');
        break;
      }
    }

    return {
      concerns,
      riskLevel: concerns.length > 0 ? 'medium' : 'low'
    };
  }

  /**
   * Check Red Team patterns (euphemisms, slang, coded language)
   */
  private checkRedTeam(content: string): { concerns: string[]; riskLevel: 'low' | 'medium' | 'high' } {
    const concerns: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check euphemisms
    for (const pattern of this.keywords.red_team.euphemisms.patterns) {
      if (content.includes(pattern)) {
        concerns.push('euphemisms');
        riskLevel = 'high';
        break;
      }
    }

    // Check slang
    for (const pattern of this.keywords.red_team.slang.patterns) {
      if (content.includes(pattern)) {
        concerns.push('slang');
        riskLevel = 'high';
        break;
      }
    }

    // Check coded language
    for (const pattern of this.keywords.red_team.coded_language.patterns) {
      if (content.includes(pattern)) {
        concerns.push('coded_language');
        if (riskLevel === 'low') riskLevel = 'medium';
        break;
      }
    }

    // Check relationship euphemisms
    for (const pattern of this.keywords.red_team.relationship_euphemisms.patterns) {
      if (content.includes(pattern)) {
        concerns.push('relationship_euphemisms');
        if (riskLevel === 'low') riskLevel = 'medium';
        break;
      }
    }

    // Check disguised threats
    for (const pattern of this.keywords.red_team.threats_disguised.patterns) {
      if (content.includes(pattern)) {
        concerns.push('threats_disguised');
        if (riskLevel === 'low') riskLevel = 'medium';
        break;
      }
    }

    return {
      concerns,
      riskLevel
    };
  }

  /**
   * Check for false positives (normal conflict language)
   */
  private checkFalsePositives(content: string): { isNormalConflict: boolean } {
    // Check normal conflict patterns
    for (const pattern of this.keywords.false_positives.normal_conflict.patterns) {
      if (content.includes(pattern)) {
        return { isNormalConflict: true };
      }
    }

    // Check metaphors
    for (const pattern of this.keywords.false_positives.metaphors.patterns) {
      if (content.includes(pattern)) {
        return { isNormalConflict: true };
      }
    }

    // Check expressions
    for (const pattern of this.keywords.false_positives.expressions.patterns) {
      if (content.includes(pattern)) {
        return { isNormalConflict: true };
      }
    }

    return { isNormalConflict: false };
  }

  /**
   * Get boundary template based on risk level
   */
  private getBoundaryTemplate(riskLevel: 'low' | 'medium' | 'high'): { message: string; resources: string[] } {
    if (riskLevel === 'high') {
      return this.keywords.boundary_templates.high_risk;
    } else if (riskLevel === 'medium') {
      return this.keywords.boundary_templates.medium_risk;
    } else {
      return this.keywords.boundary_templates.boundary_hit;
    }
  }

  /**
   * Set boundary flag for session
   */
  setBoundaryFlag(session: any): void {
    session.boundary_flag = true;
    session.turn_state = 'boundary';
  }

  /**
   * Check if session is boundary locked
   */
  isBoundaryLocked(session: any): boolean {
    return session.boundary_flag === true || session.turn_state === 'boundary';
  }
}

// Singleton instance
let detectorInstance: Tier1SafetyDetector | null = null;

export function getSafetyDetector(): Tier1SafetyDetector {
  if (!detectorInstance) {
    detectorInstance = new Tier1SafetyDetector();
  }
  return detectorInstance;
}
