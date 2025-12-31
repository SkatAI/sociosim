"use client";
import { ChakraProvider } from "@chakra-ui/react";
import { ColorModeProvider } from "@/components/ui/color-mode";
import { AuthProvider } from "@/hooks/useAuthUser";
import { system } from "@/lib/theme";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ColorModeProvider>
    </ChakraProvider>
  );
}
