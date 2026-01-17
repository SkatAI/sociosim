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
  Link,
  Stack,
  Text,
  chakra,
} from "@chakra-ui/react";
import { Eye, EyeOff } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";

type ProfileFormState = {
  firstName: string;
  lastName: string;
  password: string;
  confirmation: string;
};

type FieldErrors = Partial<Record<keyof ProfileFormState, string>>;

const MIN_PASSWORD_LENGTH = 8;

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, updateUserMetadata } = useAuthUser();
  const [form, setForm] = useState<ProfileFormState>({
    firstName: "",
    lastName: "",
    password: "",
    confirmation: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

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
      password: "",
      confirmation: "",
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

    const trimmedPassword = form.password.trim();
    const trimmedConfirmation = form.confirmation.trim();

    if (trimmedPassword || trimmedConfirmation) {
      if (!trimmedPassword) {
        errors.password = "Votre mot de passe est requis.";
      } else if (trimmedPassword.length < MIN_PASSWORD_LENGTH) {
        errors.password = `Votre mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
      }

      if (!trimmedConfirmation) {
        errors.confirmation = "Merci de confirmer votre mot de passe.";
      } else if (trimmedConfirmation !== trimmedPassword) {
        errors.confirmation = "La confirmation ne correspond pas au mot de passe.";
      }
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
      form.lastName.trim() !== currentLast ||
      form.password.trim().length > 0 ||
      form.confirmation.trim().length > 0
    );
  }, [form.confirmation, form.firstName, form.lastName, form.password, user]);

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
    const trimmedPassword = form.password.trim();
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: trimmedFirst,
          lastName: trimmedLast,
          password: trimmedPassword || undefined,
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
      setForm((prev) => ({
        ...prev,
        password: "",
        confirmation: "",
      }));
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

          <Field.Root invalid={Boolean(fieldErrors.password)}>
            <Field.Label>Nouveau mot de passe</Field.Label>
            <InputGroup
              endElement={
                <IconButton
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  onClick={() => setShowPassword(!showPassword)}
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </IconButton>
              }
            >
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange("password")}
                placeholder={`Au moins ${MIN_PASSWORD_LENGTH} caractères`}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </InputGroup>
            {fieldErrors.password ? (
              <Field.ErrorText>{fieldErrors.password}</Field.ErrorText>
            ) : null}
          </Field.Root>

          <Field.Root invalid={Boolean(fieldErrors.confirmation)}>
            <Field.Label>Confirmez le mot de passe</Field.Label>
            <InputGroup
              endElement={
                <IconButton
                  aria-label={showConfirmation ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  onClick={() => setShowConfirmation(!showConfirmation)}
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting}
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
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </InputGroup>
            {fieldErrors.confirmation ? (
              <Field.ErrorText>{fieldErrors.confirmation}</Field.ErrorText>
            ) : null}
          </Field.Root>

          <Stack gap={3}>
            <Button type="submit" colorPalette="blue" loading={isSubmitting} disabled={!hasChanges}>
              Enregistrer les changements
            </Button>
            <Box textAlign="center">
              <Link as={NextLink} href="/interviews" color="accent.primary" fontWeight="semibold">
                Retour aux entretiens
              </Link>
            </Box>
          </Stack>
        </chakra.form>
      </Stack>
    </Container>
  );
}
