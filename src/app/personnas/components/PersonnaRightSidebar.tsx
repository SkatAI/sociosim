"use client";

import { Box, Heading, VStack } from "@chakra-ui/react";
import type { ReactNode } from "react";

type PersonnaRightSidebarProps = {
  children?: ReactNode;
};

export default function PersonnaRightSidebar({ children }: PersonnaRightSidebarProps) {
  return (
    <Box
      width={{ base: "full", lg: "var(--personna-right-width)" }}
      minWidth={{ base: "full", lg: "var(--personna-right-width)" }}
      borderTop={{ base: "1px solid", lg: "none" }}
      borderLeft={{ base: "none", lg: "1px solid" }}
      borderLeftColor={{ base: "transparent", lg: "rgba(15, 23, 42, 0.08)" }}
      backgroundColor="bg.subtle"
      padding={{ base: 4, lg: 5 }}
      position={{ base: "relative", lg: "fixed" }}
      top={{ base: 0, lg: "var(--app-header-height)" }}
      right={0}
      height={{ base: "auto", lg: "calc(100vh - var(--app-header-height))" }}
      overflowY={{ base: "visible", lg: "auto" }}
      alignSelf={{ base: "stretch", lg: "flex-start" }}
      zIndex={10}
    >
      <VStack align="stretch" gap={4}>
        <VStack align="stretch" gap={1}>
          <Heading size="md">Validation du prompt</Heading>
        </VStack>
        {children}
      </VStack>
    </Box>
  );
}
