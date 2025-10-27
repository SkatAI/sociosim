"use client";

import { Button, Container, Heading, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";

export default function RegisterConfirmationPage() {
  return (
    <Container py={16} maxW="lg">
      <Stack gap={6} textAlign="center">
        <Heading size="lg">Confirmez votre adresse e-mail</Heading>
        <Text color="gray.600">
          Nous venons d&apos;envoyer un lien de validation à votre adresse e-mail.
          Cliquez sur le lien pour activer votre compte Sociosim. Pensez à vérifier
          vos spams si vous ne voyez rien apparaître.
        </Text>
        <Button asChild colorPalette="blue" variant="outline">
          <NextLink href="/login">Retour à la connexion</NextLink>
        </Button>
      </Stack>
    </Container>
  );
}
