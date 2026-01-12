import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabaseStorageKey } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";
import { authService } from "@/lib/authService";

// todo: def sould not be here
type UserRole = "student" | "teacher" | "admin";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  user_admin: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  updateUserMetadata: (metadata: Partial<{ firstName: string; lastName: string; name: string }>) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchUserRole(userId: string): Promise<UserRole | null> {
  console.log("[AuthProvider] Fetching role for user:", userId);
  try {
    const response = await withTimeout(
      "fetchUserRole",
      fetch(`/api/user/role?userId=${userId}`),
      5000
    );
    const payload = (await response.json().catch(() => null)) as { role?: UserRole; error?: string } | null;
    if (!response.ok) {
      console.error("[AuthProvider] Failed to load user role:", payload?.error ?? response.statusText);
      return null;
    }
    return payload?.role ?? null;
  } catch (error) {
    console.error("[AuthProvider] Role fetch failed:", error);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  const latestUserIdRef = useRef<string | null>(null);

  const resetLocalAuth = useCallback((reason: string) => {
    console.warn("[AuthProvider] Resetting local auth state:", reason);
    try {
      window.localStorage.removeItem(supabaseStorageKey);
      document.cookie = `${supabaseStorageKey}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    } catch (error) {
      console.warn("[AuthProvider] Failed to clear local auth storage", error);
    }
    if (isMountedRef.current) {
      setSession(null);
      setUser(null);
      setRole(null);
      setIsLoading(false);
    }
  }, []);

  const syncSession = useCallback(async (nextSession: Session | null) => {
    if (!isMountedRef.current) return;
    setSession(nextSession);

    // Create a new object reference to force React re-render when metadata changes
    const nextUser = nextSession?.user
      ? { ...nextSession.user, user_metadata: { ...nextSession.user.user_metadata } }
      : null;

    setUser(nextUser);
    latestUserIdRef.current = nextUser?.id ?? null;

    if (nextUser?.id) {
      const loadedRole = await fetchUserRole(nextUser.id);
      if (isMountedRef.current && latestUserIdRef.current === nextUser.id) {
        setRole(loadedRole);
      }
    } else if (isMountedRef.current) {
      setRole(null);
    }
  }, []);

  const loadSession = useCallback(async () => {
    const startedAt = Date.now();
    console.log("[loadSession] Starting session load...", { startedAt });
    setIsLoading(true);
    try {
      console.log("[loadSession] Calling getSession...");
      const {
        data: { session: currentSession },
      } = await authService.getSession();

      console.log("[loadSession] Got session from Supabase:", {
        hasSession: !!currentSession,
        userId: currentSession?.user?.id,
        userMetadata: currentSession?.user?.user_metadata,
        elapsedMs: Date.now() - startedAt,
      });

      await syncSession(currentSession);
    } catch (error) {
      console.error("[AuthProvider] Failed to load session:", error);
      if (error instanceof Error && error.message.includes("timed out")) {
        resetLocalAuth("loadSession timeout");
        return;
      }
      if (isMountedRef.current) {
        setSession(null);
        setUser(null);
        setRole(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      console.log("[loadSession] Finished", { elapsedMs: Date.now() - startedAt });
    }
  }, [resetLocalAuth, syncSession]);

  useEffect(() => {
    loadSession();

    const { data: subscription } = authService.onAuthStateChange(async (_event, newSession) => {
      console.log("[AuthProvider] Auth state change:", {
        event: _event,
        hasSession: !!newSession,
        userId: newSession?.user?.id ?? null,
      });
      await syncSession(newSession);
      if (_event === "SIGNED_IN" && !newSession?.access_token) {
        resetLocalAuth("signed-in event missing access token");
      }
      if (_event === "SIGNED_OUT") {
        resetLocalAuth("signed out");
      }
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription?.subscription.unsubscribe();
    };
  }, [loadSession, resetLocalAuth, syncSession]);

  const updateUserMetadata = useCallback(
    (metadata: Partial<{ firstName: string; lastName: string; name: string }>) => {
      setUser((currentUser) => {
        if (!currentUser) {
          console.warn("[updateUserMetadata] Called with no user logged in");
          return currentUser;
        }

        // Create new object references to trigger React re-renders
        const updatedUser = {
          ...currentUser,
          user_metadata: {
            ...currentUser.user_metadata,
            ...metadata,
          },
        };

        console.log("[updateUserMetadata] Updated user metadata:", {
          userId: updatedUser.id,
          firstName: updatedUser.user_metadata?.firstName,
          lastName: updatedUser.user_metadata?.lastName,
          name: updatedUser.user_metadata?.name,
        });

        return updatedUser;
      });
    },
    []
  );

  const refreshUser = useCallback(async () => {
    console.log("[refreshUser] Called - reloading session...");
    await loadSession();
    console.log("[refreshUser] Completed");
  }, [loadSession]);

  const user_admin = role === "admin";
  const value = useMemo(
    () => ({
      user,
      session,
      role,
      user_admin,
      isLoading,
      refreshUser,
      updateUserMetadata,
    }),
    [user, session, role, user_admin, isLoading, refreshUser, updateUserMetadata]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthUser(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthUser must be used within an AuthProvider");
  }
  return context;
}
