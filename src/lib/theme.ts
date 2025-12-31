"use client";

import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const customConfig = defineConfig({
  theme: {
    semanticTokens: {
      colors: {
        "bg.canvas": { value: { base: "#f4f6fb", _dark: "#0b1020" } },
        "bg.surface": { value: { base: "#ffffff", _dark: "#0f172a" } },
        "bg.subtle": { value: { base: "#f8fafc", _dark: "#111827" } },
        "fg.default": { value: { base: "#0f172a", _dark: "#e2e8f0" } },
        "fg.muted": { value: { base: "#475467", _dark: "#cbd5e1" } },
        "fg.subtle": { value: { base: "#667085", _dark: "#94a3b8" } },
        "border.muted": { value: { base: "#e2e8f0", _dark: "#1f2937" } },
        "accent.primary": { value: { base: "#2563eb", _dark: "#60a5fa" } },
      },
    },
  },
  globalCss: {
    "html, body": {
      bg: "bg.canvas",
      color: "fg.default",
    },
  },
});

export const system = createSystem(defaultConfig, customConfig);
