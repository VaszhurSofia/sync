import { z } from 'zod';

// Safety & Boundary Types for M4

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

export const SafetyViolationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  sessionId: z.string().optional(),
  content: z.string(),
  riskLevel: SafetyRiskLevelSchema,
  concerns: z.array(z.string()),
  matchedPatterns: z.array(z.string()),
  createdAt: z.string().datetime(),
  action: SafetyActionSchema,
});

export const EUResourceSchema = z.object({
  type: z.enum(['mental_health', 'relationship', 'general', 'emergency']),
  name: z.string(),
  description: z.string(),
  contact: z.string(),
  url: z.string().url().optional(),
  available: z.boolean().default(true),
});

export const SafetyConfigurationSchema = z.object({
  enabled: z.boolean().default(true),
  strictMode: z.boolean().default(false),
  rateLimiting: z.object({
    enabled: z.boolean().default(true),
    maxViolations: z.number().default(3),
    lockoutDuration: z.number().default(24 * 60 * 60 * 1000), // 24 hours
  }),
  patterns: z.object({
    high: z.array(z.string()),
    medium: z.array(z.string()),
    low: z.array(z.string()),
  }),
  templates: z.record(z.string(), SafetyTemplateSchema),
  resources: z.record(z.string(), z.array(EUResourceSchema)),
});

// Export type inference
export type SafetyRiskLevel = z.infer<typeof SafetyRiskLevelSchema>;
export type SafetyAction = z.infer<typeof SafetyActionSchema>;
export type BoundaryResult = z.infer<typeof BoundaryResultSchema>;
export type SafetyTemplate = z.infer<typeof SafetyTemplateSchema>;
export type SafetyContext = z.infer<typeof SafetyContextSchema>;
export type SafetyRateLimit = z.infer<typeof SafetyRateLimitSchema>;
export type FrontendLock = z.infer<typeof FrontendLockSchema>;
export type SafetyStatus = z.infer<typeof SafetyStatusSchema>;
export type SafetyViolation = z.infer<typeof SafetyViolationSchema>;
export type EUResource = z.infer<typeof EUResourceSchema>;
export type SafetyConfiguration = z.infer<typeof SafetyConfigurationSchema>;
