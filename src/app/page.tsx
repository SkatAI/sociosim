// app/page.tsx
"use client";
import {
  Box,
  Button,
  Container,
  Heading,
  SimpleGrid,
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

  const sampleAvatars = [
    { name: "Aïcha", trait: "Empathic field interviewer" },
    { name: "Marc", trait: "Skeptical policy maker" },
    { name: "Léa", trait: "Patient community organizer" },
  ];

  return (
    <Container py={16}>
      <Stack gap={8}>
        <Stack gap={4}>
          <Heading size="lg">Bienvenue sur Sociosim</Heading>
          <Text fontSize="lg" color="gray.600">
            Entraînez vos entretiens de sociologie grâce à des avatars IA
            configurables et recueillez des retours précis de vos enseignants.
          </Text>
          <Button asChild colorPalette="blue" alignSelf="flex-start">
            <NextLink href="/interview">Démarrer un entretien</NextLink>
          </Button>
        </Stack>

        <Box>
          <Text fontWeight="semibold" mb={4}>
            Avatars disponibles dans la démo
          </Text>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
            {sampleAvatars.map((avatar) => (
              <Box
                key={avatar.name}
                borderWidth="1px"
                borderRadius="md"
                p={4}
                bg="gray.50"
              >
                <Heading size="md">{avatar.name}</Heading>
                <Text mt={2} color="gray.600">
                  {avatar.trait}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      </Stack>
    </Container>
  );
}
