import { defineConfig } from "tsup";

export default defineConfig({
  // Two entries: the runtime, and the leak harness — kept apart so a
  // test-only tool can never be pulled into a production bundle.
  entry: ["src/index.ts", "src/testing.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
