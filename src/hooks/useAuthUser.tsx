import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

// todo: def sould not be here
type UserRole = "student" | "teacher" | "admin";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  updateUserMetadata: (metadata: Partial<{ firstName: string; lastName: string; name: string }>) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase.from("users").select("role").eq("id", userId).single();
  if (error) {
    console.error("[AuthProvider] Failed to load user role:", error);
    return null;
  }
  return data?.role ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  const syncSession = useCallback(async (nextSession: Session | null) => {
    if (!isMountedRef.current) return;
    setSession(nextSession);

    // Create a new object reference to force React re-render when metadata changes
    const nextUser = nextSession?.user
      ? { ...nextSession.user, user_metadata: { ...nextSession.user.user_metadata } }
      : null;

    setUser(nextUser);

    if (nextUser?.id) {
      const loadedRole = await fetchUserRole(nextUser.id);
      if (isMountedRef.current) {
        setRole(loadedRole);
      }
    } else if (isMountedRef.current) {
      setRole(null);
    }
  }, []);

  const loadSession = useCallback(async () => {
    console.log("[loadSession] Starting session load...");
    setIsLoading(true);
    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      console.log("[loadSession] Got session from Supabase:", {
        hasSession: !!currentSession,
        userId: currentSession?.user?.id,
        userMetadata: currentSession?.user?.user_metadata,
      });

      await syncSession(currentSession);
    } catch (error) {
      console.error("[AuthProvider] Failed to load session:", error);
      if (isMountedRef.current) {
        setSession(null);
        setUser(null);
        setRole(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      console.log("[loadSession] Finished");
    }
  }, [syncSession]);

  useEffect(() => {
    loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      await syncSession(newSession);
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription?.subscription.unsubscribe();
    };
  }, [loadSession, syncSession]);

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

  const value = useMemo(
    () => ({
      user,
      session,
      role,
      isLoading,
      refreshUser,
      updateUserMetadata,
    }),
    [user, session, role, isLoading, refreshUser, updateUserMetadata]
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
