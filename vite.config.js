import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        const isReactRouterClientDirective =
          warning.code === "MODULE_LEVEL_DIRECTIVE" &&
          typeof warning.id === "string" &&
          warning.id.includes("react-router/dist/development");
        if (isReactRouterClientDirective) {
          return;
        }
        defaultHandler(warning);
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
  envPrefix: "VITE_",
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
