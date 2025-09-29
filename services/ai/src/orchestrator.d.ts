import { TherapistV12, TherapistCoupleV20, TherapistSoloV10 } from './validation/therapistValidator';
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
export declare class TherapistOrchestrator {
    private config;
    private promptCache;
    constructor(config: OrchestratorConfig);
    /**
     * Load therapist prompt from file based on mode
     */
    private loadTherapistPrompt;
    /**
     * Generate therapist response with mode-based routing
     */
    generateResponse(context: ConversationContext): Promise<OrchestratorResponse>;
    /**
     * Build conversation history for prompt
     */
    private buildConversationHistory;
    /**
     * Call OpenAI API for JSON response
     */
    private callOpenAIForJson;
    /**
     * Format JSON response for display based on mode
     */
    private formatResponseForDisplay;
    /**
     * Get available prompt versions
     */
    getAvailableVersions(): string[];
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<OrchestratorConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): OrchestratorConfig;
}
export declare function getTherapistOrchestrator(): TherapistOrchestrator;
export declare function initializeTherapistOrchestrator(config?: Partial<OrchestratorConfig>): void;
//# sourceMappingURL=orchestrator.d.ts.map