import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // React rarely changes, so keep it in its own long-cached chunk. Other vendors stay with
        // the code that uses them: a catch-all vendor chunk would pull lazy-only deps (firebase, zod...) into the first load.
        manualChunks(id) {
          if (/\/node_modules\/(\.pnpm\/[^/]+\/node_modules\/)?(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
            return "react";
          }
        },
      },
    },
  },
});
