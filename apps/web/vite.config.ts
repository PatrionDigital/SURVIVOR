import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    // Polyfill for buffer - needed by some web3 dependencies (bn.js)
    global: "globalThis",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@game": path.resolve(__dirname, "./src/game"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@stores": path.resolve(__dirname, "./src/stores"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@types": path.resolve(__dirname, "./src/types"),
      "@designer": path.resolve(__dirname, "./src/designer"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        // Only include designer in development builds
        ...(mode === "development" && {
          designer: path.resolve(__dirname, "designer.html"),
        }),
      },
    },
  },
}));
