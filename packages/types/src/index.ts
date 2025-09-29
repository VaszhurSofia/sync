import { z } from 'zod';

// Export API types
export * from './api';

// User and Authentication Types
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name_enc: z.string(), // Encrypted display name
  created_at: z.string().datetime(),
});

export const AuthRequestCodeSchema = z.object({
  email: z.string().email(),
});

export const AuthVerifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
});

// Couple Types
export const CoupleSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
});

export const CoupleMemberSchema = z.object({
  couple_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(['userA', 'userB']),
});

export const InviteSchema = z.object({
  code: z.string(),
  couple_id: z.string().uuid(),
  expires_at: z.string().datetime(),
  accepted_by: z.string().uuid().nullable(),
});

export const CreateInviteResponseSchema = z.object({
  code: z.string(),
  link: z.string().url(),
});

// Session Types
export const SessionSchema = z.object({
  id: z.string().uuid(),
  couple_id: z.string().uuid(),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().nullable(),
  boundary_flag: z.boolean().default(false),
});

export const CreateSessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
});

// Message Types
export const MessageSenderSchema = z.enum(['userA', 'userB', 'ai']);

export const MessageSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  sender: MessageSenderSchema,
  content_enc: z.string(), // Encrypted content
  created_at: z.string().datetime(),
  safety_tags: z.array(z.string()).default([]),
  client_message_id: z.string().uuid(),
});

export const CreateMessageSchema = z.object({
  content: z.string().max(4000),
  client_message_id: z.string().uuid(),
});

export const GetMessagesResponseSchema = z.array(MessageSchema);

// AI Response Types
export const AIResponseSchema = z.object({
  mirror: z.object({
    partnerA: z.string(),
    partnerB: z.string(),
  }),
  clarify: z.string(),
  micro_actions: z.array(z.string()),
  check: z.string(),
});

// Feedback Types
export const FeedbackRatingSchema = z.enum(['angry', 'neutral', 'happy']);

export const SessionFeedbackSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  rating: FeedbackRatingSchema,
});

export const CreateFeedbackSchema = z.object({
  rating: FeedbackRatingSchema,
});

// Boundary Types
export const BoundaryResourcesSchema = z.object({
  region: z.literal('EU'),
  resources: z.array(z.string()),
});

// Safety & Boundary Types (M4)
export const SafetyRiskLevelSchema = z.enum(['low', 'medium', 'high']);
export const SafetyActionSchema = z.enum(['allow', 'warn', 'block', 'redirect']);

export const BoundaryResultSchema = z.object({
  isSafe: z.boolean(),
  riskLevel: SafetyRiskLevelSchema,
  concerns: z.array(z.string()),
  shouldProceed: z.boolean(),
  matchedPatterns: z.array(z.string()),
  suggestedAction: SafetyActionSchema,
});

export const SafetyTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  response: z.object({
    message: z.string(),
    resources: z.array(z.string()),
    action: z.enum(['continue', 'pause', 'redirect']),
  }),
});

export const SafetyContextSchema = z.object({
  userId: z.string(),
  sessionId: z.string().optional(),
  messageCount: z.number(),
  previousViolations: z.number(),
});

export const SafetyRateLimitSchema = z.object({
  maxRequests: z.number(),
  windowMs: z.number(),
  message: z.string(),
});

export const FrontendLockSchema = z.object({
  isLocked: z.boolean(),
  reason: z.string(),
  message: z.string(),
  resources: z.array(z.string()),
  unlockConditions: z.array(z.string()),
});

export const SafetyStatusSchema = z.object({
  userId: z.string(),
  violations: z.number(),
  rateLimit: SafetyRateLimitSchema,
  frontendLock: FrontendLockSchema,
  safetyGuidelines: z.array(z.string()),
});

// Survey & Delete Types (M5)
export const SurveyResponseSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  userId: z.string(),
  rating: z.enum(['angry', 'neutral', 'happy']),
  submittedAt: z.string().datetime(),
  feedback: z.string().optional(),
});

export const SurveyAnalyticsSchema = z.object({
  totalResponses: z.number(),
  ratingDistribution: z.object({
    angry: z.number(),
    neutral: z.number(),
    happy: z.number(),
  }),
  averageRating: z.number(),
  responseRate: z.number(),
  recentTrends: z.object({
    last7Days: z.array(SurveyResponseSchema),
    last30Days: z.array(SurveyResponseSchema),
  }),
});

export const DeleteRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  requestedAt: z.string().datetime(),
  reason: z.enum(['user_request', 'privacy_compliance', 'account_closure', 'data_breach']),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  completedAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
});

export const DeleteResultSchema = z.object({
  success: z.boolean(),
  deletedRecords: z.object({
    users: z.number(),
    couples: z.number(),
    sessions: z.number(),
    messages: z.number(),
    surveyResponses: z.number(),
    safetyViolations: z.number(),
    analytics: z.number(),
    auditLogs: z.number(),
  }),
  errors: z.array(z.string()),
  completedAt: z.string().datetime(),
});

// Error Types
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

// Export type inference
export type User = z.infer<typeof UserSchema>;
export type AuthRequestCode = z.infer<typeof AuthRequestCodeSchema>;
export type AuthVerifyCode = z.infer<typeof AuthVerifyCodeSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type Couple = z.infer<typeof CoupleSchema>;
export type CoupleMember = z.infer<typeof CoupleMemberSchema>;
export type Invite = z.infer<typeof InviteSchema>;
export type CreateInviteResponse = z.infer<typeof CreateInviteResponseSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;
export type MessageSender = z.infer<typeof MessageSenderSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type CreateMessage = z.infer<typeof CreateMessageSchema>;
export type GetMessagesResponse = z.infer<typeof GetMessagesResponseSchema>;
export type AIResponse = z.infer<typeof AIResponseSchema>;
export type FeedbackRating = z.infer<typeof FeedbackRatingSchema>;
export type SessionFeedback = z.infer<typeof SessionFeedbackSchema>;
export type CreateFeedback = z.infer<typeof CreateFeedbackSchema>;
export type BoundaryResources = z.infer<typeof BoundaryResourcesSchema>;
export type SafetyRiskLevel = z.infer<typeof SafetyRiskLevelSchema>;
export type SafetyAction = z.infer<typeof SafetyActionSchema>;
export type BoundaryResult = z.infer<typeof BoundaryResultSchema>;
export type SafetyTemplate = z.infer<typeof SafetyTemplateSchema>;
export type SafetyContext = z.infer<typeof SafetyContextSchema>;
export type SafetyRateLimit = z.infer<typeof SafetyRateLimitSchema>;
export type FrontendLock = z.infer<typeof FrontendLockSchema>;
export type SafetyStatus = z.infer<typeof SafetyStatusSchema>;
export type SurveyResponse = z.infer<typeof SurveyResponseSchema>;
export type SurveyAnalytics = z.infer<typeof SurveyAnalyticsSchema>;
export type DeleteRequest = z.infer<typeof DeleteRequestSchema>;
export type DeleteResult = z.infer<typeof DeleteResultSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
