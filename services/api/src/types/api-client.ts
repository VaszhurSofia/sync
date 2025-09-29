// API Client Types for Sync
// This file contains the interface definitions for the API client

export interface SyncApiClient {
  // Authentication
  requestCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<{ accessToken: string }>;
  
  // Sessions
  createSession(mode: 'couple' | 'solo', coupleId?: string): Promise<{
    sessionId: string;
    mode: 'couple' | 'solo';
    turnState: 'awaitingA' | 'awaitingB' | 'ai_reflect' | 'boundary';
  }>;
  
  // Messages
  sendMessage(sessionId: string, sender: 'userA' | 'userB', content: string, clientMessageId: string): Promise<void>;
  getMessages(sessionId: string, after?: string, waitMs?: number): Promise<Array<{
    id: string;
    sessionId: string;
    sender: 'userA' | 'userB' | 'ai';
    content: string;
    createdAt: string;
    safetyTags: string[];
    clientMessageId: string;
  }>>;
  
  // Session Management
  endSession(sessionId: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  
  // Feedback
  submitFeedback(sessionId: string, rating: 'angry' | 'neutral' | 'happy'): Promise<void>;
  
  // Solo to Couple Conversion
  convertToCouple(sessionId: string, consent: boolean, redactedSummary: string): Promise<{
    newCoupleSessionId: string;
  }>;
  
  // Health
  getHealth(): Promise<{ status: string; timestamp: string }>;
  getCryptoHealth(): Promise<{ kms: string; dek_age_days: number; selftest: string }>;
  
  // Resources
  getBoundaryResources(): Promise<{
    region: 'EU';
    resources: Array<{ name: string; phone: string; website: string }>;
  }>;
}

// Error types
export class SyncApiError extends Error {
  constructor(
    public error: string,
    public message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'SyncApiError';
  }
}

export class TurnLockedError extends SyncApiError {
  constructor(message: string = "It's not your turn to speak") {
    super('TURN_LOCKED', message, 'TURN_VIOLATION', 409);
  }
}

export class BoundaryLockedError extends SyncApiError {
  constructor(message: string = "Session has reached safety boundary") {
    super('BOUNDARY_LOCKED', message, 'BOUNDARY_VIOLATION', 409);
  }
}
