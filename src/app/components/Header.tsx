// app/components/Header.tsx
"use client";
import { Box, Flex, HStack, IconButton, Link, Text } from "@chakra-ui/react";
import { LogOut } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";

type UserInfo = {
  firstName: string;
  lastName: string;
} | null;

export default function Header() {
  const router = useRouter();
  const { user, isLoading } = useAuthUser();
  const [userInfo, setUserInfo] = useState<UserInfo>(null);

  const handleLogout = async () => {
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      await supabase.auth.signOut();
      setUserInfo(null);
      router.replace("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  useEffect(() => {
    if (!user) {
      setUserInfo(null);
      return;
    }
    const firstName = (user.user_metadata?.firstName as string) || "";
    const lastName = (user.user_metadata?.lastName as string) || "";
    if (firstName && lastName) {
      setUserInfo({ firstName, lastName });
    } else {
      setUserInfo(null);
    }
  }, [user]);

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
        <Link
          as={NextLink}
          href={!isLoading && user ? "/dashboard" : "/"}
          fontWeight="bold"
          fontSize="lg"
          color="inherit"
          _hover={{ opacity: 0.8 }}
        >
          Sociosim
        </Link>

        <HStack gap={4}>
          {!isLoading && userInfo ? (
            <HStack gap={4}>
              <Link as={NextLink} href="/dashboard" fontWeight="medium" color="gray.700" _hover={{ color: "blue.600" }}>
                Tableau de bord
              </Link>
              <HStack gap={2}>
                <Text fontWeight="medium" color="gray.700">
                  {userInfo.firstName} {userInfo.lastName}
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
