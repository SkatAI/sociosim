// app/components/Header.tsx
"use client";
import { Box, Flex, HStack, Link, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type UserInfo = {
  firstName: string;
  lastName: string;
} | null;

export default function Header() {
  const [user, setUser] = useState<UserInfo>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        const firstName = authUser.user_metadata?.firstName || "";
        const lastName = authUser.user_metadata?.lastName || "";

        if (firstName && lastName) {
          setUser({ firstName, lastName });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  return (
    <Box as="header" bg="white" borderBottomWidth="1px">
      <Flex
        maxW="6xl"
        mx="auto"
        px={{ base: 4, md: 6 }}
        py={4}
        align="center"
        justify="space-between"
      >
        <Text fontWeight="bold" fontSize="lg">
          Sociosim
        </Text>

        <HStack gap={4}>
          {!isLoading && user ? (
            <Text fontWeight="medium" color="gray.700">
              {user.firstName} {user.lastName}
            </Text>
          ) : (
            <Link href="/login" fontWeight="medium" color="gray.700">
              Se connecter
            </Link>
          )}
        </HStack>
      </Flex>
    </Box>
  );
}
