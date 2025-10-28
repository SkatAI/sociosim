"use client";

import {
  Alert,
  Button,
  Container,
  Field,
  Heading,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

const MIN_PASSWORD_LENGTH = 8;

type PasswordFormState = {
  password: string;
  confirmation: string;
};

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [form, setForm] = useState<PasswordFormState>({
    password: "",
    confirmation: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTokenMissing = useMemo(() => token.length === 0, [token]);

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

    const response = await fetch("/api/register/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: form.password }),
    });

    if (response.ok) {
      router.replace("/login?password=created");
      return;
    }

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    setError(
      payload?.error ?? "Impossible d'enregistrer votre mot de passe."
    );
    setIsSubmitting(false);
  };

  return (
    <Container py={16} maxW="lg">
      <Stack gap={8}>
        <Stack gap={2} textAlign="center">
          <Heading size="lg">Définir votre mot de passe</Heading>
          <Text color="gray.600">
            Choisissez un mot de passe pour finaliser l&apos;activation de votre compte.
          </Text>
        </Stack>

        {error ? (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Action requise</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ) : null}

        <form onSubmit={handleSubmit}>
          <Stack gap={6}>
            <Field.Root required>
              <Field.Label>Mot de passe</Field.Label>
              <Input
                type="password"
                value={form.password}
                onChange={handleChange("password")}
                placeholder="Au moins 8 caractères"
                disabled={isTokenMissing}
              />
            </Field.Root>

            <Field.Root required>
              <Field.Label>Confirmez le mot de passe</Field.Label>
              <Input
                type="password"
                value={form.confirmation}
                onChange={handleChange("confirmation")}
                placeholder="Répétez votre mot de passe"
                disabled={isTokenMissing}
              />
            </Field.Root>

            <Button
              type="submit"
              colorPalette="blue"
              loading={isSubmitting}
              disabled={isTokenMissing}
            >
              Enregistrer mon mot de passe
            </Button>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}
