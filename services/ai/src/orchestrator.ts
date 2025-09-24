import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from './logger';
import { TherapistPromptResponseSchema, validateTherapistResponse, parseTherapistResponse } from './schemas/therapist-response';

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
  error?: string;
  promptVersion: string;
  validationResult?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  retryCount: number;
  latency: number;
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
   * Generate therapist response
   */
  async generateResponse(context: ConversationContext): Promise<OrchestratorResponse> {
    const startTime = Date.now();
    let retryCount = 0;
    
    try {
      // Load the appropriate prompt version
      const systemPrompt = this.loadTherapistPrompt(this.config.therapistPromptVersion);
      
      // Check for safety boundary
      if (context.safetyContext?.hasBoundary && context.safetyContext.boundaryTemplate) {
        return {
          success: true,
          response: context.safetyContext.boundaryTemplate,
          promptVersion: this.config.therapistPromptVersion,
          validationResult: {
            isValid: true,
            errors: [],
            warnings: []
          },
          retryCount: 0,
          latency: Date.now() - startTime
        };
      }
      
      // Build conversation context
      const conversationHistory = this.buildConversationHistory(context);
      
      // Generate response with retries
      let response: string;
      let validationResult;
      let lastError: Error | null = null;
      
      while (retryCount <= this.config.maxRetries) {
        try {
          response = await this.callOpenAI(systemPrompt, conversationHistory);
          
          // Validate response
          validationResult = parseTherapistResponse(response);
          
          if (validationResult.isValid) {
            logger.info('Response generated successfully', {
              sessionId: context.sessionId,
              retryCount,
              responseLength: response.length
            });
            break;
          } else {
            logger.warn('Response validation failed', {
              errors: validationResult.errors,
              warnings: validationResult.warnings,
              retryCount,
              responseLength: response.length
            });
            
            if (retryCount === this.config.maxRetries) {
              // Use fallback template
              response = this.config.fallbackTemplate;
              validationResult = {
                isValid: true,
                errors: [],
                warnings: ['Used fallback template due to validation failures']
              };
              logger.warn('Using fallback template', {
                sessionId: context.sessionId,
                retryCount,
                originalErrors: validationResult.errors
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
            // Use fallback template on final failure
            response = this.config.fallbackTemplate;
            validationResult = {
              isValid: true,
              errors: [],
              warnings: ['Used fallback template due to API failures']
            };
            logger.warn('Using fallback template due to API failure', {
              sessionId: context.sessionId,
              retryCount,
              lastError: lastError.message
            });
            break;
          }
        }
        
        retryCount++;
      }
      
      logger.info('Therapist response generated', {
        sessionId: context.sessionId,
        promptVersion: this.config.therapistPromptVersion,
        retryCount,
        latency: Date.now() - startTime,
        responseLength: response.length
      });
      
      return {
        success: true,
        response,
        promptVersion: this.config.therapistPromptVersion,
        validationResult,
        retryCount,
        latency: Date.now() - startTime
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
   * Call OpenAI API
   */
  private async callOpenAI(systemPrompt: string, conversationHistory: string): Promise<string> {
    // This is a mock implementation - in production, you would use the actual OpenAI API
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
      max_tokens: 500
    });
    
    return completion.choices[0]?.message?.content || '';
  }

  /**
   * Get available prompt versions
   */
  getAvailableVersions(): string[] {
    return ['v1', 'v2'];
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
