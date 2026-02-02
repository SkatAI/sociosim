"use client";

import { IconButton, Tooltip, type IconButtonProps } from "@chakra-ui/react";
import { Moon, Sun } from "lucide-react";
import { ThemeProvider, useTheme } from "next-themes";
import { useMemo } from "react";

export type ColorModeProviderProps = React.ComponentProps<typeof ThemeProvider>;

export function ColorModeProvider({ children, ...props }: ColorModeProviderProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem {...props}>
      {children}
    </ThemeProvider>
  );
}

export function useColorMode() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const colorMode = (theme === "system" ? resolvedTheme : theme) as
    | "light"
    | "dark"
    | undefined;

  const toggleColorMode = () => {
    setTheme(colorMode === "dark" ? "light" : "dark");
  };

  return {
    colorMode: colorMode ?? "light",
    setColorMode: setTheme,
    toggleColorMode,
  };
}

export function useColorModeValue<T>(light: T, dark: T) {
  const { colorMode } = useColorMode();
  return useMemo(() => (colorMode === "dark" ? dark : light), [colorMode, dark, light]);
}

export function ColorModeButton(props: Omit<IconButtonProps, "aria-label">) {
  const { colorMode, toggleColorMode } = useColorMode();
  const isClient = typeof window !== "undefined";

  return (
    <Tooltip.Root openDelay={150}>
      <Tooltip.Trigger asChild>
        <IconButton
          aria-label="Basculer le theme"
          variant="ghost"
          size="sm"
          onClick={toggleColorMode}
          {...props}
        >
          {isClient && colorMode === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </IconButton>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content px={3} py={2}>
          Basculer le theme
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  );
}
