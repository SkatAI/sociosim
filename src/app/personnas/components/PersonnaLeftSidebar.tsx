"use client";

import { Box, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import type { ReactNode } from "react";

type PersonnaLeftSidebarProps = {
  title: string;
  titleColor?: string;
  titleRight?: ReactNode;
  subtitle?: string;
  children?: ReactNode;
};

export default function PersonnaLeftSidebar({
  title,
  titleColor,
  titleRight,
  subtitle,
  children,
}: PersonnaLeftSidebarProps) {
  return (
    <Box
      width={{ base: "full", lg: "var(--personna-left-sidebar-width)" }}
      minWidth={{ base: "full", lg: "var(--personna-left-sidebar-width)" }}
      borderBottom={{ base: "1px solid", lg: "none" }}
      borderRight={{ base: "none", lg: "1px solid" }}
      borderRightColor={{ base: "transparent", lg: "rgba(15, 23, 42, 0.08)" }}
      backgroundColor="bg.subtle"
      padding={{ base: 4, lg: 5 }}
      position={{ base: "relative", lg: "fixed" }}
      top={{ base: 0, lg: "var(--app-header-height)" }}
      left={0}
      height={{ base: "auto", lg: "calc(100vh - var(--app-header-height))" }}
      overflowY={{ base: "visible", lg: "auto" }}
      alignSelf={{ base: "stretch", lg: "flex-start" }}
      zIndex={10}
    >
      <VStack align="stretch" gap={4}>
        <VStack align="stretch" gap={1}>
          <HStack justify="space-between" align="center">
            <Heading size="xl" color={titleColor}>{title}</Heading>
            {titleRight}
          </HStack>
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
