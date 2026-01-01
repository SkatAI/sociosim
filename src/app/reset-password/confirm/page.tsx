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
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            finalize("invalid");
            return;
          }
          url.searchParams.delete("code");
          window.history.replaceState({}, document.title, url.toString());
        }

        if (window.location.hash.includes("access_token=")) {
          const params = new URLSearchParams(window.location.hash.slice(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) {
              finalize("invalid");
              return;
            }
          }

          url.hash = "";
          window.history.replaceState({}, document.title, url.toString());
        }

        const { data } = await supabase.auth.getSession();
        finalize(data.session ? "ready" : "invalid");
      } catch (sessionError) {
        console.error("[reset-password] Failed to hydrate session", sessionError);
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
      const { error: updateError } = await supabase.auth.updateUser({
        password: form.password,
      });

      if (updateError) {
        setError(
          updateError.message ?? "Impossible de réinitialiser votre mot de passe."
        );
        return;
      }

      await supabase.auth.signOut();
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
