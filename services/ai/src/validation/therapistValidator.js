"use strict";
/**
 * Therapist Validator for Multiple Modes
 * Comprehensive validation with custom rules beyond JSON Schema
 * Supports both couple and solo modes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTherapistCoupleV20 = validateTherapistCoupleV20;
exports.validateTherapistSoloV10 = validateTherapistSoloV10;
exports.validateTherapistV12 = validateTherapistV12;
exports.createSafeFallbackCouple = createSafeFallbackCouple;
exports.createSafeFallbackSolo = createSafeFallbackSolo;
exports.createBoundaryTemplateCouple = createBoundaryTemplateCouple;
exports.createBoundaryTemplateSolo = createBoundaryTemplateSolo;
exports.createSafeFallback = createSafeFallback;
exports.createBoundaryTemplate = createBoundaryTemplate;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const therapist_couple_v2_0_schema_json_1 = __importDefault(require("../schemas/therapist.couple_v2_0.schema.json"));
const therapist_solo_v1_0_schema_json_1 = __importDefault(require("../schemas/therapist.solo_v1_0.schema.json"));
const ajv = new ajv_1.default({ allErrors: true, strict: true });
(0, ajv_formats_1.default)(ajv);
const validateCoupleSchema = ajv.compile(therapist_couple_v2_0_schema_json_1.default);
const validateSoloSchema = ajv.compile(therapist_solo_v1_0_schema_json_1.default);
const SENTENCE_REGEX = /[^.!?]+[.!?]+/g;
function countSentences(text) {
    if (!text)
        return 0;
    const matches = text.match(SENTENCE_REGEX);
    return matches ? matches.length : 0;
}
function isYesNoQuestion(s) {
    return /^\s*(do|does|did|are|is|was|were|will|would|can|could|should|shall|may|might)\b/i.test(s);
}
const BANNED_TERMS = /\b(always|never|should|must|narcissist|gaslighter|borderline|bipolar|diagnose|disorder|treatment|therapy)\b/i;
function startsWithInvitation(s) {
    return /^\s*(you might|you could)\b/i.test(s);
}
function validateTherapistCoupleV20(payload) {
    const errors = [];
    // First, validate against JSON schema
    if (!validateCoupleSchema(payload)) {
        errors.push(...(validateCoupleSchema.errors ?? []).map(e => `${e.instancePath} ${e.message}`));
        return { ok: false, errors };
    }
    const p = payload;
    // Sentence counts
    const sA = countSentences(p.mirror.partnerA);
    const sB = countSentences(p.mirror.partnerB);
    const sC = countSentences(p.clarify);
    const sE = countSentences(p.explore);
    const sCheck = countSentences(p.check);
    const sActions = p.micro_actions.reduce((acc, s) => acc + countSentences(s), 0);
    if (sA !== 1)
        errors.push("mirror.partnerA must be exactly 1 sentence.");
    if (sB !== 1)
        errors.push("mirror.partnerB must be exactly 1 sentence.");
    if (sC < 1 || sC > 2)
        errors.push("clarify must be 1–2 sentences.");
    if (!p.explore.trim().endsWith("?"))
        errors.push("explore must end with a question mark.");
    if (sE !== 1)
        errors.push("explore must be exactly 1 sentence.");
    if (isYesNoQuestion(p.explore))
        errors.push("explore must be open-ended (not yes/no).");
    if (/^\s*why\b/i.test(p.explore))
        errors.push("explore must avoid starting with 'Why'.");
    if (!p.check.trim().endsWith("?"))
        errors.push("check must end with a question mark.");
    if (sCheck !== 1)
        errors.push("check must be exactly 1 sentence.");
    if (!/\b(fair|fairly|both of you|both)\b/i.test(p.check))
        errors.push("check must verify fairness/accuracy for both partners.");
    // Tone / banned terms
    const fieldsToScan = [
        p.mirror.partnerA, p.mirror.partnerB, p.clarify, p.explore, p.check, ...p.micro_actions
    ];
    if (fieldsToScan.some(s => BANNED_TERMS.test(s)))
        errors.push("output contains banned terms (tone/clinical/labels).");
    // Micro-actions phrasing
    for (const action of p.micro_actions) {
        if (!startsWithInvitation(action))
            errors.push("each micro_action must start with 'You might' or 'You could'.");
    }
    // Total sentence cap
    const total = sA + sB + sC + sE + sCheck + sActions;
    if (total !== p.meta.total_sentences)
        errors.push("meta.total_sentences must equal the computed sentence count.");
    if (total > 8)
        errors.push("total sentence count exceeds 8.");
    return errors.length ? { ok: false, errors } : { ok: true, value: p };
}
function validateTherapistSoloV10(payload) {
    const errors = [];
    // First, validate against JSON schema
    if (!validateSoloSchema(payload)) {
        errors.push(...(validateSoloSchema.errors ?? []).map(e => `${e.instancePath} ${e.message}`));
        return { ok: false, errors };
    }
    const p = payload;
    // Sentence counts
    const sReflect = countSentences(p.reflect);
    const sReframe = countSentences(p.reframe);
    const sStarter = countSentences(p.starter);
    const sCheck = countSentences(p.check);
    const sOptions = p.options.reduce((acc, s) => acc + countSentences(s), 0);
    if (sReflect < 1 || sReflect > 2)
        errors.push("reflect must be 1–2 sentences.");
    if (sReframe !== 1)
        errors.push("reframe must be exactly 1 sentence.");
    if (sStarter !== 1)
        errors.push("starter must be exactly 1 sentence.");
    if (sCheck !== 1)
        errors.push("check must be exactly 1 sentence.");
    if (!p.starter.trim().endsWith("."))
        errors.push("starter must end with a period.");
    if (!p.check.trim().endsWith("?"))
        errors.push("check must end with a question mark.");
    // Tone / banned terms
    const fieldsToScan = [
        p.reflect, p.reframe, p.starter, p.check, ...p.options
    ];
    if (fieldsToScan.some(s => BANNED_TERMS.test(s)))
        errors.push("output contains banned terms (tone/clinical/labels).");
    // Options phrasing
    for (const option of p.options) {
        if (!startsWithInvitation(option))
            errors.push("each option must start with 'You might' or 'You could'.");
    }
    // Total sentence cap
    const total = sReflect + sReframe + sStarter + sCheck + sOptions;
    if (total !== p.meta.total_sentences)
        errors.push("meta.total_sentences must equal the computed sentence count.");
    if (total > 7)
        errors.push("total sentence count exceeds 7.");
    return errors.length ? { ok: false, errors } : { ok: true, value: p };
}
// Legacy function for backward compatibility
function validateTherapistV12(payload) {
    return validateTherapistCoupleV20(payload);
}
// Helper function to create a safe fallback response for couple mode
function createSafeFallbackCouple() {
    return {
        mirror: {
            partnerA: "I hear that you're feeling frustrated with this situation.",
            partnerB: "I understand that you're also feeling overwhelmed right now."
        },
        clarify: "This seems to be about finding a way forward that works for both of you.",
        explore: "What would help you both feel more supported in this conversation?",
        micro_actions: [
            "You might try taking a short break and coming back to this when you're both feeling calmer.",
            "You could try writing down your thoughts separately before discussing them together."
        ],
        check: "Did I capture both of your perspectives fairly?",
        meta: {
            total_sentences: 7,
            version: "couple_v2.0"
        }
    };
}
// Helper function to create a safe fallback response for solo mode
function createSafeFallbackSolo() {
    return {
        reflect: "You're feeling overwhelmed and need some support right now.",
        reframe: "This might be about wanting to feel heard and understood in your relationship.",
        options: [
            "You might try writing down your thoughts before having the conversation.",
            "You could practice what you want to say with a trusted friend first."
        ],
        starter: "I've been thinking about our situation and I'd like to share what I'm feeling.",
        check: "Would you like to try one of these approaches?",
        meta: {
            total_sentences: 6,
            version: "solo_v1.0"
        }
    };
}
// Helper function to create boundary template for couple mode
function createBoundaryTemplateCouple() {
    return {
        mirror: {
            partnerA: "I understand you're going through a difficult time.",
            partnerB: "I can see this is really challenging for you both."
        },
        clarify: "This conversation has touched on some serious concerns that need professional support.",
        explore: "What kind of professional support would feel most helpful to you right now?",
        micro_actions: [
            "You might consider reaching out to a mental health professional who can provide appropriate support.",
            "You could try contacting a crisis helpline if you need immediate assistance."
        ],
        check: "Did I respond appropriately to both of your needs?",
        meta: {
            total_sentences: 7,
            version: "couple_v2.0"
        }
    };
}
// Helper function to create boundary template for solo mode
function createBoundaryTemplateSolo() {
    return {
        reflect: "You're going through a difficult time and need professional support.",
        reframe: "This situation requires the help of a qualified mental health professional.",
        options: [
            "You might consider reaching out to a therapist or counselor for support.",
            "You could contact a crisis helpline if you need immediate assistance."
        ],
        starter: "I think we need to talk about getting some professional help with this situation.",
        check: "Would you be open to seeking professional support?",
        meta: {
            total_sentences: 6,
            version: "solo_v1.0"
        }
    };
}
// Legacy functions for backward compatibility
function createSafeFallback() {
    return createSafeFallbackCouple();
}
function createBoundaryTemplate() {
    return createBoundaryTemplateCouple();
}
//# sourceMappingURL=therapistValidator.js.map