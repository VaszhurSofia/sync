import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from './logger';
// import { TherapistPromptResponseSchema, validateTherapistResponse, parseTherapistResponse } from './schemas/therapist-response';
import { 
  validateTherapistV12, 
  validateTherapistCoupleV20, 
  validateTherapistSoloV10,
  TherapistV12, 
  TherapistCoupleV20, 
  TherapistSoloV10,
  createSafeFallbackCouple,
  createSafeFallbackSolo,
  createBoundaryTemplateCouple,
  createBoundaryTemplateSolo
} from './validation/therapistValidator';
import { createSafeFallbackTemplate, createBoundaryTemplate, SafeFallbackContext } from './fallbacks/safeFallback';
import { telemetryCollector } from './telemetry';

export interface OrchestratorConfig {
  therapistPromptVersion: string;
  openaiApiKey: string;
  model: string;
  maxRetries: number;
  fallbackTemplate: string;
}

export interface ConversationContext {
  userAMessage: string;
  userBMessage: string;
  sessionId: string;
  mode: 'couple' | 'solo';
  previousMessages?: Array<{
    sender: 'userA' | 'userB';
    content: string;
    timestamp: Date;
  }>;
  safetyContext?: {
    hasBoundary: boolean;
    boundaryTemplate?: string;
  };
}

export interface OrchestratorResponse {
  success: boolean;
  response?: string;
  jsonResponse?: TherapistV12 | TherapistCoupleV20 | TherapistSoloV10;
  error?: string;
  promptVersion: string;
  mode: 'couple' | 'solo';
  validationResult?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  retryCount: number;
  latency: number;
  usedFallback?: boolean;
  usedBoundary?: boolean;
}

export class TherapistOrchestrator {
  private config: OrchestratorConfig;
  private promptCache = new Map<string, string>();

  constructor(config: OrchestratorConfig) {
    this.config = config;
  }

