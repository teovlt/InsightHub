import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    maxConcurrency: 1,
    fileParallelism: false,
    globalSetup: "./tests/globalSetup.js",
    setupFiles: "./vitest.setup.ts",
    coverage: {
      exclude: ["index.js", "vitest.config.ts", "**/uploads/**"],
    },
  },
});
