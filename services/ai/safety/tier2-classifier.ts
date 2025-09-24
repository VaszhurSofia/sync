/**
 * Tier-2 Safety Classifier
 * Few-shot classifier for nuanced safety detection beyond regex patterns
 */

import { logger } from '../logger';

export interface Tier2Classification {
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  categories: string[];
  reasoning: string;
  action: 'allow' | 'warn' | 'block';
  boundaryTemplate?: string;
}

export interface Tier2TrainingExample {
  text: string;
  riskLevel: 'low' | 'medium' | 'high';
  categories: string[];
  reasoning: string;
}

export class Tier2SafetyClassifier {
  private trainingExamples: Tier2TrainingExample[] = [];
  private conservativeThreshold: number = 0.7; // Conservative threshold for safety

  constructor() {
    this.loadTrainingExamples();
  }

  /**
   * Load few-shot training examples
   */
  private loadTrainingExamples(): void {
    this.trainingExamples = [
      // High risk examples
      {
        text: "I want to hurt myself because of this relationship",
        riskLevel: 'high',
        categories: ['self_harm', 'relationship_distress'],
        reasoning: 'Direct expression of self-harm intent related to relationship'
      },
      {
        text: "I'm going to make you pay for what you've done to me",
        riskLevel: 'high',
        categories: ['threats', 'revenge'],
        reasoning: 'Threat of retaliation and revenge'
      },
      {
        text: "You'll regret this when I'm gone forever",
        riskLevel: 'high',
        categories: ['self_harm', 'manipulation'],
        reasoning: 'Implied self-harm threat used as manipulation'
      },
      {
        text: "I can't take this anymore, I'm done with everything",
        riskLevel: 'high',
        categories: ['self_harm', 'hopelessness'],
        reasoning: 'Expression of hopelessness and potential self-harm intent'
      },

      // Medium risk examples
      {
        text: "I hate myself because of you",
        riskLevel: 'medium',
        categories: ['self_blame', 'relationship_distress'],
        reasoning: 'Self-blame and relationship distress but not direct self-harm threat'
      },
      {
        text: "You're destroying my life and I can't handle it",
        riskLevel: 'medium',
        categories: ['relationship_distress', 'overwhelm'],
        reasoning: 'Relationship distress and overwhelm but not direct threat'
      },
      {
        text: "I wish I could just disappear from this world",
        riskLevel: 'medium',
        categories: ['escape_fantasy', 'distress'],
        reasoning: 'Escape fantasy but not direct self-harm intent'
      },
      {
        text: "You'll be sorry when you realize what you've lost",
        riskLevel: 'medium',
        categories: ['manipulation', 'threats'],
        reasoning: 'Manipulative language with implied consequences'
      },

      // Low risk examples
      {
        text: "I'm really frustrated with this situation",
        riskLevel: 'low',
        categories: ['frustration'],
        reasoning: 'Normal expression of frustration without safety concerns'
      },
      {
        text: "This is driving me crazy but I love you",
        riskLevel: 'low',
        categories: ['frustration', 'love'],
        reasoning: 'Frustration expressed with love and commitment'
      },
      {
        text: "I hate when you do this but I understand why",
        riskLevel: 'low',
        categories: ['frustration', 'understanding'],
        reasoning: 'Frustration with understanding and empathy'
      },
      {
        text: "This is killing me but we'll get through it",
        riskLevel: 'low',
        categories: ['metaphor', 'hope'],
        reasoning: 'Metaphorical expression with positive outlook'
      }
    ];
  }

  /**
   * Classify message using few-shot learning
   */
  classifyMessage(text: string): Tier2Classification {
    const normalizedText = text.toLowerCase().trim();
    
    // Find most similar training examples
    const similarities = this.calculateSimilarities(normalizedText);
    
    // Weight by similarity and risk level
    const weightedScores = this.calculateWeightedScores(similarities);
    
    // Determine risk level based on weighted scores
    const riskLevel = this.determineRiskLevel(weightedScores);
    const confidence = this.calculateConfidence(weightedScores, riskLevel);
    
    // Get categories and reasoning
    const { categories, reasoning } = this.extractCategoriesAndReasoning(similarities, riskLevel);
    
    // Determine action based on risk level and confidence
    const action = this.determineAction(riskLevel, confidence);
    
    // Generate boundary template if needed
    const boundaryTemplate = this.generateBoundaryTemplate(riskLevel, categories);

    const classification: Tier2Classification = {
      riskLevel,
      confidence,
      categories,
      reasoning,
      action,
      boundaryTemplate
    };

    logger.info('Tier-2 classification completed', {
      riskLevel,
      confidence,
      categories,
      action,
      textLength: text.length
    });

    return classification;
  }

