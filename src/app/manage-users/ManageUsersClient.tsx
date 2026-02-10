"use client";

import {
  Box,
  Button,
  Checkbox,
  Container,
  Heading,
  IconButton,
  Input,
  Spinner,
  Table,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { toaster } from "@/components/ui/toaster";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Ban, Power } from "lucide-react";

type UserRole = "student" | "teacher" | "admin";

type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_banned: boolean;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const { user, isLoading: isAuthLoading, user_admin } = useAuthUser();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteIsAdmin, setInviteIsAdmin] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [banLoading, setBanLoading] = useState<Record<string, boolean>>({});
  const [roleLoading, setRoleLoading] = useState<Record<string, boolean>>({});
  const currentUserId = user?.id ?? null;

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!user_admin) {
      router.push("/personnas");
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
  }, [isAuthLoading, router, user, user_admin]);

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInviteError(null);

    if (!inviteEmail.trim() || !inviteName.trim()) {
      setInviteError("Merci de renseigner un emailet un nom.");
      return;
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      setInviteError("Le format de l'adresse emailest invalide.");
      return;
    }

    setIsInviting(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          name: inviteName.trim(),
          isAdmin: inviteIsAdmin,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | { user?: UserSummary }
        | null;

      if (!response.ok) {
        const message = payload && "error" in payload ? payload.error : null;
        setInviteError(message ?? "Impossible d'inviter cet utilisateur.");
        toaster.create({
          title: "Invitation echouee",
          description: message ?? "Impossible d'inviter cet utilisateur.",
          type: "error",
        });
        return;
      }

      const nextUser = payload && "user" in payload ? payload.user : null;
      if (nextUser) {
        setUsers((current) =>
          [...current, nextUser].sort((a, b) => a.email.localeCompare(b.email, "fr"))
        );
      }

      setInviteEmail("");
      setInviteName("");
      setInviteIsAdmin(false);
      toaster.create({
        title: "Invitation envoyée",
        description: "Le nouvel utilisateur va recevoir un emaild'inscription.",
        type: "success",
      });
    } catch (inviteError) {
      console.error("[ManageUsers] Invite failed:", inviteError);
      setInviteError("Une erreur est survenue lors de l'invitation.");
      toaster.create({
        title: "Invitation echouee",
        description: "Une erreur est survenue lors de l'invitation.",
        type: "error",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleToggleBan = async (target: UserSummary) => {
    setBanLoading((current) => ({ ...current, [target.id]: true }));
    try {
      const response = await fetch(`/api/users/${target.id}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned: !target.is_banned }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | { user?: UserSummary }
        | null;

      if (!response.ok) {
        const message = payload && "error" in payload ? payload.error : null;
        toaster.create({
          title: "Action echouee",
          description: message ?? "Impossible de mettre a jour ce compte.",
          type: "error",
        });
        return;
      }

      const updatedUser = payload && "user" in payload ? payload.user : null;
      if (updatedUser) {
        setUsers((current) =>
          current.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry))
        );
      }

      toaster.create({
        title: target.is_banned ? "Utilisateur active" : "Utilisateur banni",
        description: target.is_banned
          ? "Le compte est de nouveau actif."
          : "Le compte a ete desactive.",
        type: "success",
      });
    } catch (banError) {
      console.error("[ManageUsers] Ban toggle failed:", banError);
      toaster.create({
        title: "Action echouee",
        description: "Impossible de mettre a jour ce compte.",
        type: "error",
      });
    } finally {
      setBanLoading((current) => ({ ...current, [target.id]: false }));
    }
  };

  const handleToggleRole = async (target: UserSummary) => {
    const nextRole: UserRole = target.role === "admin" ? "student" : "admin";
    setRoleLoading((current) => ({ ...current, [target.id]: true }));
    try {
      const response = await fetch(`/api/users/${target.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | { user?: UserSummary }
        | null;

      if (!response.ok) {
        const message = payload && "error" in payload ? payload.error : null;
        toaster.create({
          title: "Action echouee",
          description: message ?? "Impossible de mettre a jour ce compte.",
          type: "error",
        });
        return;
      }

      const updatedUser = payload && "user" in payload ? payload.user : null;
      if (updatedUser) {
        setUsers((current) =>
          current.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry))
        );
      }

      toaster.create({
        title: "Role mis a jour",
        description: nextRole === "admin"
          ? "L'utilisateur est maintenant administrateur."
          : "L'utilisateur est maintenant etudiant.",
        type: "success",
      });
    } catch (roleError) {
      console.error("[ManageUsers] Role toggle failed:", roleError);
      toaster.create({
        title: "Action echouee",
        description: "Impossible de mettre a jour ce compte.",
        type: "error",
      });
    } finally {
      setRoleLoading((current) => ({ ...current, [target.id]: false }));
    }
  };

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

  const sortUser = (a: UserSummary, b: UserSummary) => {
    const isCurrentA = a.id === currentUserId;
    const isCurrentB = b.id === currentUserId;
    if (isCurrentA !== isCurrentB) return isCurrentA ? -1 : 1;
    return a.email.localeCompare(b.email, "fr");
  };

  const activeUsers = [...users].filter((u) => !u.is_banned).sort(sortUser);
  const bannedUsers = [...users].filter((u) => u.is_banned).sort(sortUser);

  return (
    <Container maxWidth="5xl" py={8} px={{ base: 4, md: 6 }}>
      <VStack gap={6} alignItems="stretch">
        <Heading size="lg">Utilisateurs</Heading>

        <VStack gap={4} alignItems="stretch">
          <Heading size="md">Inviter un utilisateur</Heading>
          <Table.ScrollArea borderWidth="0" borderRadius="md">
            <form onSubmit={handleInvite}>
              <Table.Root size="sm" striped>
                <Table.ColumnGroup>
                  <Table.Column htmlWidth="40%" />
                  <Table.Column htmlWidth="35%" />
                  <Table.Column htmlWidth="15%" />
                  <Table.Column htmlWidth="10%" />
                </Table.ColumnGroup>
                <Table.Header>
                  <Table.Row bg="bg.subtle">
                    <Table.ColumnHeader paddingInlineStart={4} fontWeight="bold">
                      Email
                    </Table.ColumnHeader>
                    <Table.ColumnHeader paddingInlineStart={4} fontWeight="bold">
                      Nom
                    </Table.ColumnHeader>
                    <Table.ColumnHeader paddingInlineStart={4} textAlign="center" fontWeight="bold">
                      Admin
                    </Table.ColumnHeader>
                    <Table.ColumnHeader paddingInlineStart={4} textAlign="center" fontWeight="bold">
                      Actions
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  <Table.Row backgroundColor="bg.surface">
                    <Table.Cell paddingInlineStart={4}>
                      <Input
                        aria-label="Adresse e-mail"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="nom@exemple.fr"
                        paddingLeft={3}
                      />
                    </Table.Cell>
                    <Table.Cell paddingInlineStart={4}>
                      <Input
                        aria-label="Nom"
                        value={inviteName}
                        onChange={(event) => setInviteName(event.target.value)}
                        placeholder="Prenom Nom"
                        paddingLeft={3}
                      />
                    </Table.Cell>
                    <Table.Cell paddingInlineStart={4} textAlign="center">
                      <Checkbox.Root
                        checked={inviteIsAdmin}
                        onCheckedChange={(details: { checked: boolean | "indeterminate" }) =>
                          setInviteIsAdmin(details.checked === true)
                        }
                      >
                        <Checkbox.Control />
                      </Checkbox.Root>
                    </Table.Cell>
                    <Table.Cell paddingInlineStart={4} textAlign="center">
                      <Tooltip.Root openDelay={150}>
                        <Tooltip.Trigger asChild>
                          <IconButton
                            type="submit"
                            size="sm"
                            aria-label="Inviter un utilisateur"
                            colorPalette="blue"
                            loading={isInviting}
                            paddingInline={4}
                          >
                            Inviter
                          </IconButton>
                        </Tooltip.Trigger>
                        <Tooltip.Positioner>
                          <Tooltip.Content px={3} py={2}>
                            Inviter un utilisateur
                          </Tooltip.Content>
                        </Tooltip.Positioner>
                      </Tooltip.Root>
                    </Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table.Root>
            </form>
          </Table.ScrollArea>
          {inviteError && (
            <Text color="red.500" fontSize="sm">
              {inviteError}
            </Text>
          )}
        </VStack>

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

        <VStack gap={4} alignItems="stretch">
          <Heading size="md">Utilisateurs</Heading>
          {activeUsers.length === 0 && !error && (
            <Box padding={6} borderRadius="md" backgroundColor="bg.subtle">
              <Text color="fg.muted">Aucun utilisateur actif.</Text>
            </Box>
          )}
          {activeUsers.length > 0 && (
            <Table.ScrollArea borderWidth="1px" borderColor="border.muted" borderRadius="md">
              <Table.Root size="sm" variant="outline" striped>
                <Table.ColumnGroup>
                  <Table.Column htmlWidth="40%" />
                  <Table.Column htmlWidth="35%" />
                  <Table.Column htmlWidth="15%" />
                  <Table.Column htmlWidth="10%" />
                </Table.ColumnGroup>
                <Table.Header>
                  <Table.Row bg="bg.subtle">
                    <Table.ColumnHeader paddingInlineStart={4} fontWeight="bold">
                      Email
                    </Table.ColumnHeader>
                    <Table.ColumnHeader paddingInlineStart={4} fontWeight="bold">
                      Nom
                    </Table.ColumnHeader>
                    <Table.ColumnHeader paddingInlineStart={4} textAlign="center" fontWeight="bold">
                      Admin
                    </Table.ColumnHeader>
                    <Table.ColumnHeader paddingInlineStart={4} textAlign="center" fontWeight="bold">
                      Actions
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {activeUsers.map((userRow) => (
                    <Table.Row key={userRow.id}>
                      <Table.Cell paddingInlineStart={4}>{userRow.email}</Table.Cell>
                      <Table.Cell paddingInlineStart={4} fontWeight="medium">
                        {userRow.name}
                      </Table.Cell>
                      <Table.Cell paddingInlineStart={4} textAlign="center">
                        <Button
                          size="xs"
                          variant="ghost"
                          colorPalette={getRoleColor(userRow.role)}
                          loading={Boolean(roleLoading[userRow.id])}
                          onClick={() => handleToggleRole(userRow)}
                          disabled={userRow.id === currentUserId}
                        >
                          {getRoleLabel(userRow.role)}
                        </Button>
                      </Table.Cell>
                      <Table.Cell paddingInlineStart={4} textAlign="center">
                        {userRow.id === currentUserId ? null : (
                          <Tooltip.Root openDelay={150}>
                            <Tooltip.Trigger asChild>
                              <IconButton
                                size="xs"
                                variant="ghost"
                                color="status.ban"
                                loading={Boolean(banLoading[userRow.id])}
                                onClick={() => handleToggleBan(userRow)}
                                aria-label="Bannir"
                              >
                                <Ban size={14} />
                              </IconButton>
                            </Tooltip.Trigger>
                            <Tooltip.Positioner>
                              <Tooltip.Content px={3} py={2}>
                                Bannir
                              </Tooltip.Content>
                            </Tooltip.Positioner>
                          </Tooltip.Root>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
          )}
        </VStack>

        {bannedUsers.length > 0 && (
          <VStack gap={4} alignItems="stretch">
            <Heading size="sm">Désactivé(es)</Heading>
            <Table.ScrollArea borderWidth="1px" borderColor="border.muted" borderRadius="md">
              <Table.Root size="sm" variant="outline" striped>
                <Table.ColumnGroup>
                  <Table.Column htmlWidth="40%" />
                  <Table.Column htmlWidth="35%" />
                  <Table.Column htmlWidth="15%" />
                  <Table.Column htmlWidth="10%" />
                </Table.ColumnGroup>
                <Table.Header>
                  <Table.Row bg="bg.subtle">
                    <Table.ColumnHeader paddingInlineStart={4} fontWeight="bold">
                      Email
                    </Table.ColumnHeader>
                    <Table.ColumnHeader paddingInlineStart={4} fontWeight="bold">
                      Nom
                    </Table.ColumnHeader>
                    <Table.ColumnHeader paddingInlineStart={4} textAlign="center" fontWeight="bold">
                      Admin
                    </Table.ColumnHeader>
                    <Table.ColumnHeader paddingInlineStart={4} textAlign="center" fontWeight="bold">
                      Actions
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {bannedUsers.map((userRow) => (
                    <Table.Row key={userRow.id}>
                      <Table.Cell paddingInlineStart={4}>{userRow.email}</Table.Cell>
                      <Table.Cell paddingInlineStart={4} fontWeight="medium">
                        {userRow.name}
                      </Table.Cell>
                      <Table.Cell paddingInlineStart={4} textAlign="center">
                        <Button
                          size="xs"
                          variant="ghost"
                          colorPalette={getRoleColor(userRow.role)}
                          disabled
                        >
                          {getRoleLabel(userRow.role)}
                        </Button>
                      </Table.Cell>
                      <Table.Cell paddingInlineStart={4} textAlign="center">
                        <Tooltip.Root openDelay={150}>
                          <Tooltip.Trigger asChild>
                            <IconButton
                              size="xs"
                              variant="ghost"
                              color="status.activate"
                              loading={Boolean(banLoading[userRow.id])}
                              onClick={() => handleToggleBan(userRow)}
                              aria-label="Activer"
                            >
                              <Power size={14} />
                            </IconButton>
                          </Tooltip.Trigger>
                          <Tooltip.Positioner>
                            <Tooltip.Content px={3} py={2}>
                              Activer
                            </Tooltip.Content>
                          </Tooltip.Positioner>
                        </Tooltip.Root>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
          </VStack>
        )}
      </VStack>
    </Container>
  );
}
