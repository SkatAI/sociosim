"use client";

import { Button, Container, Heading, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";

export default function RegisterConfirmationPage() {
  return (
    <Container py={16} maxW="lg">
      <Stack gap={6} textAlign="center">
        <Heading size="lg">Compte créé</Heading>
        <Text color="fg.muted">
          Votre compte Sociosim est prêt. Vous pouvez vous connecter avec votre adresse emailet
          le mot de passe choisi.
        </Text>
        <Button asChild colorPalette="blue" variant="outline">
          <NextLink href="/login">Aller à la connexion</NextLink>
        </Button>
      </Stack>
    </Container>
  );
}
