import { MessageRole } from "@/lib/schemas";

/**
 * UI Presentation Types
 * Separate from database schemas - optimized for frontend display
 */

/**
 * UIMessage - Message as displayed in the interview chat UI
 * Converted from database Message for presentation:
 * - "content" becomes "text"
 * - "created_at" becomes "timestamp" (formatted)
 * - Omits database fields (session_id, tokens)
 */
export interface UIMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: string;
}
