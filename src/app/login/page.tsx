"use client";

import {
  Alert,
  Button,
  Container,
  Field,
  Heading,
  Input,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AuthState = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordJustCreated = searchParams.get("password") === "created";
  const [form, setForm] = useState<AuthState>({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof AuthState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "Identifiants incorrects. Merci de vérifier votre email et votre mot de passe."
          : "Impossible de vous connecter pour le moment. Veuillez réessayer."
      );
      setIsSubmitting(false);
      return;
    }

    router.replace("/");
  };

  const hasError = Boolean(error);

  return (
    <Container py={16} maxW="lg">
      <Stack gap={8}>
        <Stack gap={2} textAlign="center">
          <Heading size="lg">Se connecter</Heading>
          <Text color="gray.600">
            Accédez à votre espace Sociosim pour continuer vos simulations.
          </Text>
        </Stack>

        {passwordJustCreated ? (
          <Alert.Root status="success" borderRadius="md">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Mot de passe enregistré</Alert.Title>
              <Alert.Description>
                Vous pouvez maintenant vous connecter avec votre adresse e-mail et le mot de passe défini.
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ) : null}

        <form onSubmit={handleSubmit}>
          <Stack gap={6}>
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
              <Input
                type="password"
                value={form.password}
                onChange={handleChange("password")}
                placeholder="Votre mot de passe"
              />
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
          </Stack>
        </form>

        <Text textAlign="center" color="gray.600">
          Pas encore de compte ?{" "}
          <Link as={NextLink} href="/register" color="blue.600" fontWeight="semibold">
            Créer un compte
          </Link>
        </Text>
      </Stack>
    </Container>
  );
}
