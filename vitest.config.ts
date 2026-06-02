import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mismo alias que vite.config.js, para que los tests puedan usar imports "@/...".
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Incluye también *.test.tsx (tests de componentes), antes solo *.test.ts.
    include: ["src/**/*.test.{ts,tsx}"],
    reporters: ["default"],
  },
});
