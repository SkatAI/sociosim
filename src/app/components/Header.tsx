// app/components/Header.tsx
"use client";
import { Avatar, Box, Flex, HStack, IconButton, Link, Popover, Stack, Text } from "@chakra-ui/react";
import { LogOut } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ColorModeButton } from "@/components/ui/color-mode";
import { useAuthUser } from "@/hooks/useAuthUser";
import { supabaseStorageKey } from "@/lib/supabaseClient";
import { authService } from "@/lib/authService";

type UserRole = "student" | "teacher" | "admin";

type UserInfo = {
  firstName: string;
  lastName: string;
  role: UserRole | null;
} | null;

export default function Header() {
  const router = useRouter();
  const { user, isLoading, role, user_admin } = useAuthUser();
  const [userInfo, setUserInfo] = useState<UserInfo>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [fontSize, setFontSize] = useState<"md" | "lg" | "xl">("md");

  const handleLogout = async () => {
    console.log("[Header] Logout clicked");

    const clearLocalAuth = () => {
      try {
        window.localStorage.removeItem(supabaseStorageKey);
        document.cookie = `${supabaseStorageKey}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      } catch (error) {
        console.warn("[Header] Failed to clear local auth storage", error);
      }
    };

    try {
      const timeout = new Promise<{ error: Error }>((resolve) => {
        window.setTimeout(
          () => resolve({ error: new Error("Logout timeout") }),
          2000
        );
      });
      const result = await Promise.race([
        authService.signOutLocal(),
        timeout,
      ]);
      if ("error" in result && result.error) {
        console.warn("[Header] Logout warning:", result.error);
      }
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    } finally {
      clearLocalAuth();
      setUserInfo(null);
      router.replace("/login");
    }
  };

  useEffect(() => {
    if (!user) {
      setUserInfo(null);
      return;
    }
    const firstName = (user.user_metadata?.firstName as string) || "";
    const lastName = (user.user_metadata?.lastName as string) || "";

    if (firstName || lastName) {
      setUserInfo({ firstName, lastName, role });
      return;
    }

    const fallbackName = user.email?.split("@")[0] ?? "Utilisateur";
    setUserInfo({ firstName: fallbackName, lastName: "", role });
  }, [user, role]);

  useEffect(() => {
    const stored = window.localStorage.getItem("fontSize") as "md" | "lg" | "xl" | null;
    if (stored === "lg" || stored === "xl") {
      setFontSize(stored);
      document.documentElement.dataset.font = stored;
    }
  }, []);

  const handleToggleFontSize = () => {
    const next =
      fontSize === "md" ? "lg" : fontSize === "lg" ? "xl" : "md";
    setFontSize(next);
    if (next === "md") {
      delete document.documentElement.dataset.font;
    } else {
      document.documentElement.dataset.font = next;
    }
    window.localStorage.setItem("fontSize", next);
  };

  const fontSizeLabel =
    fontSize === "md" ? "Taille de texte normale" : fontSize === "lg"
      ? "Taille de texte grande"
      : "Taille de texte très grande";

  return (
    <Box as="header" bg="bg.surface" borderBottomWidth="1px" borderBottomColor="border.muted">
      <Flex
        maxW="6xl"
        mx="auto"
        px={{ base: 4, md: 6 }}
        py={4}
        align="center"
        justify="space-between"
      >
        <HStack gap={6}>
          <Link
            as={NextLink}
            href={!isLoading && user ? "/personnas" : "/"}
            fontWeight="bold"
            fontSize="3xl"
            color="inherit"
            _hover={{ opacity: 0.8 }}
          >
            Mimesis
          </Link>
        </HStack>

        <HStack gap={4}>
          {!isLoading && user ? (
            <HStack gap={4}>
              <Link
                as={NextLink}
                href="/personnas"
                fontWeight="medium"
                color="fg.muted"
                _hover={{ color: "accent.primary" }}
              >
                Personnas
              </Link>
              <Link
                as={NextLink}
                href="/interviews"
                fontWeight="medium"
                color="fg.muted"
                _hover={{ color: "accent.primary" }}
              >
                {role === "admin" ? "Entretiens" : "Mes entretiens"}
              </Link>
              {user_admin && (
                <Link
                  as={NextLink}
                  href="/manage-users"
                  fontWeight="medium"
                  color="fg.muted"
                  _hover={{ color: "accent.primary" }}
                >
                  Utilisateurs
                </Link>
              )}
              <HStack gap={2}>
                <Popover.Root
                  open={isPopoverOpen}
                  onOpenChange={(state) => setIsPopoverOpen(state.open)}
                  positioning={{ placement: "bottom" }}
                  lazyMount
                  unmountOnExit
                >
                  <Popover.Trigger asChild>
                    <Box cursor="pointer">
                      <Avatar.Root size="md">
                        <Avatar.Fallback
                          name={`${userInfo?.firstName ?? ""} ${userInfo?.lastName ?? ""}`.trim() || "Utilisateur"}
                        />
                      </Avatar.Root>
                    </Box>
                  </Popover.Trigger>
                  <Popover.Positioner>
                    <Popover.Content>
                      <Stack gap={3} p={3}>
                        {/* Full name and role */}
                        <Text fontWeight="semibold" fontSize="md">
                          {(userInfo?.firstName || userInfo?.lastName)
                            ? `${userInfo?.firstName ?? ""} ${userInfo?.lastName ?? ""}`.trim()
                            : "Utilisateur"}
                          {(userInfo?.role === "teacher" || userInfo?.role === "admin") && (
                            <Text as="span" fontWeight="normal" fontSize="sm" color="fg.subtle">
                              {" "}({userInfo?.role})
                            </Text>
                          )}
                        </Text>

                        {/* Email */}
                        <Text fontSize="sm" color="fg.subtle">
                          {user?.email}
                        </Text>

                        {/* Modify profile link */}
                        <Link
                          as={NextLink}
                          href="/profile"
                          fontSize="sm"
                          color="accent.primary"
                          _hover={{ textDecoration: "underline" }}
                        >
                          Modifier le profil
                        </Link>

                        <Stack gap={2}>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="fg.muted">
                              Texte
                            </Text>
                            <IconButton
                              aria-label={fontSizeLabel}
                              variant="ghost"
                              size="sm"
                              onClick={handleToggleFontSize}
                              title={fontSizeLabel}
                            >
                              <HStack gap={0.5}>
                                <Text fontSize="xs">A</Text>
                                <Text fontSize="md">A</Text>
                              </HStack>
                            </IconButton>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="fg.muted">
                              Thème
                            </Text>
                            <ColorModeButton />
                          </HStack>
                        </Stack>
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
                  type="button"
                >
                  <LogOut size={20} />
                </IconButton>
              </HStack>
            </HStack>
          ) : (
            <Link as={NextLink} href="/login" fontWeight="medium" color="fg.muted">
              Se connecter
            </Link>
          )}
        </HStack>
      </Flex>
    </Box>
  );
}
