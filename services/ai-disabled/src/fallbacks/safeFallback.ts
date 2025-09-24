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

export function createSafeFallbackTemplate(context: SafeFallbackContext): TherapistV12 {
  // If there's a boundary flag, use a more cautious approach
  if (context.hasBoundaryFlag) {
    return createBoundarySafeFallback(context);
  }

  // If it's early in the conversation, use a gentle approach
  if (context.messageCount <= 2) {
    return createEarlyConversationFallback(context);
  }

  // If there are many messages, use a more structured approach
  if (context.messageCount > 10) {
    return createStructuredFallback(context);
  }

  // Default safe fallback
  return createDefaultSafeFallback(context);
}

function createBoundarySafeFallback(context: SafeFallbackContext): TherapistV12 {
  return {
    mirror: {
      partnerA: "I can see this is a challenging situation for you.",
      partnerB: "I understand this is difficult for you as well."
    },
    clarify: "This seems to be about finding a way forward that feels safe and respectful for both of you.",
    explore: "What would help you both feel more supported in this conversation?",
    micro_actions: [
      "You might consider taking a break and returning to this when you're both feeling calmer.",
      "You could try focusing on one specific aspect of the situation at a time."
    ],
    check: "Did I respond appropriately to both of your needs?",
    meta: {
      total_sentences: 8,
      version: "therapist_v1.2"
    }
  };
}

function createEarlyConversationFallback(context: SafeFallbackContext): TherapistV12 {
  return {
    mirror: {
      partnerA: "I hear that you're feeling uncertain about how to proceed.",
      partnerB: "I understand that you're also looking for clarity in this situation."
    },
    clarify: "This seems to be about finding a way to communicate that works for both of you.",
    explore: "What would help you both feel more comfortable sharing your thoughts?",
    micro_actions: [
      "You might try taking turns sharing your perspective without interruption.",
      "You could try starting with what you're hoping to achieve from this conversation."
    ],
    check: "Did I capture both of your perspectives fairly?",
    meta: {
      total_sentences: 8,
      version: "therapist_v1.2"
    }
  };
}

function createStructuredFallback(context: SafeFallbackContext): TherapistV12 {
  return {
    mirror: {
      partnerA: "I can see that you're feeling frustrated with the current situation.",
      partnerB: "I understand that you're also feeling overwhelmed by the complexity."
    },
    clarify: "This seems to be about finding a way to move forward together despite the challenges.",
    explore: "What would help you both feel more hopeful about the next steps?",
    micro_actions: [
      "You might try identifying one small step you could take together this week.",
      "You could try setting aside time to focus on just one aspect of the situation."
    ],
    check: "Did I understand both of your concerns accurately?",
    meta: {
      total_sentences: 8,
      version: "therapist_v1.2"
    }
  };
}

function createDefaultSafeFallback(context: SafeFallbackContext): TherapistV12 {
  return {
    mirror: {
      partnerA: "I hear that you're feeling uncertain about the best way forward.",
      partnerB: "I understand that you're also feeling concerned about the situation."
    },
    clarify: "This seems to be about finding a path that works for both of you.",
    explore: "What would help you both feel more confident about your next steps?",
    micro_actions: [
      "You might try taking a moment to reflect on what's most important to each of you.",
      "You could try focusing on one specific aspect of the situation to address together."
    ],
    check: "Did I capture both of your perspectives fairly?",
    meta: {
      total_sentences: 8,
      version: "therapist_v1.2"
    }
  };
}

// Emergency fallback for critical failures
export function createEmergencyFallback(): TherapistV12 {
  return {
    mirror: {
      partnerA: "I understand this is a difficult situation for you.",
      partnerB: "I can see this is challenging for you as well."
    },
    clarify: "This seems to be about finding a way forward that works for both of you.",
    explore: "What would help you both feel more supported right now?",
    micro_actions: [
      "You might consider taking a break and returning to this when you're both feeling calmer.",
      "You could try reaching out to a trusted friend or family member for support."
    ],
    check: "Did I respond appropriately to both of your needs?",
    meta: {
      total_sentences: 8,
      version: "therapist_v1.2"
    }
  };
}

// Boundary template for safety violations
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
