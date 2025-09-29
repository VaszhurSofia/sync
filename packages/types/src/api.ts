// API Types for Sync
// Generated from OpenAPI specification

export type SessionMode = 'couple' | 'solo';
export type TurnState = 'awaitingA' | 'awaitingB' | 'ai_reflect' | 'boundary';
export type MessageSender = 'userA' | 'userB' | 'ai';
export type FeedbackRating = 'angry' | 'neutral' | 'happy';

// Authentication
export interface AuthRequestCode {
  email: string;
}

export interface AuthVerifyCode {
  email: string;
  code: string;
}

export interface AuthResponse {
  accessToken: string;
}

// Sessions
export interface CreateSessionRequest {
  mode: SessionMode;
  coupleId?: string; // Required for couple mode
}

export interface CreateSessionResponse {
  sessionId: string;
  mode: SessionMode;
  turnState: TurnState;
}

// Messages
export interface CreateMessage {
  sender: MessageSender;
  content: string;
  clientMessageId: string;
}

export interface Message {
  id: string;
  sessionId: string;
  sender: MessageSender;
  content: string;
  createdAt: string;
  safetyTags: string[];
  clientMessageId: string;
}

export interface GetMessagesResponse extends Array<Message> {}

// Feedback
export interface CreateFeedback {
  rating: FeedbackRating;
}

// Solo to Couple Conversion
export interface ConvertToCoupleRequest {
  consent: boolean;
  redactedSummary: string;
}

export interface ConvertToCoupleResponse {
  newCoupleSessionId: string;
}

// Boundary Resources
export interface BoundaryResource {
  name: string;
  phone: string;
  website: string;
}

export interface BoundaryResources {
  region: 'EU';
  resources: BoundaryResource[];
}

// Error Response
export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
}

// Health Check
export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface CryptoHealthResponse {
  kms: string;
  dek_age_days: number;
  selftest: string;
}
