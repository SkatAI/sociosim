"use client";

import { Box, Container, Heading, Spinner, Table, Text, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/useAuthUser";

type UserRole = "student" | "teacher" | "admin";

type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

const getRoleLabel = (role: UserRole) => {
  switch (role) {
    case "admin":
      return "Admin";
    case "teacher":
      return "Enseignant";
    default:
      return "Etudiant";
  }
};

const getRoleColor = (role: UserRole) => {
  switch (role) {
    case "admin":
      return "green";
    case "teacher":
      return "orange";
    default:
      return "gray";
  }
};

export default function ManageUsersClient() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthUser();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const loadUsers = async () => {
      try {
        const response = await fetch("/api/users", { cache: "no-store" });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          setError(payload.error || "Impossible de charger les utilisateurs.");
          setIsLoading(false);
          return;
        }
        const payload = (await response.json()) as { users?: UserSummary[] };
        setUsers(payload.users ?? []);
      } catch (fetchError) {
        console.error("[ManageUsers] Failed to load users:", fetchError);
        setError("Une erreur est survenue lors du chargement des utilisateurs.");
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [isAuthLoading, router, user]);

  if (isLoading) {
    return (
      <Container maxWidth="5xl" height="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={4}>
          <Spinner size="lg" color="blue.500" />
          <Text color="fg.muted">Chargement des utilisateurs...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxWidth="5xl" py={8} px={{ base: 4, md: 6 }}>
      <VStack gap={6} alignItems="stretch">
        <Heading size="lg">Utilisateurs</Heading>

        {error && (
          <Box
            backgroundColor={{ base: "red.50", _dark: "red.900" }}
            borderRadius="md"
            padding={4}
            borderLeft="4px solid"
            borderLeftColor="red.500"
          >
            <Text color={{ base: "red.700", _dark: "red.200" }}>{error}</Text>
          </Box>
        )}

        {!error && users.length === 0 && (
          <Box
            padding={6}
            borderRadius="md"
            backgroundColor="bg.subtle"
          >
            <Text color="fg.muted">Aucun utilisateur disponible.</Text>
          </Box>
        )}

        {users.length > 0 && (
          <Table.ScrollArea borderWidth="1px" borderColor="border.muted" borderRadius="md">
            <Table.Root size="sm" variant="outline" striped>
              <Table.Header>
                <Table.Row bg="bg.subtle">
                  <Table.ColumnHeader>Nom</Table.ColumnHeader>
                  <Table.ColumnHeader>Email</Table.ColumnHeader>
                  <Table.ColumnHeader>Statut</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {users.map((userRow) => (
                  <Table.Row key={userRow.id}>
                    <Table.Cell fontWeight="medium">{userRow.name}</Table.Cell>
                    <Table.Cell>{userRow.email}</Table.Cell>
                    <Table.Cell color={`${getRoleColor(userRow.role)}.600`} fontWeight="semibold">
                      {getRoleLabel(userRow.role)}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        )}
      </VStack>
    </Container>
  );
}
