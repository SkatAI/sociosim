import { Suspense } from "react";
import { Container, Spinner, Text, VStack } from "@chakra-ui/react";
import ManageUsersClient from "./ManageUsersClient";

export const dynamic = "force-dynamic";

export default function ManageUsersPage() {
  return (
    <Suspense
      fallback={
        <Container maxWidth="5xl" height="100vh" display="flex" alignItems="center" justifyContent="center">
          <VStack gap={4}>
            <Spinner size="lg" color="blue.500" />
            <Text color="fg.muted">Chargement des utilisateurs...</Text>
          </VStack>
        </Container>
      }
    >
      <ManageUsersClient />
    </Suspense>
  );
}
