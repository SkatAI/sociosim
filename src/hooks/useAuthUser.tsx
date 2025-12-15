import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type UserRole = "student" | "teacher" | "admin";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
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
    const nextUser = nextSession?.user ?? null;
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
    setIsLoading(true);
    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
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

  const refreshUser = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  const value = useMemo(
    () => ({
      user,
      session,
      role,
      isLoading,
      refreshUser,
    }),
    [user, session, role, isLoading, refreshUser]
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
