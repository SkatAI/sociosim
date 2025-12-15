// app/components/Header.tsx
"use client";
import { Avatar, Box, Flex, HStack, IconButton, Link, Popover, Stack, Text } from "@chakra-ui/react";
import { LogOut } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";

type UserRole = "student" | "teacher" | "admin";

type UserInfo = {
  firstName: string;
  lastName: string;
  role: UserRole | null;
} | null;

export default function Header() {
  const router = useRouter();
  const { user, isLoading, role } = useAuthUser();
  const [userInfo, setUserInfo] = useState<UserInfo>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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
      setUserInfo({ firstName, lastName, role });
    } else {
      setUserInfo(null);
    }
  }, [user, role]);

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
                <Popover.Root
                  open={isPopoverOpen}
                  onOpenChange={(state) => setIsPopoverOpen(state.open)}
                  positioning={{ placement: "bottom" }}
                >
                  <Popover.Trigger asChild>
                    <Box
                      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                      cursor="pointer"
                    >
                      <Avatar.Root size="md">
                        <Avatar.Fallback name={`${userInfo.firstName} ${userInfo.lastName}`} />
                      </Avatar.Root>
                    </Box>
                  </Popover.Trigger>
                  <Popover.Positioner>
                    <Popover.Content>
                      <Stack gap={2} p={3}>
                        {/* Full name and role */}
                        <Text fontWeight="semibold" fontSize="md">
                          {userInfo.firstName} {userInfo.lastName}
                          {(userInfo.role === "teacher" || userInfo.role === "admin") && (
                            <Text as="span" fontWeight="normal" fontSize="sm" color="gray.600">
                              {" "}({userInfo.role})
                            </Text>
                          )}
                        </Text>

                        {/* Email */}
                        <Text fontSize="sm" color="gray.600">
                          {user?.email}
                        </Text>

                        {/* Modify profile link */}
                        <Link
                          as={NextLink}
                          href="/profile"
                          fontSize="sm"
                          color="blue.600"
                          _hover={{ textDecoration: "underline" }}
                        >
                          Modifier le profil
                        </Link>
                      </Stack>
                    </Popover.Content>
                  </Popover.Positioner>
                </Popover.Root>

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
