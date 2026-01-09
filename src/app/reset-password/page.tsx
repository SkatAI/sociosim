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
import { useState } from "react";
import { withTimeout } from "@/lib/withTimeout";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await withTimeout(
        "resetPasswordRequest",
        fetch("/api/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        }),
        20000
      );

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Impossible de traiter votre demande. Veuillez réessayer.");
        return;
      }

      setSuccess(true);
      setEmail("");
    } catch (submitError) {
      console.error("[reset-password] Request failed:", submitError);
      setError("Impossible de traiter votre demande. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container py={16} maxW="lg" centerContent mx="auto">
      <Stack gap={8} alignItems="center">
        <Stack gap={2} textAlign="center" maxW="lg" width="full">
          <Heading size="lg">Réinitialiser votre mot de passe</Heading>
          <Text color="fg.muted">
            Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.
          </Text>
        </Stack>

        {success ? (
          <Alert.Root status="success" borderRadius="md" width="full">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Lien envoyé</Alert.Title>
              <Alert.Description>
                Vérifiez votre e-mail pour accéder au lien de réinitialisation. Vous pouvez maintenant créer un nouveau mot de passe.
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ) : (
          <>
            {error ? (
              <Alert.Root status="error" borderRadius="md" width="full">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Une erreur est survenue</Alert.Title>
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            ) : null}

            <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "28rem" }}>
              <Stack gap={6}>
                <Field.Root required>
                  <Field.Label>Adresse e-mail</Field.Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemple@universite.fr"
                  autoComplete="email"
                  disabled={isSubmitting}
                />
                </Field.Root>

                <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                  Envoyer le lien de réinitialisation
                </Button>
              </Stack>
            </form>
          </>
        )}

        <Text textAlign="center" color="fg.muted">
          Vous vous souvenez de votre mot de passe ?{" "}
          <Link as={NextLink} href="/login" color="accent.primary" fontWeight="semibold">
            Se connecter
          </Link>
        </Text>
      </Stack>
    </Container>
  );
}
