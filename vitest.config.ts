import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts", "**/*.d.ts"],
    },
  },
});
