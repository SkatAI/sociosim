"use client";

import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

type PersonnaRightSidebarProps = {
  children?: ReactNode;
};

export default function PersonnaRightSidebar({ children }: PersonnaRightSidebarProps) {
  return (
    <Box
      width={{ base: "full", lg: "320px" }}
      minWidth={{ base: "full", lg: "320px" }}
      borderTop={{ base: "1px solid", lg: "none" }}
      borderLeft={{ base: "none", lg: "1px solid" }}
      borderLeftColor={{ base: "transparent", lg: "rgba(15, 23, 42, 0.08)" }}
      backgroundColor="bg.subtle"
      padding={{ base: 4, lg: 5 }}
      position={{ base: "relative", lg: "sticky" }}
      top={0}
      right={0}
      height={{ base: "auto", lg: "100vh" }}
      alignSelf={{ base: "stretch", lg: "flex-start" }}
      zIndex={10}
    >
      {children}
    </Box>
  );
}
