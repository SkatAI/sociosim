// app/page.tsx
"use client";
import {
  Button,
  Container,
  Heading,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuthUser();

  useEffect(() => {
    if (!isLoading && user?.id) {
      router.replace("/personnas");
    }
  }, [isLoading, router, user?.id]);

  return (
    <Container py={16}>
      <Stack gap={8}>
        <Stack gap={4}>
          <Heading size="lg">Bienvenue sur Mimesis</Heading>
          <Text fontSize="lg" color="fg.muted">
            Entraînez-vous à mener des entretiens de sociologie.
          </Text>
          <Text fontSize="md" color="fg.muted">
            Mimesis vous aide à pratiquer l&apos;écoute active, les relances et la reformulation
            grâce à des personnas réalistes.
            <br />
            Lancez un entretien guidé, explorez des parcours variés et progressez à votre rythme.
          </Text>
          <Stack direction={{ base: "column", sm: "row" }} gap={3}>
            <Button
              asChild
              variant="outline"
              size="lg"
              px={6}
              borderRadius="md"
              borderColor="accent.primary"
              color="accent.primary"
              fontWeight="semibold"
            >
              <NextLink href="/register">Créer un compte</NextLink>
            </Button>
            <Button
              asChild
              variant="outline"
              colorPalette="blue"
              size="lg"
              px={6}
              borderRadius="md"
              borderColor="blue.500"
              fontWeight="semibold"
            >
              <NextLink href="/login">Se connecter</NextLink>
            </Button>
          </Stack>
        </Stack>

      </Stack>
    </Container>
  );
}
