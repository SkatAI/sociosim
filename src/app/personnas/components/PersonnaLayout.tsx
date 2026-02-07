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
        "--personna-sidebar-gap": "30px",
        "--personna-left-sidebar-width": "250px",
        "--personna-right-sidebar-width": "250px",
        "--personna-left-offset": "calc(var(--personna-left-sidebar-width) + var(--personna-sidebar-gap))",
        "--personna-right-offset": "calc(var(--personna-right-sidebar-width) + var(--personna-sidebar-gap))",
      }}
    >
      {left}
      <Box
        display="flex"
        flexDirection={{ base: "column", lg: "row" }}
        height="100%"
        minHeight={0}
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
