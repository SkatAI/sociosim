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
      css={{ "--personna-left-width": "280px" }}
    >
      {left}
      <Box
        display="flex"
        flexDirection={{ base: "column", lg: "row" }}
        height="100%"
        paddingLeft={{ base: 0, lg: "var(--personna-left-width)" }}
      >
        <Box flex="1" minHeight={0} overflow="hidden">
          {center}
        </Box>
        {right}
      </Box>
    </Box>
  );
}
