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
      display="flex"
      flexDirection={{ base: "column", lg: "row" }}
      backgroundColor="bg.surface"
      overflow="hidden"
    >
      {left}
      <Box flex="1" minHeight={0} overflow="hidden">
        {center}
      </Box>
      {right}
    </Box>
  );
}
