/**
 * Therapist v1.2 Validator
 * Comprehensive validation with custom rules beyond JSON Schema
 */

import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "../schemas/therapist.v1_2.schema.json";

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

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

export type TherapistV12 = {
  mirror: { partnerA: string; partnerB: string };
  clarify: string;
  explore: string;
  micro_actions: string[];
  check: string;
  meta: { total_sentences: number; version: "therapist_v1.2" };
};

export function validateTherapistV12(payload: unknown): { ok: true; value: TherapistV12 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  
  // First, validate against JSON schema
  if (!validateSchema(payload)) {
    errors.push(...(validateSchema.errors ?? []).map(e => `${e.instancePath} ${e.message}`));
    return { ok: false, errors };
  }
  
  const p = payload as TherapistV12;

  // Sentence counts
  const sA = countSentences(p.mirror.partnerA);
  const sB = countSentences(p.mirror.partnerB);
  const sC = countSentences(p.clarify);
  const sE = countSentences(p.explore);
  const sCheck = countSentences(p.check);
  const sActions = p.micro_actions.reduce((acc, s) => acc + countSentences(s), 0);

  if (sA !== 1) errors.push("mirror.partnerA must be exactly 1 sentence.");
  if (sB !== 1) errors.push("mirror.partnerB must be exactly 1 sentence.");
  if (sC < 1 || sC > 2) errors.push("clarify must be 1–2 sentences.");
  if (!p.explore.trim().endsWith("?")) errors.push("explore must end with a question mark.");
  if (sE !== 1) errors.push("explore must be exactly 1 sentence.");
  if (isYesNoQuestion(p.explore)) errors.push("explore must be open-ended (not yes/no).");
  if (/^\s*why\b/i.test(p.explore)) errors.push("explore must avoid starting with 'Why'.");

  if (!p.check.trim().endsWith("?")) errors.push("check must end with a question mark.");
  if (sCheck !== 1) errors.push("check must be exactly 1 sentence.");
  if (!/\b(fair|fairly|both of you|both)\b/i.test(p.check)) errors.push("check must verify fairness/accuracy for both partners.");

  // Tone / banned terms
  const fieldsToScan = [
    p.mirror.partnerA, p.mirror.partnerB, p.clarify, p.explore, p.check, ...p.micro_actions
  ];
  if (fieldsToScan.some(s => BANNED_TERMS.test(s))) errors.push("output contains banned terms (tone/clinical/labels).");

  // Micro-actions phrasing
  for (const action of p.micro_actions) {
    if (!startsWithInvitation(action)) errors.push("each micro_action must start with 'You might' or 'You could'.");
  }

  // Total sentence cap
  const total = sA + sB + sC + sE + sCheck + sActions;
  if (total !== p.meta.total_sentences) errors.push("meta.total_sentences must equal the computed sentence count.");
  if (total > 8) errors.push("total sentence count exceeds 8.");

  return errors.length ? { ok: false, errors } : { ok: true, value: p };
}

// Helper function to create a safe fallback response
export function createSafeFallback(): TherapistV12 {
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
      total_sentences: 8,
      version: "therapist_v1.2"
    }
  };
}

// Helper function to create boundary template
export function createBoundaryTemplate(): TherapistV12 {
  return {
    mirror: {
      partnerA: "I understand you're going through a difficult time.",
      partnerB: "I can see this is really challenging for you both."
    },
    clarify: "This conversation has touched on some serious concerns that need professional support.",
    explore: "Would you be open to connecting with a qualified therapist or counselor?",
    micro_actions: [
      "You might consider reaching out to a mental health professional who can provide appropriate support.",
      "You could try contacting a crisis helpline if you need immediate assistance."
    ],
    check: "Did I respond appropriately to both of your needs?",
    meta: {
      total_sentences: 8,
      version: "therapist_v1.2"
    }
  };
}
