"use client";

import {
  Alert,
  Box,
  Button,
  Container,
  Field,
  Heading,
  Input,
  Link,
  Stack,
  Text,
  chakra,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";

type ProfileFormState = {
  firstName: string;
  lastName: string;
};

type FieldErrors = Partial<Record<keyof ProfileFormState, string>>;

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, updateUserMetadata } = useAuthUser();
  const [form, setForm] = useState<ProfileFormState>({
    firstName: "",
    lastName: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(true);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const metadata = user.user_metadata || {};
    setForm({
      firstName: (metadata.firstName as string) || "",
      lastName: (metadata.lastName as string) || "",
    });
    setIsPrefilling(false);
  }, [isAuthLoading, router, user]);

  const handleChange =
    (field: keyof ProfileFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      setServerError(null);
      setSuccessMessage(null);
    };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!form.firstName.trim()) {
      errors.firstName = "Votre prénom est requis.";
    }

    if (!form.lastName.trim()) {
      errors.lastName = "Votre nom est requis.";
    }

    return errors;
  };

  const hasChanges = useMemo(() => {
    if (!user) return false;
    const metadata = user.user_metadata || {};
    const currentFirst = (metadata.firstName as string) || "";
    const currentLast = (metadata.lastName as string) || "";
    return (
      form.firstName.trim() !== currentFirst ||
      form.lastName.trim() !== currentLast
    );
  }, [form.firstName, form.lastName, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (!user) {
      setServerError("Votre session a expiré. Merci de vous reconnecter.");
      return;
    }

    setIsSubmitting(true);

    const trimmedFirst = form.firstName.trim();
    const trimmedLast = form.lastName.trim();
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: trimmedFirst,
          lastName: trimmedLast,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;

      if (!response.ok || payload?.error) {
        setServerError(
          payload?.error ?? "Impossible de mettre à jour votre profil pour le moment."
        );
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(payload?.message ?? "Profil mis à jour avec succès.");

      // Update the user state directly with new metadata
      updateUserMetadata({
        firstName: trimmedFirst,
        lastName: trimmedLast,
        name: `${trimmedFirst} ${trimmedLast}`,
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      setServerError("Une erreur inattendue est survenue. Merci de réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isPrefilling) {
    return (
      <Container py={16} maxW="lg" centerContent mx="auto">
        <Stack gap={4} alignItems="center" textAlign="center">
          <Heading size="md">Chargement du profil...</Heading>
          <Text color="fg.muted">Merci de patienter.</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container py={12} maxW="lg" mx="auto" px={{ base: 4, md: 0 }}>
      <Stack gap={8}>
        <Stack gap={1}>
          <Heading size="lg">Mon profil</Heading>
          <Text color="fg.muted">Mettez à jour vos informations personnelles.</Text>
        </Stack>

        {serverError ? (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Une erreur est survenue</Alert.Title>
              <Alert.Description>{serverError}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ) : null}

        {successMessage ? (
          <Alert.Root status="success" borderRadius="md">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Mise à jour réussie</Alert.Title>
              <Alert.Description>{successMessage}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ) : null}

        <chakra.form
          onSubmit={handleSubmit}
          maxW="md"
          width="full"
          mx="auto"
          display="flex"
          flexDirection="column"
          gap={6}
        >
          <Field.Root required invalid={Boolean(fieldErrors.firstName)}>
            <Field.Label>Prénom</Field.Label>
            <Input
              type="text"
              value={form.firstName}
              onChange={handleChange("firstName")}
              placeholder="Votre prénom"
              disabled={isSubmitting}
            />
            {fieldErrors.firstName ? (
              <Field.ErrorText>{fieldErrors.firstName}</Field.ErrorText>
            ) : null}
          </Field.Root>

          <Field.Root required invalid={Boolean(fieldErrors.lastName)}>
            <Field.Label>Nom</Field.Label>
            <Input
              type="text"
              value={form.lastName}
              onChange={handleChange("lastName")}
              placeholder="Votre nom"
              disabled={isSubmitting}
            />
            {fieldErrors.lastName ? (
              <Field.ErrorText>{fieldErrors.lastName}</Field.ErrorText>
            ) : null}
          </Field.Root>

          <Stack gap={3}>
            <Button type="submit" colorPalette="blue" loading={isSubmitting} disabled={!hasChanges}>
              Enregistrer les changements
            </Button>
            <Box textAlign="center">
              <Link as={NextLink} href="/dashboard" color="accent.primary" fontWeight="semibold">
                Retour au tableau de bord
              </Link>
            </Box>
          </Stack>
        </chakra.form>
      </Stack>
    </Container>
  );
}
