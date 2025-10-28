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
import { useRouter } from "next/navigation";
import { useState } from "react";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RegisterFormState = {
  firstName: string;
  lastName: string;
  email: string;
};

type FieldErrors = Partial<Record<keyof RegisterFormState, string>>;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterFormState>({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      errors.email = "Votre adresse e-mail est requise.";
    } else if (!emailRegex.test(form.email.trim())) {
      errors.email = "Merci de fournir une adresse e-mail valide.";
    }

    return errors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
      }),
    });

    if (response.ok) {
      router.replace("/register/confirmation");
      return;
    }

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setServerError(
      payload?.error ?? "Impossible de créer votre compte pour le moment. Veuillez réessayer."
    );
    setIsSubmitting(false);
  };

  return (
    <Container py={16} maxW="lg">
      <Stack gap={8}>
        <Stack gap={2} textAlign="center">
          <Heading size="lg">Créer un compte</Heading>
          <Text color="gray.600">
            Renseignez vos informations pour accéder à Sociosim en tant qu&apos;étudiant·e.
          </Text>
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

        <form onSubmit={handleSubmit}>
          <Stack gap={6}>
            <Field.Root required invalid={Boolean(fieldErrors.firstName)}>
              <Field.Label>Prénom</Field.Label>
              <Input
                value={form.firstName}
                onChange={handleChange("firstName")}
                placeholder="Prénom"
              />
              {fieldErrors.firstName ? (
                <Field.ErrorText>{fieldErrors.firstName}</Field.ErrorText>
              ) : null}
            </Field.Root>

            <Field.Root required invalid={Boolean(fieldErrors.lastName)}>
              <Field.Label>Nom</Field.Label>
              <Input
                value={form.lastName}
                onChange={handleChange("lastName")}
                placeholder="Nom"
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
              />
              {fieldErrors.email ? (
                <Field.ErrorText>{fieldErrors.email}</Field.ErrorText>
              ) : null}
            </Field.Root>

            <Button type="submit" colorPalette="blue" loading={isSubmitting}>
              Envoyer le lien d&apos;inscription
            </Button>
          </Stack>
        </form>

        <Text textAlign="center" color="gray.600">
          Vous avez un compte ?{" "}
          <Link as={NextLink} href="/login" color="blue.600" fontWeight="semibold">
            Se connecter
          </Link>
        </Text>
      </Stack>
    </Container>
  );
}
