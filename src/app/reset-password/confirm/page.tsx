"use client";

import {
  Alert,
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
import { authService } from "@/lib/authService";

const MIN_PASSWORD_LENGTH = 8;

type PasswordFormState = {
  password: string;
  confirmation: string;
};

const normalizeResetPasswordError = (message?: string | null) => {
  if (!message) return null;
  const normalized = message.trim();
  if (!normalized) return null;
  if (
    normalized === "New password should be different from the old password." ||
    normalized === "New password should be different from the old password"
  ) {
    return "Le nouveau mot de passe doit être différent de l'ancien.";
  }
  return normalized;
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
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error: exchangeError } = await authService.exchangeCodeForSession(code);
          if (exchangeError) {
            finalize("invalid");
            return;
          }
          url.searchParams.delete("code");
          window.history.replaceState({}, document.title, url.toString());
        }

        let sessionHydratedFromHash = false;
        let setSessionTimedOut = false;

        if (window.location.hash.includes("access_token=")) {
          const params = new URLSearchParams(window.location.hash.slice(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            setRecoveryAccessToken(accessToken);
            let sessionResult: Awaited<ReturnType<typeof authService.setSession>> | null = null;
            try {
              sessionResult = await authService.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            } catch {
              setSessionTimedOut = true;
            }
            const sessionError = sessionResult?.error;
            if (sessionError) {
              finalize("ready");
              return;
            }
            sessionHydratedFromHash = true;
          }

          url.hash = "";
          window.history.replaceState({}, document.title, url.toString());
        }

        if (sessionHydratedFromHash || setSessionTimedOut) {
          finalize("ready");
          return;
        }

        const { data, error: getSessionError } = await authService.getSession();
        if (getSessionError) {
          finalize("invalid");
          return;
        }
        finalize(data.session ? "ready" : "invalid");
      } catch {
        finalize("invalid");
      }
    };

    hydrateSessionFromUrl();

    const { data: subscription } = authService.onAuthStateChange((_event, session) => {
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
      let updateError: { message?: string } | null = null;
      try {
        const updateResult = await authService.updateUser({
          password: form.password,
        });
        updateError = updateResult.error ?? null;
      } catch {
        updateError = { message: "updateUser timed out" };
      }

      if (updateError) {
        if (recoveryAccessToken) {
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
            const message = normalizeResetPasswordError(
              payload?.msg || payload?.error_description || payload?.message
            );
            setError(message ?? `Erreur ${response.status}`);
            return;
          }
        } else {
          const message = normalizeResetPasswordError(updateError.message);
          setError(message ?? "Impossible de réinitialiser votre mot de passe.");
          return;
        }
      }

      try {
        await authService.signOutLocal();
      } catch {
      }
      router.replace("/login?password=reset");
    } catch {
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
