"use client";

import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

type PersonnaLayoutProps = {
  left: ReactNode;
  center: ReactNode;
  right?: ReactNode;
};

export default function PersonnaLayout({ left, center, right }: PersonnaLayoutProps) {
  return (
    <Box
      flex={1}
      height="100%"
      backgroundColor="bg.surface"
      overflow="hidden"
      css={{
        "--personna-left-sidebar-width": "280px",
        "--personna-right-sidebar-width": "320px",
        "--personna-left-offset": "180px",
        "--personna-right-offset": "180px",
        outline: "2px dashed rgba(0, 128, 255, 0.5)",
        outlineOffset: "-2px",
      }}
    >
      {left}
      <Box
        display="flex"
        flexDirection={{ base: "column", lg: "row" }}
        height="100%"
        paddingLeft={{ base: 0, lg: "var(--personna-left-offset)" }}
        paddingRight={{ base: 0, lg: "var(--personna-right-offset)" }}
      >
        <Box flex="1" minHeight={0} overflow="hidden">
          {center}
        </Box>
        {right}
      </Box>
    </Box>
  );
}
