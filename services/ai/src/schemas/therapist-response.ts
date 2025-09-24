import { z } from 'zod';

/**
 * Schema for validating therapist prompt responses
 * Ensures output follows the required structure: MIRROR, CLARIFY, EXPLORE, MICRO-ACTIONS, CHECK
 */

// Individual section schemas
const MirrorSectionSchema = z.object({
  type: z.literal('MIRROR'),
  content: z.string().min(10).max(200),
  sentences: z.array(z.string()).min(1).max(2) // 1-2 sentences per partner
});

const ClarifySectionSchema = z.object({
  type: z.literal('CLARIFY'),
  content: z.string().min(10).max(300),
  sentences: z.array(z.string()).min(1).max(2) // Max 2 sentences
});

const ExploreSectionSchema = z.object({
  type: z.literal('EXPLORE'),
  content: z.string().min(10).max(200),
  question: z.string().min(10).max(150),
  isOpenEnded: z.boolean() // Must be true
});

const MicroActionsSectionSchema = z.object({
  type: z.literal('MICRO-ACTIONS'),
  content: z.string().min(10).max(300),
  actions: z.array(z.string()).min(1).max(2), // Up to 2 actions
  isInvitational: z.boolean() // Must use "You might try..." phrasing
});

const CheckSectionSchema = z.object({
  type: z.literal('CHECK'),
  content: z.string().min(10).max(200),
  question: z.string().min(10).max(150),
  isInclusive: z.boolean() // Must be inclusive of both partners
});

// Main response schema
export const TherapistResponseSchema = z.object({
  sections: z.array(z.union([
    MirrorSectionSchema,
    ClarifySectionSchema,
    ExploreSectionSchema,
    MicroActionsSectionSchema,
    CheckSectionSchema
  ])).length(5), // Must have exactly 5 sections
  
  // Overall constraints
  totalSentences: z.number().min(1).max(6), // Max 6 sentences total
  wordCount: z.number().min(50).max(500), // Reasonable word count
  isNeutral: z.boolean(), // Must remain neutral
  isEmpathetic: z.boolean(), // Must be empathetic
  isNonClinical: z.boolean(), // Must use non-clinical language
  
  // Safety check
  hasSafetyRisk: z.boolean().default(false),
  boundaryTemplate: z.string().optional()
});

// Boundary mode schema (when safety risk is detected)
export const BoundaryResponseSchema = z.object({
  isBoundaryMode: z.literal(true),
  boundaryTemplate: z.string().min(10),
  sections: z.array(z.any()).length(0) // No sections in boundary mode
});

// Union schema for all possible responses
export const TherapistPromptResponseSchema = z.union([
  TherapistResponseSchema,
  BoundaryResponseSchema
]);

// Type exports
export type TherapistResponse = z.infer<typeof TherapistResponseSchema>;
export type BoundaryResponse = z.infer<typeof BoundaryResponseSchema>;
export type TherapistPromptResponse = z.infer<typeof TherapistPromptResponseSchema>;

// Validation functions
export function validateTherapistResponse(response: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  response?: TherapistPromptResponse;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    const result = TherapistPromptResponseSchema.parse(response);
    
    // Additional validation rules
    if (!result.isBoundaryMode) {
      const therapistResponse = result as TherapistResponse;
      
      // Check section order
      const expectedOrder = ['MIRROR', 'CLARIFY', 'EXPLORE', 'MICRO-ACTIONS', 'CHECK'];
      const actualOrder = therapistResponse.sections.map(s => s.type);
      
      if (JSON.stringify(actualOrder) !== JSON.stringify(expectedOrder)) {
        errors.push(`Sections must be in order: ${expectedOrder.join(', ')}`);
      }
      
      // Check sentence count
      if (therapistResponse.totalSentences > 6) {
        errors.push('Total sentences must not exceed 6');
      }
      
      // Check for clinical language
      const clinicalTerms = ['diagnosis', 'disorder', 'syndrome', 'pathology', 'treatment', 'therapy', 'intervention'];
      const responseText = therapistResponse.sections.map(s => s.content).join(' ').toLowerCase();
      
      for (const term of clinicalTerms) {
        if (responseText.includes(term)) {
          warnings.push(`Avoid clinical language: "${term}"`);
        }
      }
      
      // Check for bias indicators
      const biasIndicators = ['you should', 'you must', 'you need to', 'you have to'];
      for (const indicator of biasIndicators) {
        if (responseText.includes(indicator)) {
          warnings.push(`Avoid directive language: "${indicator}"`);
        }
      }
      
      // Check for invitational language in micro-actions
      const microActionsSection = therapistResponse.sections.find(s => s.type === 'MICRO-ACTIONS') as any;
      if (microActionsSection && !microActionsSection.isInvitational) {
        warnings.push('Micro-actions should use invitational language ("You might try...")');
      }
      
      // Check for open-ended questions
      const exploreSection = therapistResponse.sections.find(s => s.type === 'EXPLORE') as any;
      if (exploreSection && !exploreSection.isOpenEnded) {
        errors.push('Explore section must contain an open-ended question');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      response: result
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        warnings: [],
        response: undefined
      };
    }
    
    return {
      isValid: false,
      errors: ['Unknown validation error'],
      warnings: [],
      response: undefined
    };
  }
}