  /**
   * Load therapist prompt from file based on mode
   */
  private loadTherapistPrompt(mode: 'couple' | 'solo'): string {
    const version = mode === 'couple' ? 'couple_v2.0' : 'solo_v1.0';
    
    if (this.promptCache.has(version)) {
      return this.promptCache.get(version)!;
    }

    try {
      const promptPath = join(__dirname, '..', 'prompts', 'therapist', `${version}.md`);
      const prompt = readFileSync(promptPath, 'utf8');
      this.promptCache.set(version, prompt);
      
      logger.info('Therapist prompt loaded', {
        version,
        mode,
        promptLength: prompt.length
      });
      
      return prompt;
    } catch (error) {
      logger.error('Failed to load therapist prompt', {
        version,
        mode,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to load therapist prompt version ${version}`);
    }
  }

  /**
   * Generate therapist response with mode-based routing
   */
  async generateResponse(context: ConversationContext): Promise<OrchestratorResponse> {
    const startTime = Date.now();
    let retryCount = 0;
    
    try {
      // Load the appropriate prompt based on mode
      const systemPrompt = this.loadTherapistPrompt(context.mode);
      const promptVersion = context.mode === 'couple' ? 'couple_v2.0' : 'solo_v1.0';
      
      // Check for safety boundary - return boundary template immediately
      if (context.safetyContext?.hasBoundary) {
        const boundaryTemplate = context.mode === 'couple' 
          ? createBoundaryTemplateCouple() 
          : createBoundaryTemplateSolo();
        const boundaryLatency = Date.now() - startTime;
        
        // Record telemetry for boundary usage
        telemetryCollector.recordEvent({
          sessionId: context.sessionId,
          userId: 'unknown', // Would be provided in real implementation
          promptVersion,
          validatorPassed: true,
          totalSentences: boundaryTemplate.meta.total_sentences,
          latency: boundaryLatency,
          retryCount: 0,
          usedFallback: false,
          usedBoundary: true,
          modelUsed: this.config.model,
          temperature: 0.7,
          maxTokens: 800
        });
        
        logger.info('Using boundary template due to safety concerns', {
          sessionId: context.sessionId,
          mode: context.mode,
          hasBoundary: context.safetyContext.hasBoundary,
          latency: boundaryLatency
        });
        
        return {
          success: true,
          jsonResponse: boundaryTemplate,
          response: this.formatResponseForDisplay(boundaryTemplate, context.mode),
          promptVersion,
          mode: context.mode,
          validationResult: {
            isValid: true,
            errors: [],
            warnings: ['Used boundary template due to safety concerns']
          },
          retryCount: 0,
          latency: boundaryLatency,
          usedBoundary: true
        };
      }
      
      // Build conversation context
      const conversationHistory = this.buildConversationHistory(context);
      
      // Generate response with retries
      let jsonResponse: TherapistCoupleV20 | TherapistSoloV10 | null = null;
      let validationResult: any = null;
      let lastError: Error | null = null;
      
      while (retryCount <= this.config.maxRetries) {
        try {
          const rawResponse = await this.callOpenAIForJson(systemPrompt, conversationHistory);
          
          // Validate JSON response based on mode
          const validation = context.mode === 'couple' 
            ? validateTherapistCoupleV20(rawResponse)
            : validateTherapistSoloV10(rawResponse);
          
          if (validation.ok) {
            jsonResponse = validation.value;
            validationResult = {
              isValid: true,
              errors: [],
              warnings: []
            };
            
            logger.info('Response generated and validated successfully', {
              sessionId: context.sessionId,
              mode: context.mode,
              retryCount,
              totalSentences: jsonResponse.meta.total_sentences,
              version: jsonResponse.meta.version
            });
            break;
          } else {
            logger.warn('Response validation failed', {
              errors: validation.ok ? [] : (validation as any).errors,
              retryCount,
              sessionId: context.sessionId,
              mode: context.mode
            });
            
            // If not the last retry, include validation errors in the next attempt
            if (retryCount < this.config.maxRetries) {
              retryCount++;
              continue; // Retry with the same prompt (AI should learn from the structure)
            }
            
            if (retryCount === this.config.maxRetries) {
              // Use safe fallback template based on mode
              jsonResponse = context.mode === 'couple' 
                ? createSafeFallbackCouple()
                : createSafeFallbackSolo();
              validationResult = {
                isValid: true,
                errors: [],
                warnings: ['Used safe fallback template due to validation failures']
              };
              
              logger.warn('Using safe fallback template', {
                sessionId: context.sessionId,
                mode: context.mode,
                retryCount,
                originalErrors: validation.ok ? [] : (validation as any).errors
              });
              break;
            }
          }
        } catch (error) {
          lastError = error as Error;
          logger.error('OpenAI API call failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount,
            sessionId: context.sessionId,
            mode: context.mode
          });
          
          if (retryCount === this.config.maxRetries) {
            // Use safe fallback template on final failure
            jsonResponse = context.mode === 'couple' 
              ? createSafeFallbackCouple()
              : createSafeFallbackSolo();
            validationResult = {
              isValid: true,
              errors: [],
              warnings: ['Used safe fallback template due to API failures']
            };
            
            logger.warn('Using safe fallback template due to API failure', {
              sessionId: context.sessionId,
              mode: context.mode,
              retryCount,
              lastError: lastError.message
            });
            break;
          }
        }
        
        retryCount++;
      }
      
      const finalLatency = Date.now() - startTime;
      const usedFallback = validationResult?.warnings?.some((w: string) => w.includes('fallback')) || false;
      
      // Ensure we have a valid response
      if (!jsonResponse) {
        throw new Error('Failed to generate valid response after all retries');
      }
      
      // Record telemetry
      telemetryCollector.recordEvent({
        sessionId: context.sessionId,
        userId: 'unknown', // Would be provided in real implementation
        promptVersion,
        validatorPassed: validationResult?.isValid || false,
        totalSentences: jsonResponse.meta.total_sentences,
        latency: finalLatency,
        retryCount,
        usedFallback,
        usedBoundary: false,
        validationErrors: validationResult?.errors,
        modelUsed: this.config.model,
        temperature: 0.7,
        maxTokens: 800
      });
      
      logger.info('Therapist response generated', {
        sessionId: context.sessionId,
        mode: context.mode,
        promptVersion,
        retryCount,
        latency: finalLatency,
        totalSentences: jsonResponse.meta.total_sentences,
        usedFallback,
        validatorPassed: validationResult?.isValid || false
      });
      
      return {
        success: true,
        jsonResponse,
        response: this.formatResponseForDisplay(jsonResponse, context.mode),
        promptVersion,
        mode: context.mode,
        validationResult,
        retryCount,
        latency: finalLatency,
        usedFallback
      };
      
    } catch (error) {
      logger.error('Therapist orchestrator failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: context.sessionId,
        mode: context.mode,
        retryCount,
        latency: Date.now() - startTime
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        promptVersion: context.mode === 'couple' ? 'couple_v2.0' : 'solo_v1.0',
        mode: context.mode,
        retryCount,
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * Build conversation history for prompt
   */
  private buildConversationHistory(context: ConversationContext): string {
    let history = `Recent conversation:\n\n`;
    
    if (context.previousMessages && context.previousMessages.length > 0) {
      history += `Previous messages:\n`;
      context.previousMessages.slice(-4).forEach(msg => {
        history += `${msg.sender}: ${msg.content}\n`;
      });
      history += `\n`;
    }
    
    history += `Current exchange:\n`;
    history += `Partner A: ${context.userAMessage}\n`;
    history += `Partner B: ${context.userBMessage}\n\n`;
    
    history += `Please provide your response following the exact format specified in your instructions.`;
    
    return history;
  }

  /**
   * Call OpenAI API for JSON response
   */
  private async callOpenAIForJson(systemPrompt: string, conversationHistory: string): Promise<any> {
    const { OpenAI } = await import('openai');
    
    const openai = new OpenAI({
      apiKey: this.config.openaiApiKey
    });
    
    const completion = await openai.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: conversationHistory
        }
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: "json_object" }
    });
    
    const content = completion.choices[0]?.message?.content || '{}';
    
    try {
      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to parse JSON response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        content: content.substring(0, 200) + '...'
      });
      throw new Error('Invalid JSON response from OpenAI');
    }
  }

  /**
   * Format JSON response for display based on mode
   */
  private formatResponseForDisplay(jsonResponse: TherapistV12 | TherapistCoupleV20 | TherapistSoloV10, mode: 'couple' | 'solo'): string {
    let formatted = '';
    
    if (mode === 'couple') {
      const coupleResponse = jsonResponse as TherapistCoupleV20;
      
      // MIRROR section
      formatted += '**MIRROR**\n';
      formatted += `- Partner A: ${coupleResponse.mirror.partnerA}\n`;
      formatted += `- Partner B: ${coupleResponse.mirror.partnerB}\n\n`;
      
      // CLARIFY section
      formatted += '**CLARIFY**\n';
      formatted += `${coupleResponse.clarify}\n\n`;
      
      // EXPLORE section
      formatted += '**EXPLORE**\n';
      formatted += `${coupleResponse.explore}\n\n`;
      
      // MICRO-ACTIONS section
      if (coupleResponse.micro_actions.length > 0) {
        formatted += '**MICRO-ACTIONS**\n';
        coupleResponse.micro_actions.forEach(action => {
          formatted += `- ${action}\n`;
        });
        formatted += '\n';
      }
      
      // CHECK section
      formatted += '**CHECK**\n';
      formatted += `${coupleResponse.check}\n`;
    } else {
      const soloResponse = jsonResponse as TherapistSoloV10;
      
      // REFLECT section
      formatted += '**REFLECT**\n';
      formatted += `${soloResponse.reflect}\n\n`;
      
      // REFRAME section
      formatted += '**REFRAME**\n';
      formatted += `${soloResponse.reframe}\n\n`;
      
      // OPTIONS section
      if (soloResponse.options.length > 0) {
        formatted += '**OPTIONS**\n';
        soloResponse.options.forEach(option => {
          formatted += `- ${option}\n`;
        });
        formatted += '\n';
      }
      
      // STARTER section
      formatted += '**STARTER**\n';
      formatted += `${soloResponse.starter}\n\n`;
      
      // CHECK section
      formatted += '**CHECK**\n';
      formatted += `${soloResponse.check}\n`;
    }
    
    return formatted;
  }

  /**
   * Get available prompt versions
   */
  getAvailableVersions(): string[] {
    return ['couple_v2.0', 'solo_v1.0'];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Clear prompt cache if version changed
    if (newConfig.therapistPromptVersion) {
      this.promptCache.clear();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): OrchestratorConfig {
    return { ...this.config };
  }
}

// Singleton instance
let orchestratorInstance: TherapistOrchestrator | null = null;

export function getTherapistOrchestrator(): TherapistOrchestrator {
  if (!orchestratorInstance) {
    const config: OrchestratorConfig = {
      therapistPromptVersion: process.env.THERAPIST_PROMPT_VERSION || 'couple_v2.0',
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4',
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '2'),
      fallbackTemplate: `I understand this is a challenging conversation. Let me help you both feel heard and find a way forward together.

**MIRROR:**
I hear that you're both experiencing strong feelings about this situation.

**CLARIFY:**
This seems to be about finding common ground and understanding each other's perspectives.

**EXPLORE:**
What would help you both feel more connected right now?

**MICRO-ACTIONS:**
You might try taking a few deep breaths together. You could also practice listening without responding for a moment.

**CHECK:**
Would you like to try one of these approaches together?`
    };
    
    orchestratorInstance = new TherapistOrchestrator(config);
  }
  
  return orchestratorInstance;
}

export function initializeTherapistOrchestrator(config?: Partial<OrchestratorConfig>): void {
  const defaultConfig: OrchestratorConfig = {
    therapistPromptVersion: process.env.THERAPIST_PROMPT_VERSION || 'couple_v2.0',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '2'),
    fallbackTemplate: `I understand this is a challenging conversation. Let me help you both feel heard and find a way forward together.

**MIRROR:**
I hear that you're both experiencing strong feelings about this situation.

**CLARIFY:**
This seems to be about finding common ground and understanding each other's perspectives.

**EXPLORE:**
What would help you both feel more connected right now?

**MICRO-ACTIONS:**
You might try taking a few deep breaths together. You could also practice listening without responding for a moment.

**CHECK:**
Would you like to try one of these approaches together?`
  };
  
  orchestratorInstance = new TherapistOrchestrator({ ...defaultConfig, ...config });
  
  logger.info('Therapist orchestrator initialized', {
    promptVersion: orchestratorInstance.getConfig().therapistPromptVersion,
    availableVersions: orchestratorInstance.getAvailableVersions()
  });
}