  /**
   * Calculate similarities to training examples
   */
  private calculateSimilarities(text: string): Array<{
    example: Tier2TrainingExample;
    similarity: number;
  }> {
    return this.trainingExamples.map(example => ({
      example,
      similarity: this.calculateTextSimilarity(text, example.text)
    })).sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate text similarity using simple word overlap
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Calculate weighted scores based on similarity and risk level
   */
  private calculateWeightedScores(similarities: Array<{
    example: Tier2TrainingExample;
    similarity: number;
  }>): {
    low: number;
    medium: number;
    high: number;
  } {
    const scores = { low: 0, medium: 0, high: 0 };
    
    similarities.forEach(({ example, similarity }) => {
      const weight = similarity * similarity; // Square to emphasize high similarities
      scores[example.riskLevel] += weight;
    });
    
    return scores;
  }

  /**
   * Determine risk level from weighted scores
   */
  private determineRiskLevel(scores: { low: number; medium: number; high: number }): 'low' | 'medium' | 'high' {
    const total = scores.low + scores.medium + scores.high;
    
    if (total === 0) {
      return 'low'; // Default to low if no similarities
    }
    
    const highRatio = scores.high / total;
    const mediumRatio = scores.medium / total;
    const lowRatio = scores.low / total;
    
    // Conservative approach: prioritize higher risk levels
    if (highRatio >= 0.3) return 'high';
    if (mediumRatio >= 0.4) return 'medium';
    if (lowRatio >= 0.5) return 'low';
    
    // Fallback to highest score
    if (scores.high >= scores.medium && scores.high >= scores.low) return 'high';
    if (scores.medium >= scores.low) return 'medium';
    return 'low';
  }

  /**
   * Calculate confidence in classification
   */
  private calculateConfidence(
    scores: { low: number; medium: number; high: number },
    riskLevel: 'low' | 'medium' | 'high'
  ): number {
    const total = scores.low + scores.medium + scores.high;
    if (total === 0) return 0;
    
    const selectedScore = scores[riskLevel];
    const maxOtherScore = Math.max(
      riskLevel === 'low' ? Math.max(scores.medium, scores.high) : scores.low,
      riskLevel === 'medium' ? Math.max(scores.low, scores.high) : scores.low,
      riskLevel === 'high' ? Math.max(scores.low, scores.medium) : scores.low
    );
    
    return Math.min(1, selectedScore / (selectedScore + maxOtherScore + 0.1));
  }

  /**
   * Extract categories and reasoning from similar examples
   */
  private extractCategoriesAndReasoning(
    similarities: Array<{ example: Tier2TrainingExample; similarity: number }>,
    riskLevel: 'low' | 'medium' | 'high'
  ): { categories: string[]; reasoning: string } {
    const relevantExamples = similarities
      .filter(s => s.similarity > 0.1 && s.example.riskLevel === riskLevel)
      .slice(0, 3); // Top 3 most similar examples
    
    const categories = new Set<string>();
    const reasoningParts: string[] = [];
    
    relevantExamples.forEach(({ example, similarity }) => {
      example.categories.forEach(cat => categories.add(cat));
      if (similarity > 0.3) {
        reasoningParts.push(example.reasoning);
      }
    });
    
    return {
      categories: Array.from(categories),
      reasoning: reasoningParts.length > 0 
        ? reasoningParts.join('; ') 
        : `Classified as ${riskLevel} risk based on pattern matching`
    };
  }

  /**
   * Determine action based on risk level and confidence
   */
  private determineAction(riskLevel: 'low' | 'medium' | 'high', confidence: number): 'allow' | 'warn' | 'block' {
    if (riskLevel === 'high' && confidence >= this.conservativeThreshold) {
      return 'block';
    }
    
    if (riskLevel === 'medium' && confidence >= this.conservativeThreshold) {
      return 'warn';
    }
    
    if (riskLevel === 'high' && confidence < this.conservativeThreshold) {
      return 'warn'; // Conservative approach for uncertain high risk
    }
    
    return 'allow';
  }

  /**
   * Generate boundary template based on risk level and categories
   */
  private generateBoundaryTemplate(
    riskLevel: 'low' | 'medium' | 'high',
    categories: string[]
  ): string | undefined {
    if (riskLevel === 'low') return undefined;
    
    const hasSelfHarm = categories.includes('self_harm');
    const hasThreats = categories.includes('threats') || categories.includes('revenge');
    const hasManipulation = categories.includes('manipulation');
    
    if (hasSelfHarm) {
      return `We're concerned about your wellbeing. This message contains content that suggests you might be in distress. Please reach out to someone you trust or contact a mental health professional. Resources: National Suicide Prevention Lifeline: 988, Crisis Text Line: Text HOME to 741741, Emergency Services: 911`;
    }
    
    if (hasThreats) {
      return `This message contains threatening language. Please take a step back and consider the impact of your words. If you're feeling overwhelmed, please reach out for support.`;
    }
    
    if (hasManipulation) {
      return `This message contains manipulative language that could be harmful to your relationship. Consider taking a break and returning to this conversation when you both feel calmer.`;
    }
    
    if (riskLevel === 'medium') {
      return `We've noticed this message might be challenging for your relationship. Consider taking a break and returning to this conversation when you both feel calmer.`;
    }
    
    return undefined;
  }

  /**
   * Update conservative threshold
   */
  setConservativeThreshold(threshold: number): void {
    this.conservativeThreshold = Math.max(0.1, Math.min(1.0, threshold));
    logger.info('Conservative threshold updated', { threshold: this.conservativeThreshold });
  }

  /**
   * Get current threshold
   */
  getConservativeThreshold(): number {
    return this.conservativeThreshold;
  }

  /**
   * Add new training example
   */
  addTrainingExample(example: Tier2TrainingExample): void {
    this.trainingExamples.push(example);
    logger.info('Training example added', {
      riskLevel: example.riskLevel,
      categories: example.categories
    });
  }

  /**
   * Get training examples count
   */
  getTrainingExamplesCount(): number {
    return this.trainingExamples.length;
  }
}

// Singleton instance
let tier2ClassifierInstance: Tier2SafetyClassifier | null = null;

export function getTier2Classifier(): Tier2SafetyClassifier {
  if (!tier2ClassifierInstance) {
    tier2ClassifierInstance = new Tier2SafetyClassifier();
  }
  return tier2ClassifierInstance;
}
