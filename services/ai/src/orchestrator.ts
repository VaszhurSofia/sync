import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from './logger';
import { TherapistPromptResponseSchema, validateTherapistResponse, parseTherapistResponse } from './schemas/therapist-response';
import { validateTherapistV12, TherapistV12 } from './validation/therapistValidator';
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
  jsonResponse?: TherapistV12;
  error?: string;
  promptVersion: string;
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
   * Load therapist prompt from file
   */
  private loadTherapistPrompt(version: string): string {
    if (this.promptCache.has(version)) {
      return this.promptCache.get(version)!;
    }

    try {
      const promptPath = join(__dirname, '..', 'prompts', 'therapist', `${version}.md`);
      const prompt = readFileSync(promptPath, 'utf8');
      this.promptCache.set(version, prompt);
      
      logger.info('Therapist prompt loaded', {
        version,
        promptLength: prompt.length
      });
      
      return prompt;
    } catch (error) {
      logger.error('Failed to load therapist prompt', {
        version,
        error: error.message
      });
      throw new Error(`Failed to load therapist prompt version ${version}`);
    }
  }

  /**
   * Generate therapist response with v1.2 JSON validation
   */
  async generateResponse(context: ConversationContext): Promise<OrchestratorResponse> {
    const startTime = Date.now();
    let retryCount = 0;
    
    try {
      // Load the appropriate prompt version
      const systemPrompt = this.loadTherapistPrompt(this.config.therapistPromptVersion);
      
      // Check for safety boundary - return boundary template immediately
      if (context.safetyContext?.hasBoundary) {
        const boundaryTemplate = createBoundaryTemplate();
        const boundaryLatency = Date.now() - startTime;
        
        // Record telemetry for boundary usage
        telemetryCollector.recordEvent({
          sessionId: context.sessionId,
          userId: 'unknown', // Would be provided in real implementation
          promptVersion: this.config.therapistPromptVersion,
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
          hasBoundary: context.safetyContext.hasBoundary,
          latency: boundaryLatency
        });
        
        return {
          success: true,
          jsonResponse: boundaryTemplate,
          response: this.formatResponseForDisplay(boundaryTemplate),
          promptVersion: this.config.therapistPromptVersion,
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
      let jsonResponse: TherapistV12;
      let validationResult;
      let lastError: Error | null = null;
      
      while (retryCount <= this.config.maxRetries) {
        try {
          const rawResponse = await this.callOpenAIForJson(systemPrompt, conversationHistory);
          
          // Validate JSON response
          const validation = validateTherapistV12(rawResponse);
          
          if (validation.ok) {
            jsonResponse = validation.value;
            validationResult = {
              isValid: true,
              errors: [],
              warnings: []
            };
            
            logger.info('Response generated and validated successfully', {
              sessionId: context.sessionId,
              retryCount,
              totalSentences: jsonResponse.meta.total_sentences,
              version: jsonResponse.meta.version
            });
            break;
          } else {
            logger.warn('Response validation failed', {
              errors: validation.errors,
              retryCount,
              sessionId: context.sessionId
            });
            
            if (retryCount === this.config.maxRetries) {
              // Use safe fallback template
              const fallbackContext: SafeFallbackContext = {
                sessionId: context.sessionId,
                userId: 'unknown', // Would be provided in real implementation
                partnerId: 'unknown',
                messageCount: context.previousMessages?.length || 0,
                hasBoundaryFlag: context.safetyContext?.hasBoundary || false,
                lastMessageContent: context.userBMessage
              };
              
              jsonResponse = createSafeFallbackTemplate(fallbackContext);
              validationResult = {
                isValid: true,
                errors: [],
                warnings: ['Used safe fallback template due to validation failures']
              };
              
              logger.warn('Using safe fallback template', {
                sessionId: context.sessionId,
                retryCount,
                originalErrors: validation.errors
              });
              break;
            }
          }
        } catch (error) {
          lastError = error as Error;
          logger.error('OpenAI API call failed', {
            error: error.message,
            retryCount,
            sessionId: context.sessionId
          });
          
          if (retryCount === this.config.maxRetries) {
            // Use safe fallback template on final failure
            const fallbackContext: SafeFallbackContext = {
              sessionId: context.sessionId,
              userId: 'unknown',
              partnerId: 'unknown',
              messageCount: context.previousMessages?.length || 0,
              hasBoundaryFlag: context.safetyContext?.hasBoundary || false,
              lastMessageContent: context.userBMessage
            };
            
            jsonResponse = createSafeFallbackTemplate(fallbackContext);
            validationResult = {
              isValid: true,
              errors: [],
              warnings: ['Used safe fallback template due to API failures']
            };
            
            logger.warn('Using safe fallback template due to API failure', {
              sessionId: context.sessionId,
              retryCount,
              lastError: lastError.message
            });
            break;
          }
        }
        
        retryCount++;
      }
      
      const finalLatency = Date.now() - startTime;
      const usedFallback = validationResult?.warnings?.some(w => w.includes('fallback')) || false;
      
      // Record telemetry
      telemetryCollector.recordEvent({
        sessionId: context.sessionId,
        userId: 'unknown', // Would be provided in real implementation
        promptVersion: this.config.therapistPromptVersion,
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
        promptVersion: this.config.therapistPromptVersion,
        retryCount,
        latency: finalLatency,
        totalSentences: jsonResponse.meta.total_sentences,
        usedFallback,
        validatorPassed: validationResult?.isValid || false
      });
      
      return {
        success: true,
        jsonResponse,
        response: this.formatResponseForDisplay(jsonResponse),
        promptVersion: this.config.therapistPromptVersion,
        validationResult,
        retryCount,
        latency: finalLatency,
        usedFallback
      };
      
    } catch (error) {
      logger.error('Therapist orchestrator failed', {
        error: error.message,
        sessionId: context.sessionId,
        retryCount,
        latency: Date.now() - startTime
      });
      
      return {
        success: false,
        error: error.message,
        promptVersion: this.config.therapistPromptVersion,
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
        error: error.message,
        content: content.substring(0, 200) + '...'
      });
      throw new Error('Invalid JSON response from OpenAI');
    }
  }

  /**
   * Format JSON response for display
   */
  private formatResponseForDisplay(jsonResponse: TherapistV12): string {
    let formatted = '';
    
    // MIRROR section
    formatted += '**MIRROR**\n';
    formatted += `- Partner A: ${jsonResponse.mirror.partnerA}\n`;
    formatted += `- Partner B: ${jsonResponse.mirror.partnerB}\n\n`;
    
    // CLARIFY section
    formatted += '**CLARIFY**\n';
    formatted += `${jsonResponse.clarify}\n\n`;
    
    // EXPLORE section
    formatted += '**EXPLORE**\n';
    formatted += `${jsonResponse.explore}\n\n`;
    
    // MICRO-ACTIONS section
    if (jsonResponse.micro_actions.length > 0) {
      formatted += '**MICRO-ACTIONS**\n';
      jsonResponse.micro_actions.forEach(action => {
        formatted += `- ${action}\n`;
      });
      formatted += '\n';
    }
    
    // CHECK section
    formatted += '**CHECK**\n';
    formatted += `${jsonResponse.check}\n`;
    
    return formatted;
  }

  /**
   * Get available prompt versions
   */
  getAvailableVersions(): string[] {
    return ['v1', 'v2', 'v1.2'];
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
      therapistPromptVersion: process.env.THERAPIST_PROMPT_VERSION || 'v1',
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
    therapistPromptVersion: process.env.THERAPIST_PROMPT_VERSION || 'v1',
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
