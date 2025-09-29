/**
 * Safe Fallback Templates
 * Provides safe, neutral responses when AI generation fails
 */
import { TherapistV12 } from '../validation/therapistValidator';
export interface SafeFallbackContext {
    sessionId: string;
    userId: string;
    partnerId: string;
    messageCount: number;
    hasBoundaryFlag: boolean;
    lastMessageContent?: string;
}
export declare function createSafeFallbackTemplate(context: SafeFallbackContext): TherapistV12;
export declare function createEmergencyFallback(): TherapistV12;
export declare function createBoundaryTemplate(): TherapistV12;
//# sourceMappingURL=safeFallback.d.ts.map