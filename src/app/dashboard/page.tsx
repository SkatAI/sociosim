import { Suspense } from "react";
import { Box, Container, Spinner, Text, VStack } from "@chakra-ui/react";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <Container maxWidth="4xl" height="100vh" display="flex" alignItems="center" justifyContent="center">
          <VStack gap={4}>
            <Spinner size="lg" color="blue.500" />
            <Text color="fg.muted">Chargement de vos entretiens...</Text>
          </VStack>
        </Container>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
