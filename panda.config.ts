import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  // Enable Panda's preflight styles so styles.css is generated
  preflight: true,

  // Where to look for your css declarations
  presets: ["@pandacss/preset-base", "@pandacss/preset-panda"],
  include: ["./src/app/**/*.{ts,tsx}"],

  // Files to exclude
  exclude: [],

  // Useful for theme customization
  theme: {
    extend: {},
  },

  // The output directory for your css system
  outdir: "styled-system",
});
