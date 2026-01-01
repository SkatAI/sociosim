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
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Eye, EyeOff } from "lucide-react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AuthState = {
  email: string;
  password: string;
};

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordJustCreated = searchParams.get("password") === "created";
  const passwordJustReset = searchParams.get("password") === "reset";
  const signupSuccess = searchParams.get("signup") === "success";
  const [form, setForm] = useState<AuthState>({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field: keyof AuthState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    console.log("[login] Attempting sign in with:", form.email);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    console.log("[login] Sign in response - session:", !!data?.session, "error:", signInError?.message);

    if (signInError) {
      console.error("[login] Sign in error:", signInError);
      setError(
        signInError.message === "Invalid login credentials"
          ? "Identifiants incorrects. Merci de vérifier votre email et votre mot de passe."
          : "Impossible de vous connecter pour le moment. Veuillez réessayer."
      );
      setIsSubmitting(false);
      return;
    }

    console.log("[login] Sign in successful, redirecting to dashboard");
    router.replace("/dashboard");
  };

  const hasError = Boolean(error);

  return (
    <Container py={16} maxW="lg" centerContent mx="auto">
      <Stack gap={8} alignItems="center">
        <Stack gap={2} textAlign="center" maxW="lg" width="full">
          <Heading size="lg">Se connecter</Heading>
          <Text color="fg.muted">
            Accédez à votre espace Sociosim pour continuer vos simulations.
          </Text>
        </Stack>

        {passwordJustCreated || passwordJustReset || signupSuccess ? (
          <Alert.Root status="success" borderRadius="md">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Compte prêt</Alert.Title>
              <Alert.Description>
                {passwordJustCreated
                  ? "Vous pouvez maintenant vous connecter avec votre adresse e-mail et le mot de passe défini."
                  : passwordJustReset
                    ? "Votre mot de passe a été réinitialisé. Connectez-vous pour continuer."
                    : "Votre compte a été créé. Vérifiez vos e-mails pour confirmer votre inscription, puis connectez-vous."}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ) : null}

        <form
          onSubmit={handleSubmit}
          style={{
            maxWidth: "28rem",
            width: "100%",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          <Field.Root required>
            <Field.Label>Adresse e-mail</Field.Label>
            <Input
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="exemple@universite.fr"
            />
          </Field.Root>

          <Field.Root required invalid={hasError}>
            <Field.Label>Mot de passe</Field.Label>
            <InputGroup
              endElement={
                <IconButton
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  onClick={() => setShowPassword(!showPassword)}
                  variant="ghost"
                  size="sm"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </IconButton>
              }
            >
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange("password")}
                placeholder="Votre mot de passe"
              />
            </InputGroup>
            {hasError ? <Field.ErrorText>{error}</Field.ErrorText> : null}
          </Field.Root>

          {hasError && !isSubmitting ? (
            <Alert.Root status="error" borderRadius="md">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Connexion impossible</Alert.Title>
                <Alert.Description>
                  {error}
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          ) : null}

          <Button type="submit" colorPalette="blue" loading={isSubmitting}>
            Se connecter
          </Button>
        </form>

        <Stack gap={2} width="full" textAlign="center">
          <Text color="fg.muted">
            Mot de passe oublié ?{" "}
            <Link as={NextLink} href="/reset-password" color="accent.primary" fontWeight="semibold">
              Réinitialiser
            </Link>
          </Text>
          <Text color="fg.muted">
            Pas encore de compte ?{" "}
            <Link as={NextLink} href="/register" color="accent.primary" fontWeight="semibold">
              Créer un compte
            </Link>
          </Text>
        </Stack>
      </Stack>
    </Container>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Container py={16} maxW="lg" centerContent mx="auto">
          <Stack gap={4} alignItems="center">
            <Heading size="md">Chargement de la page de connexion...</Heading>
            <Text color="fg.muted">Merci de patienter.</Text>
          </Stack>
        </Container>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
