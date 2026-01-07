"use client";

import {
  Alert,
  Box,
  Button,
  Container,
  Field,
  Heading,
  IconButton,
  Input,
  InputGroup,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const MIN_PASSWORD_LENGTH = 8;

type PasswordFormState = {
  password: string;
  confirmation: string;
};

function ResetPasswordConfirmPageInner() {
  const router = useRouter();
  const [form, setForm] = useState<PasswordFormState>({
    password: "",
    confirmation: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [recoveryAccessToken, setRecoveryAccessToken] = useState<string | null>(null);
  type DebugDetails = {
    hasCode: boolean;
    hasHashToken: boolean;
    accessTokenLength: number;
    refreshTokenLength: number;
    exchangeError?: string;
    sessionError?: string;
    getSessionError?: string;
    sessionFound: boolean;
  };

  const [debugDetails, setDebugDetails] = useState<DebugDetails | null>(null);

  const withTimeout = async <T,>(label: string, promise: Promise<T>, ms = 5000): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<T>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${label} timed out after ${ms}ms`));
      }, ms);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    let isActive = true;

    const finalize = (nextStatus: "ready" | "invalid") => {
      if (!isActive) return;
      setStatus(nextStatus);
      if (nextStatus === "invalid") {
        setError("Ce lien de validation est invalide ou expiré.");
      }
    };

    const hydrateSessionFromUrl = async () => {
      const debugState: DebugDetails = {
        hasCode: false,
        hasHashToken: false,
        accessTokenLength: 0,
        refreshTokenLength: 0,
        sessionFound: false,
      };

      try {
        console.log("[reset-password] Starting session hydration");
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        debugState.hasCode = Boolean(code);
        console.log("[reset-password] URL code present:", debugState.hasCode);

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            debugState.exchangeError = exchangeError.message;
            console.error("[reset-password] exchangeCodeForSession error:", exchangeError.message);
            setDebugDetails(debugState);
            finalize("invalid");
            return;
          }
          url.searchParams.delete("code");
          window.history.replaceState({}, document.title, url.toString());
        }

        if (window.location.hash.includes("access_token=")) {
          debugState.hasHashToken = true;
          const params = new URLSearchParams(window.location.hash.slice(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          debugState.accessTokenLength = accessToken?.length ?? 0;
          debugState.refreshTokenLength = refreshToken?.length ?? 0;
          console.log("[reset-password] Hash token detected", {
            accessTokenLength: debugState.accessTokenLength,
            refreshTokenLength: debugState.refreshTokenLength,
          });

          if (accessToken && refreshToken) {
            setRecoveryAccessToken(accessToken);
            console.log("[reset-password] Calling setSession");
            let sessionResult: Awaited<ReturnType<typeof supabase.auth.setSession>> | null = null;
            try {
              sessionResult = await withTimeout(
                "setSession",
                supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                }),
                8000
              );
            } catch {
              console.error("[reset-password] setSession timed out");
            }
            const sessionError = sessionResult?.error;
            if (sessionError) {
              debugState.sessionError = sessionError.message;
              console.error("[reset-password] setSession error:", sessionError.message);
              setDebugDetails(debugState);
              finalize("ready");
              return;
            }
            console.log("[reset-password] setSession succeeded");
          }

          url.hash = "";
          window.history.replaceState({}, document.title, url.toString());
        }

        console.log("[reset-password] Calling getSession after hydration");
        const { data, error: getSessionError } = await withTimeout(
          "getSession after hydration",
          supabase.auth.getSession()
        );
        if (getSessionError) {
          debugState.getSessionError = getSessionError.message;
          console.error("[reset-password] getSession error:", getSessionError.message);
        }
        debugState.sessionFound = Boolean(data.session);
        console.log("[reset-password] Session found:", debugState.sessionFound);
        setDebugDetails(debugState);
        finalize(data.session ? "ready" : "invalid");
      } catch (sessionError) {
        console.error("[reset-password] Failed to hydrate session", sessionError);
        setDebugDetails((prev) =>
          prev ?? {
            hasCode: false,
            hasHashToken: false,
            accessTokenLength: 0,
            refreshTokenLength: 0,
            sessionFound: false,
          }
        );
        finalize("invalid");
      }
    };

    hydrateSessionFromUrl();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive) return;
      if (session) {
        setStatus("ready");
        setError(null);
      }
    });

    return () => {
      isActive = false;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  const isTokenMissing = status !== "ready";

  const handleChange =
    (field: keyof PasswordFormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      setError(null);
    };

  const validate = () => {
    if (!form.password) {
      return "Merci de saisir un mot de passe.";
    }

    if (form.password.length < MIN_PASSWORD_LENGTH) {
      return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
    }

    if (form.password !== form.confirmation) {
      return "La confirmation ne correspond pas au mot de passe saisi.";
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    console.log("[reset-password] Submit attempt", {
      status,
      isTokenMissing,
      passwordLength: form.password.length,
      confirmationLength: form.confirmation.length,
    });

    if (isTokenMissing) {
      setError("Ce lien de validation est invalide ou expiré.");
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("[reset-password] About to fetch session before update");
      let hasSession = false;
      try {
        const { data: sessionData, error: sessionError } = await withTimeout(
          "getSession before update",
          supabase.auth.getSession()
        );
        if (sessionError) {
          console.error("[reset-password] getSession before update error:", sessionError.message);
        } else {
          hasSession = Boolean(sessionData.session);
          console.log("[reset-password] Session before update:", {
            hasSession,
            expiresAt: sessionData.session?.expires_at,
            userId: sessionData.session?.user?.id,
          });
        }
      } catch {
        console.error("[reset-password] getSession before update timed out");
      }

      if (hasSession) {
        console.log("[reset-password] About to fetch user before update");
        try {
          const { data: userData, error: userError } = await withTimeout(
            "getUser before update",
            supabase.auth.getUser()
          );
          if (userError) {
            console.error("[reset-password] getUser before update error:", userError.message);
          } else {
            console.log("[reset-password] User before update:", {
              userId: userData.user?.id,
              email: userData.user?.email,
            });
          }
        } catch {
          console.error("[reset-password] getUser before update timed out");
        }
      }

      console.log("[reset-password] Calling supabase.auth.updateUser");
      let updateError: { message?: string } | null = null;
      try {
        const updateResult = await withTimeout(
          "updateUser",
          supabase.auth.updateUser({
            password: form.password,
          }),
          10000
        );
        updateError = updateResult.error ?? null;
      } catch {
        updateError = { message: "updateUser timed out" };
      }

      if (updateError) {
        console.error("[reset-password] updateUser error:", updateError.message);
        if (recoveryAccessToken) {
          console.warn("[reset-password] Falling back to direct auth API update");
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
          if (!supabaseUrl || !supabaseAnonKey) {
            setError("Configuration Supabase manquante.");
            return;
          }

          const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${recoveryAccessToken}`,
              apikey: supabaseAnonKey,
            },
            body: JSON.stringify({ password: form.password }),
          });

          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            const message =
              payload?.msg ||
              payload?.error_description ||
              payload?.message ||
              `Erreur ${response.status}`;
            console.error("[reset-password] Direct update failed:", message);
            setError(message);
            return;
          }
        } else {
          setError(
            updateError.message ?? "Impossible de réinitialiser votre mot de passe."
          );
          return;
        }
      }

      console.log("[reset-password] Password updated, signing out");
      try {
        await withTimeout("signOut", supabase.auth.signOut(), 5000);
      } catch {
        console.warn("[reset-password] signOut timed out");
      }
      router.replace("/login?password=reset");
    } catch (submitError) {
      console.error("[reset-password] Failed to update password", submitError);
      setError("Impossible de réinitialiser votre mot de passe.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container py={16} maxW="lg" centerContent mx="auto">
      <Stack gap={8} alignItems="center">
        <Stack gap={2} textAlign="center" maxW="lg" width="full">
          <Heading size="lg">Créer un nouveau mot de passe</Heading>
          <Text color="fg.muted">
            Choisissez un mot de passe pour réinitialiser l&apos;accès à votre compte.
          </Text>
        </Stack>

        {error ? (
          <Alert.Root status="error" borderRadius="md" width="full">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Action requise</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ) : null}

        {debugDetails ? (
          <Box
            borderWidth="1px"
            borderColor="border.muted"
            borderRadius="md"
            padding={3}
            width="full"
          >
            <Text fontSize="sm" fontWeight="semibold" marginBottom={2}>
              Debug reset (temporary)
            </Text>
            <Text fontSize="xs" fontFamily="mono">
              status={status} hasCode={String(debugDetails.hasCode)} hasHashToken=
              {String(debugDetails.hasHashToken)} accessTokenLength={debugDetails.accessTokenLength} refreshTokenLength=
              {debugDetails.refreshTokenLength} sessionFound={String(debugDetails.sessionFound)}
            </Text>
            {(debugDetails.exchangeError ||
              debugDetails.sessionError ||
              debugDetails.getSessionError) && (
              <Text fontSize="xs" fontFamily="mono" marginTop={2}>
                exchangeError={debugDetails.exchangeError ?? "none"} sessionError=
                {debugDetails.sessionError ?? "none"} getSessionError=
                {debugDetails.getSessionError ?? "none"}
              </Text>
            )}
          </Box>
        ) : null}

        <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "28rem" }}>
          <Stack gap={6}>
            <Field.Root required>
              <Field.Label>Nouveau mot de passe</Field.Label>
              <InputGroup
                endElement={
                  <IconButton
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    onClick={() => setShowPassword(!showPassword)}
                    variant="ghost"
                    size="sm"
                    disabled={isTokenMissing}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                }
              >
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange("password")}
                  placeholder="Au moins 8 caractères"
                  disabled={isTokenMissing}
                  autoComplete="new-password"
                />
              </InputGroup>
            </Field.Root>

            <Field.Root required>
              <Field.Label>Confirmez le mot de passe</Field.Label>
              <InputGroup
                endElement={
                  <IconButton
                    aria-label={showConfirmation ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    onClick={() => setShowConfirmation(!showConfirmation)}
                    variant="ghost"
                    size="sm"
                    disabled={isTokenMissing}
                  >
                    {showConfirmation ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                }
              >
                <Input
                  type={showConfirmation ? "text" : "password"}
                  value={form.confirmation}
                  onChange={handleChange("confirmation")}
                  placeholder="Répétez votre mot de passe"
                  disabled={isTokenMissing}
                  autoComplete="new-password"
                />
              </InputGroup>
            </Field.Root>

            <Button
              type="submit"
              colorPalette="blue"
              loading={isSubmitting}
              disabled={isTokenMissing}
            >
              Réinitialiser mon mot de passe
            </Button>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense
      fallback={
        <Container py={16} maxW="lg" centerContent mx="auto">
          <Stack gap={4} alignItems="center">
            <Heading size="md">Chargement...</Heading>
            <Text color="fg.muted">Merci de patienter.</Text>
          </Stack>
        </Container>
      }
    >
      <ResetPasswordConfirmPageInner />
    </Suspense>
  );
}
