/**
 * Therapist Validator for Multiple Modes
 * Comprehensive validation with custom rules beyond JSON Schema
 * Supports both couple and solo modes
 */
export type TherapistCoupleV20 = {
    mirror: {
        partnerA: string;
        partnerB: string;
    };
    clarify: string;
    explore: string;
    micro_actions: string[];
    check: string;
    meta: {
        total_sentences: number;
        version: "couple_v2.0";
    };
};
export type TherapistSoloV10 = {
    reflect: string;
    reframe: string;
    options: string[];
    starter: string;
    check: string;
    meta: {
        total_sentences: number;
        version: "solo_v1.0";
    };
};
export type TherapistV12 = TherapistCoupleV20;
export declare function validateTherapistCoupleV20(payload: unknown): {
    ok: true;
    value: TherapistCoupleV20;
} | {
    ok: false;
    errors: string[];
};
export declare function validateTherapistSoloV10(payload: unknown): {
    ok: true;
    value: TherapistSoloV10;
} | {
    ok: false;
    errors: string[];
};
export declare function validateTherapistV12(payload: unknown): {
    ok: true;
    value: TherapistV12;
} | {
    ok: false;
    errors: string[];
};
export declare function createSafeFallbackCouple(): TherapistCoupleV20;
export declare function createSafeFallbackSolo(): TherapistSoloV10;
export declare function createBoundaryTemplateCouple(): TherapistCoupleV20;
export declare function createBoundaryTemplateSolo(): TherapistSoloV10;
export declare function createSafeFallback(): TherapistV12;
export declare function createBoundaryTemplate(): TherapistV12;
//# sourceMappingURL=therapistValidator.d.ts.map