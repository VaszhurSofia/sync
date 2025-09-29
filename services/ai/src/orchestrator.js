"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TherapistOrchestrator = void 0;
exports.getTherapistOrchestrator = getTherapistOrchestrator;
exports.initializeTherapistOrchestrator = initializeTherapistOrchestrator;
const fs_1 = require("fs");
const path_1 = require("path");
const logger_1 = require("./logger");
// import { TherapistPromptResponseSchema, validateTherapistResponse, parseTherapistResponse } from './schemas/therapist-response';
const therapistValidator_1 = require("./validation/therapistValidator");
const telemetry_1 = require("./telemetry");
class TherapistOrchestrator {
    config;
    promptCache = new Map();
    constructor(config) {
        this.config = config;
    }
    /**
     * Load therapist prompt from file based on mode
     */
    loadTherapistPrompt(mode) {
        const version = mode === 'couple' ? 'couple_v2.0' : 'solo_v1.0';
        if (this.promptCache.has(version)) {
            return this.promptCache.get(version);
        }
        try {
            const promptPath = (0, path_1.join)(__dirname, '..', 'prompts', 'therapist', `${version}.md`);
            const prompt = (0, fs_1.readFileSync)(promptPath, 'utf8');
            this.promptCache.set(version, prompt);
            logger_1.logger.info('Therapist prompt loaded', {
                version,
                mode,
                promptLength: prompt.length
            });
            return prompt;
        }
        catch (error) {
            logger_1.logger.error('Failed to load therapist prompt', {
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
    async generateResponse(context) {
        const startTime = Date.now();
        let retryCount = 0;
        try {
            // Load the appropriate prompt based on mode
            const systemPrompt = this.loadTherapistPrompt(context.mode);
            const promptVersion = context.mode === 'couple' ? 'couple_v2.0' : 'solo_v1.0';
            // Check for safety boundary - return boundary template immediately
            if (context.safetyContext?.hasBoundary) {
                const boundaryTemplate = context.mode === 'couple'
                    ? (0, therapistValidator_1.createBoundaryTemplateCouple)()
                    : (0, therapistValidator_1.createBoundaryTemplateSolo)();
                const boundaryLatency = Date.now() - startTime;
                // Record telemetry for boundary usage
                telemetry_1.telemetryCollector.recordEvent({
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
                logger_1.logger.info('Using boundary template due to safety concerns', {
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
            let jsonResponse = null;
            let validationResult = null;
            let lastError = null;
            while (retryCount <= this.config.maxRetries) {
                try {
                    const rawResponse = await this.callOpenAIForJson(systemPrompt, conversationHistory);
                    // Validate JSON response based on mode
                    const validation = context.mode === 'couple'
                        ? (0, therapistValidator_1.validateTherapistCoupleV20)(rawResponse)
                        : (0, therapistValidator_1.validateTherapistSoloV10)(rawResponse);
                    if (validation.ok) {
                        jsonResponse = validation.value;
                        validationResult = {
                            isValid: true,
                            errors: [],
                            warnings: []
                        };
                        logger_1.logger.info('Response generated and validated successfully', {
                            sessionId: context.sessionId,
                            mode: context.mode,
                            retryCount,
                            totalSentences: jsonResponse.meta.total_sentences,
                            version: jsonResponse.meta.version
                        });
                        break;
                    }
                    else {
                        logger_1.logger.warn('Response validation failed', {
                            errors: validation.ok ? [] : validation.errors,
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
                                ? (0, therapistValidator_1.createSafeFallbackCouple)()
                                : (0, therapistValidator_1.createSafeFallbackSolo)();
                            validationResult = {
                                isValid: true,
                                errors: [],
                                warnings: ['Used safe fallback template due to validation failures']
                            };
                            logger_1.logger.warn('Using safe fallback template', {
                                sessionId: context.sessionId,
                                mode: context.mode,
                                retryCount,
                                originalErrors: validation.ok ? [] : validation.errors
                            });
                            break;
                        }
                    }
                }
                catch (error) {
                    lastError = error;
                    logger_1.logger.error('OpenAI API call failed', {
                        error: error instanceof Error ? error.message : 'Unknown error',
                        retryCount,
                        sessionId: context.sessionId,
                        mode: context.mode
                    });
                    if (retryCount === this.config.maxRetries) {
                        // Use safe fallback template on final failure
                        jsonResponse = context.mode === 'couple'
                            ? (0, therapistValidator_1.createSafeFallbackCouple)()
                            : (0, therapistValidator_1.createSafeFallbackSolo)();
                        validationResult = {
                            isValid: true,
                            errors: [],
                            warnings: ['Used safe fallback template due to API failures']
                        };
                        logger_1.logger.warn('Using safe fallback template due to API failure', {
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
            const usedFallback = validationResult?.warnings?.some((w) => w.includes('fallback')) || false;
            // Ensure we have a valid response
            if (!jsonResponse) {
                throw new Error('Failed to generate valid response after all retries');
            }
            // Record telemetry
            telemetry_1.telemetryCollector.recordEvent({
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
            logger_1.logger.info('Therapist response generated', {
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
        }
        catch (error) {
            logger_1.logger.error('Therapist orchestrator failed', {
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
    buildConversationHistory(context) {
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
    async callOpenAIForJson(systemPrompt, conversationHistory) {
        const { OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
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
        }
        catch (error) {
            logger_1.logger.error('Failed to parse JSON response', {
                error: error instanceof Error ? error.message : 'Unknown error',
                content: content.substring(0, 200) + '...'
            });
            throw new Error('Invalid JSON response from OpenAI');
        }
    }
    /**
     * Format JSON response for display based on mode
     */
    formatResponseForDisplay(jsonResponse, mode) {
        let formatted = '';
        if (mode === 'couple') {
            const coupleResponse = jsonResponse;
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
        }
        else {
            const soloResponse = jsonResponse;
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
    getAvailableVersions() {
        return ['couple_v2.0', 'solo_v1.0'];
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        // Clear prompt cache if version changed
        if (newConfig.therapistPromptVersion) {
            this.promptCache.clear();
        }
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.TherapistOrchestrator = TherapistOrchestrator;
// Singleton instance
let orchestratorInstance = null;
function getTherapistOrchestrator() {
    if (!orchestratorInstance) {
        const config = {
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
function initializeTherapistOrchestrator(config) {
    const defaultConfig = {
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
    logger_1.logger.info('Therapist orchestrator initialized', {
        promptVersion: orchestratorInstance.getConfig().therapistPromptVersion,
        availableVersions: orchestratorInstance.getAvailableVersions()
    });
}
//# sourceMappingURL=orchestrator.js.map