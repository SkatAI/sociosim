/**
 * Minimal helpers to standardize Supabase error handling.
 */

import type { PostgrestError } from "@supabase/supabase-js";

export function throwIfError(error: PostgrestError | null, context: string): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

export function ensureRecordFound<T>(data: T | null, context: string): T {
  if (!data) {
    throw new Error(`${context}: not found`);
  }
  return data;
}
