"use client";

import {
  Button,
  Container,
  Field,
  Heading,
  Input,
  InputGroup,
  IconButton,
  Link,
  Stack,
  Text,
  Tooltip,
  chakra,
} from "@chakra-ui/react";
import { Eye, EyeOff } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { withTimeout } from "@/lib/withTimeout";
import { toaster } from "@/components/ui/toaster";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

type RegisterFormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmation: string;
};

type FieldErrors = Partial<Record<keyof RegisterFormState, string>>;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterFormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmation: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleChange = (field: keyof RegisterFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!form.firstName.trim()) {
      errors.firstName = "Votre prénom est requis.";
    }

    if (!form.lastName.trim()) {
      errors.lastName = "Votre nom est requis.";
    }

    if (!form.email.trim()) {
      errors.email = "Votre adresse emailest requise.";
    } else if (!emailRegex.test(form.email.trim())) {
      errors.email = "Merci de fournir une adresse emailvalide.";
    }

    if (!form.password) {
      errors.password = "Votre mot de passe est requis.";
    } else if (form.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Votre mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
    }

    if (!form.confirmation) {
      errors.confirmation = "Merci de confirmer votre mot de passe.";
    } else if (form.confirmation !== form.password) {
      errors.confirmation = "La confirmation ne correspond pas au mot de passe.";
    }

    return errors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await withTimeout(
        "register",
        fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            password: form.password,
          }),
        }),
        30000
      );

      if (response.ok) {
        router.replace("/login?signup=success");
        return;
      }

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      toaster.create({
        title: "Inscription impossible",
        description:
          payload?.error ?? "Impossible de créer votre compte pour le moment. Veuillez réessayer.",
        type: "error",
      });
    } catch (error) {
      console.error("[register] Failed to submit:", error);
      toaster.create({
        title: "Inscription impossible",
        description: "Impossible de créer votre compte pour le moment. Veuillez réessayer.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container py={16} maxW="lg" centerContent mx="auto">
      <Stack gap={8} alignItems="center">
        <Stack gap={2} textAlign="center" maxW="lg" width="full">
          <Heading size="lg">Créer un compte</Heading>
        </Stack>

        <chakra.form
          onSubmit={handleSubmit}
          maxW="sm"
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
              placeholder="Prénom"
              autoComplete="given-name"
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
              placeholder="Nom"
              autoComplete="family-name"
            />
            {fieldErrors.lastName ? (
              <Field.ErrorText>{fieldErrors.lastName}</Field.ErrorText>
            ) : null}
          </Field.Root>

          <Field.Root required invalid={Boolean(fieldErrors.email)}>
            <Field.Label>Adresse e-mail</Field.Label>
            <Input
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="exemple@universite.fr"
              autoComplete="email"
            />
            {fieldErrors.email ? (
              <Field.ErrorText>{fieldErrors.email}</Field.ErrorText>
            ) : null}
          </Field.Root>

          <Field.Root required invalid={Boolean(fieldErrors.password)}>
            <Field.Label>Mot de passe</Field.Label>
            <InputGroup
              endElement={
                <Tooltip.Root openDelay={150}>
                  <Tooltip.Trigger asChild>
                    <IconButton
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      onClick={() => setShowPassword(!showPassword)}
                      variant="ghost"
                      size="sm"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </IconButton>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner>
                    <Tooltip.Content px={3} py={2}>
                      {showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
              }
            >
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange("password")}
                placeholder={`Au moins ${MIN_PASSWORD_LENGTH} caractères`}
                autoComplete="new-password"
              />
            </InputGroup>
            {fieldErrors.password ? (
              <Field.ErrorText>{fieldErrors.password}</Field.ErrorText>
            ) : null}
          </Field.Root>

          <Field.Root required invalid={Boolean(fieldErrors.confirmation)}>
            <Field.Label>Confirmez le mot de passe</Field.Label>
            <InputGroup
              endElement={
                <Tooltip.Root openDelay={150}>
                  <Tooltip.Trigger asChild>
                    <IconButton
                      aria-label={showConfirmation ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      onClick={() => setShowConfirmation(!showConfirmation)}
                      variant="ghost"
                      size="sm"
                    >
                      {showConfirmation ? <EyeOff size={20} /> : <Eye size={20} />}
                    </IconButton>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner>
                    <Tooltip.Content px={3} py={2}>
                      {showConfirmation ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
              }
            >
              <Input
                type={showConfirmation ? "text" : "password"}
                value={form.confirmation}
                onChange={handleChange("confirmation")}
                placeholder="Répétez votre mot de passe"
                autoComplete="new-password"
              />
            </InputGroup>
            {fieldErrors.confirmation ? (
              <Field.ErrorText>{fieldErrors.confirmation}</Field.ErrorText>
            ) : null}
          </Field.Root>

          <Button type="submit" colorPalette="blue" loading={isSubmitting}>
            Créer mon compte
          </Button>
        </chakra.form>

        <Text textAlign="center" color="fg.muted">
          Vous avez un compte ?{" "}
          <Link as={NextLink} href="/login" color="accent.primary" fontWeight="semibold">
            Se connecter
          </Link>
        </Text>
      </Stack>
    </Container>
  );
}
