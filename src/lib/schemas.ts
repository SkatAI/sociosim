import { z } from "zod";

/**
 * Centralized database schemas using Zod
 * Single source of truth for types and validation
 */

// ============================================================================
// ENUMS
// ============================================================================

export const SessionStatusSchema = z.enum(["active", "ended", "abandoned", "error"]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const InterviewStatusSchema = z.enum(["in_progress", "completed", "abandoned", "error"]);
export type InterviewStatus = z.infer<typeof InterviewStatusSchema>;

export const MessageRoleSchema = z.enum(["user", "assistant"]);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

// ============================================================================
// TABLE SCHEMAS
// ============================================================================

export const InterviewSchema = z.object({
  id: z.string().uuid(),
  status: InterviewStatusSchema,
  started_at: z.string().datetime({ offset: true }),
  completed_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});
export type Interview = z.infer<typeof InterviewSchema>;

export const SessionSchema = z.object({
  id: z.string().uuid(),
  adk_session_id: z.string(),
  status: SessionStatusSchema,
  started_at: z.string().datetime({ offset: true }),
  ended_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});
export type Session = z.infer<typeof SessionSchema>;

export const MessageSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.string(),
  input_tokens: z.number().int().nullable(),
  output_tokens: z.number().int().nullable(),
  created_at: z.string().datetime({ offset: true }),
});
export type Message = z.infer<typeof MessageSchema>;

export const InterviewUsageSchema = z.object({
  id: z.string().uuid(),
  interview_id: z.string().uuid(),
  total_input_tokens: z.number().int(),
  total_output_tokens: z.number().int(),
  estimated_cost_usd: z.number().nullable(),
  updated_at: z.string().datetime({ offset: true }),
});
export type InterviewUsage = z.infer<typeof InterviewUsageSchema>;

export const UserInterviewSessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  interview_id: z.string().uuid(),
  session_id: z.string().uuid(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});
export type UserInterviewSession = z.infer<typeof UserInterviewSessionSchema>;

// ============================================================================
// INSERT SCHEMAS (for creating new records - omit auto-generated fields)
// ============================================================================

export const InterviewInsertSchema = InterviewSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InterviewInsert = z.infer<typeof InterviewInsertSchema>;

export const SessionInsertSchema = SessionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type SessionInsert = z.infer<typeof SessionInsertSchema>;

export const MessageInsertSchema = MessageSchema.omit({
  id: true,
  created_at: true,
});
export type MessageInsert = z.infer<typeof MessageInsertSchema>;

export const UserInterviewSessionInsertSchema = UserInterviewSessionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type UserInterviewSessionInsert = z.infer<typeof UserInterviewSessionInsertSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate a database response matches our schema
 */
export function validateInterview(data: unknown): Interview {
  return InterviewSchema.parse(data);
}

export function validateSession(data: unknown): Session {
  return SessionSchema.parse(data);
}

export function validateMessage(data: unknown): Message {
  return MessageSchema.parse(data);
}

export function validateInterviewUsage(data: unknown): InterviewUsage {
  return InterviewUsageSchema.parse(data);
}

export function validateUserInterviewSession(data: unknown): UserInterviewSession {
  return UserInterviewSessionSchema.parse(data);
}

/**
 * Validate arrays
 */
export function validateMessages(data: unknown): Message[] {
  return z.array(MessageSchema).parse(data);
}

export function validateInterviews(data: unknown): Interview[] {
  return z.array(InterviewSchema).parse(data);
}
