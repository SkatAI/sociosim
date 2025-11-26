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
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.id) {
        router.replace("/dashboard");
      } else {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isCheckingAuth) {
    return null;
  }

  return (
    <Container py={16}>
      <Stack gap={8}>
        <Stack gap={4}>
          <Heading size="lg">Bienvenue sur Sociosim</Heading>
          <Text fontSize="lg" color="gray.600">
            Entraînez-vous à mener des entretiens de sociologie.
          </Text>
          <Stack direction={{ base: "column", sm: "row" }} gap={3}>
            <Button
              asChild
              variant="outline"
              size="lg"
              px={6}
              borderRadius="md"
              borderColor="blue.500"
              color="blue.700"
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