// Helper function to parse raw text response
export function parseTherapistResponse(text: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  response?: TherapistPromptResponse;
} {
  try {
    // Check if it's boundary mode
    if (text.includes('BOUNDARY_TEMPLATE') || text.includes('safety risk detected') || text.includes('SAFETY_RISK')) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        response: {
          isBoundaryMode: true,
          boundaryTemplate: text,
          sections: []
        }
      };
    }
    
    // Parse structured response
    const sections = [];
    const sectionRegex = /\*\*(MIRROR|CLARIFY|EXPLORE|MICRO-ACTIONS|CHECK):\*\*\s*([\s\S]*?)(?=\*\*[A-Z]+:\*\*|$)/g;
    let match;
    
    while ((match = sectionRegex.exec(text)) !== null) {
      const type = match[1];
      const content = match[2].trim();
      
      // Count sentences in content
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      switch (type) {
        case 'MIRROR':
          sections.push({
            type: 'MIRROR',
            content,
            sentences
          });
          break;
        case 'CLARIFY':
          sections.push({
            type: 'CLARIFY',
            content,
            sentences
          });
          break;
        case 'EXPLORE':
          // Extract question (usually ends with ?)
          const questionMatch = content.match(/([^.!?]*\?)/);
          const question = questionMatch ? questionMatch[1].trim() : content;
          sections.push({
            type: 'EXPLORE',
            content,
            question,
            isOpenEnded: !question.toLowerCase().includes('yes') && !question.toLowerCase().includes('no')
          });
          break;
        case 'MICRO-ACTIONS':
          // Extract actions (usually start with "You might try" or similar)
          const actionMatches = content.match(/You might try[^.!?]*[.!?]/g) || [];
          sections.push({
            type: 'MICRO-ACTIONS',
            content,
            actions: actionMatches,
            isInvitational: content.toLowerCase().includes('you might try')
          });
          break;
        case 'CHECK':
          // Extract check question
          const checkMatch = content.match(/([^.!?]*\?)/);
          const checkQuestion = checkMatch ? checkMatch[1].trim() : content;
          sections.push({
            type: 'CHECK',
            content,
            question: checkQuestion,
            isInclusive: checkQuestion.toLowerCase().includes('both') || checkQuestion.toLowerCase().includes('each')
          });
          break;
      }
    }
    
    // Calculate total metrics
    const totalSentences = sections.reduce((sum, section) => sum + section.sentences.length, 0);
    const wordCount = text.split(/\s+/).length;
    
    // Check for neutrality, empathy, and non-clinical language
    const isNeutral = !text.toLowerCase().includes('you should') && !text.toLowerCase().includes('you must');
    const isEmpathetic = text.toLowerCase().includes('feel') || text.toLowerCase().includes('understand');
    const isNonClinical = !text.toLowerCase().includes('diagnosis') && !text.toLowerCase().includes('disorder');
    
    const response: TherapistResponse = {
      sections,
      totalSentences,
      wordCount,
      isNeutral,
      isEmpathetic,
      isNonClinical,
      hasSafetyRisk: false
    };
    
    return validateTherapistResponse(response);
    
  } catch (error) {
    return {
      isValid: false,
      errors: ['Failed to parse response text'],
      warnings: [],
      response: undefined
    };
  }
}
