/**
 * Therapist Markdown Validator
 * Fallback validator for when JSON parsing fails
 * Parses markdown sections and applies same validation rules
 */

import { TherapistV12 } from './therapistValidator';
import { validateTherapistV12 } from './therapistValidator';

const SENTENCE_REGEX = /[^.!?]+[.!?]+/g;

function countSentences(text: string): number {
  if (!text) return 0;
  const matches = text.match(SENTENCE_REGEX);
  return matches ? matches.length : 0;
}

function isYesNoQuestion(s: string): boolean {
  return /^\s*(do|does|did|are|is|was|were|will|would|can|could|should|shall|may|might)\b/i.test(s);
}

const BANNED_TERMS = /\b(always|never|should|must|narcissist|gaslighter|borderline|bipolar|diagnose|disorder|treatment|therapy)\b/i;

function startsWithInvitation(s: string): boolean {
  return /^\s*(you might|you could)\b/i.test(s);
}

export interface MarkdownParseResult {
  success: boolean;
  data?: TherapistV12;
  errors: string[];
}

/**
 * Parse markdown response into TherapistV12 format
 */
export function parseMarkdownResponse(markdown: string): MarkdownParseResult {
  const errors: string[] = [];
  
  try {
    // Extract sections using regex patterns
    const mirrorMatch = markdown.match(/\*\*MIRROR\*\*[\s\S]*?(?=\*\*|$)/i);
    const clarifyMatch = markdown.match(/\*\*CLARIFY\*\*[\s\S]*?(?=\*\*|$)/i);
    const exploreMatch = markdown.match(/\*\*EXPLORE\*\*[\s\S]*?(?=\*\*|$)/i);
    const microActionsMatch = markdown.match(/\*\*MICRO-ACTIONS\*\*[\s\S]*?(?=\*\*|$)/i);
    const checkMatch = markdown.match(/\*\*CHECK\*\*[\s\S]*?(?=\*\*|$)/i);
    
    if (!mirrorMatch) errors.push('Missing MIRROR section');
    if (!clarifyMatch) errors.push('Missing CLARIFY section');
    if (!exploreMatch) errors.push('Missing EXPLORE section');
    if (!checkMatch) errors.push('Missing CHECK section');
    
    if (errors.length > 0) {
      return { success: false, errors };
    }
    
    // Parse MIRROR section
    const mirrorText = mirrorMatch[0].replace(/\*\*MIRROR\*\*/i, '').trim();
    const partnerALine = mirrorText.match(/- Partner A: (.+)/i);
    const partnerBLine = mirrorText.match(/- Partner B: (.+)/i);
    
    if (!partnerALine) errors.push('Missing Partner A in MIRROR section');
    if (!partnerBLine) errors.push('Missing Partner B in MIRROR section');
    
    // Parse CLARIFY section
    const clarifyText = clarifyMatch[0].replace(/\*\*CLARIFY\*\*/i, '').trim();
    
    // Parse EXPLORE section
    const exploreText = exploreMatch[0].replace(/\*\*EXPLORE\*\*/i, '').trim();
    
    // Parse MICRO-ACTIONS section
    let microActions: string[] = [];
    if (microActionsMatch) {
      const microActionsText = microActionsMatch[0].replace(/\*\*MICRO-ACTIONS\*\*/i, '').trim();
      const actionLines = microActionsText.split('\n')
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(line => line.length > 0);
      microActions = actionLines;
    }
    
    // Parse CHECK section
    const checkText = checkMatch[0].replace(/\*\*CHECK\*\*/i, '').trim();
    
    if (errors.length > 0) {
      return { success: false, errors };
    }
    
    // Create TherapistV12 object
    const result: TherapistV12 = {
      mirror: {
        partnerA: partnerALine![1],
        partnerB: partnerBLine![1]
      },
      clarify: clarifyText,
      explore: exploreText,
      micro_actions: microActions,
      check: checkText,
      meta: {
        total_sentences: 0, // Will be calculated
        version: "therapist_v1.2"
      }
    };
    
    // Calculate total sentences
    const sA = countSentences(result.mirror.partnerA);
    const sB = countSentences(result.mirror.partnerB);
    const sC = countSentences(result.clarify);
    const sE = countSentences(result.explore);
    const sCheck = countSentences(result.check);
    const sActions = result.micro_actions.reduce((acc, s) => acc + countSentences(s), 0);
    
    result.meta.total_sentences = sA + sB + sC + sE + sCheck + sActions;
    
    return { success: true, data: result, errors: [] };
    
  } catch (error) {
    return { 
      success: false, 
      errors: [`Failed to parse markdown: ${error.message}`] 
    };
  }
}

/**
 * Validate markdown response with same rules as JSON validator
 */
export function validateMarkdownResponse(markdown: string): { ok: true; value: TherapistV12 } | { ok: false; errors: string[] } {
  const parseResult = parseMarkdownResponse(markdown);
  
  if (!parseResult.success) {
    return { ok: false, errors: parseResult.errors };
  }
  
  // Use the same validation logic as JSON validator
  return validateTherapistV12(parseResult.data);
}

/**
 * Convert TherapistV12 to markdown format
 */
export function formatTherapistV12AsMarkdown(data: TherapistV12): string {
  let markdown = '';
  
  // MIRROR section
  markdown += '**MIRROR**\n';
  markdown += `- Partner A: ${data.mirror.partnerA}\n`;
  markdown += `- Partner B: ${data.mirror.partnerB}\n\n`;
  
  // CLARIFY section
  markdown += '**CLARIFY**\n';
  markdown += `${data.clarify}\n\n`;
  
  // EXPLORE section
  markdown += '**EXPLORE**\n';
  markdown += `${data.explore}\n\n`;
  
  // MICRO-ACTIONS section
  if (data.micro_actions.length > 0) {
    markdown += '**MICRO-ACTIONS**\n';
    data.micro_actions.forEach(action => {
      markdown += `- ${action}\n`;
    });
    markdown += '\n';
  }
  
  // CHECK section
  markdown += '**CHECK**\n';
  markdown += `${data.check}\n`;
  
  return markdown;
}
