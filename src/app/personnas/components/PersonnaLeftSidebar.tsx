"use client";

import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import type { ReactNode } from "react";

type PersonnaLeftSidebarProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export default function PersonnaLeftSidebar({
  title,
  subtitle,
  children,
}: PersonnaLeftSidebarProps) {
  return (
    <Box
      width={{ base: "full", lg: "280px" }}
      minWidth={{ base: "full", lg: "280px" }}
      borderBottom={{ base: "1px solid", lg: "none" }}
      borderRight={{ base: "none", lg: "1px solid" }}
      borderRightColor={{ base: "transparent", lg: "rgba(15, 23, 42, 0.08)" }}
      backgroundColor="bg.subtle"
      padding={{ base: 4, lg: 5 }}
      position={{ base: "relative", lg: "sticky" }}
      top={0}
      left={0}
      height={{ base: "auto", lg: "100vh" }}
      alignSelf={{ base: "stretch", lg: "flex-start" }}
      zIndex={10}
    >
      <VStack align="stretch" gap={4}>
        <VStack align="stretch" gap={1}>
          <Heading size="md">{title}</Heading>
          {subtitle ? (
            <Text color="fg.muted" fontSize="sm">
              {subtitle}
            </Text>
          ) : null}
        </VStack>
        {children}
      </VStack>
    </Box>
  );
}
