import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  test: {
    include: ["test/**/*.{test,spec}.{ts,tsx}"],
  },
  root: "webview",
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../out/webview",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/index.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
