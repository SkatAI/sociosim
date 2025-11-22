// app/components/Header.tsx
"use client";
import { Box, Flex, HStack, IconButton, Link, Text } from "@chakra-ui/react";
import { LogOut } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type UserInfo = {
  firstName: string;
  lastName: string;
} | null;

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.replace("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

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
            <HStack gap={4}>
              <Link as={NextLink} href="/dashboard" fontWeight="medium" color="gray.700" _hover={{ color: "blue.600" }}>
                Tableau de bord
              </Link>
              <Link as={NextLink} href="/interview" fontWeight="medium" color="gray.700" _hover={{ color: "blue.600" }}>
                Nouvel entretien
              </Link>
              <HStack gap={2}>
                <Text fontWeight="medium" color="gray.700">
                  {user.firstName} {user.lastName}
                </Text>
                <IconButton
                  aria-label="Déconnexion"
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  title="Se déconnecter"
                >
                  <LogOut size={20} />
                </IconButton>
              </HStack>
            </HStack>
          ) : (
            <Link as={NextLink} href="/login" fontWeight="medium" color="gray.700">
              Se connecter
            </Link>
          )}
        </HStack>
      </Flex>
    </Box>
  );
}
