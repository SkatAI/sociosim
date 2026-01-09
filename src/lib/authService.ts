import type {
  AuthChangeEvent,
  AuthSession,
  UserAttributes,
} from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";

let authQueue: Promise<unknown> = Promise.resolve();

const enqueueAuth = <T,>(label: string, fn: () => Promise<T>, timeoutMs: number) => {
  const task = authQueue.then(() => withTimeout(label, fn(), timeoutMs));
  authQueue = task.catch(() => undefined);
  return task;
};

export const authService = {
  getSession: () => enqueueAuth("auth.getSession", () => supabase.auth.getSession(), 10000),
  signInWithPassword: (payload: { email: string; password: string }) =>
    enqueueAuth("auth.signInWithPassword", () => supabase.auth.signInWithPassword(payload), 15000),
  signOutLocal: () =>
    enqueueAuth("auth.signOutLocal", () => supabase.auth.signOut({ scope: "local" }), 2000),
  setSession: (payload: { access_token: string; refresh_token: string }) =>
    enqueueAuth("auth.setSession", () => supabase.auth.setSession(payload), 8000),
  exchangeCodeForSession: (code: string) =>
    enqueueAuth("auth.exchangeCodeForSession", () => supabase.auth.exchangeCodeForSession(code), 8000),
  updateUser: (attributes: UserAttributes) =>
    enqueueAuth("auth.updateUser", () => supabase.auth.updateUser(attributes), 10000),
  onAuthStateChange: (callback: (event: AuthChangeEvent, session: AuthSession | null) => void) =>
    supabase.auth.onAuthStateChange(callback),
};
