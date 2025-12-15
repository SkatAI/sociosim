import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type UserRole = "student" | "teacher" | "admin";

type AuthState = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  role: UserRole | null;
};

export function useAuthUser(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user?.id) {
          await fetchUserRole(currentSession.user.id);
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error("[useAuthUser] Failed to load session:", error);
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setRole(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const fetchUserRole = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", userId)
          .single();

        if (!isMounted) return;

        if (error) {
          console.error("[useAuthUser] Failed to load user role:", error);
          setRole(null);
        } else {
          setRole(data?.role ?? null);
        }
      } catch (error) {
        console.error("[useAuthUser] Error fetching user role:", error);
        if (isMounted) {
          setRole(null);
        }
      }
    };

    loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user?.id) {
        await fetchUserRole(newSession.user.id);
      } else {
        setRole(null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  return { user, session, isLoading, role };
}
