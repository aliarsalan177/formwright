import { defineConfig } from "tsup";

export default defineConfig({
  // One entry per component, so `import "@formwright/ui/select"` ships the
  // select and nothing else. Shared code lands in common chunks instead of
  // being copied into each entry.
  entry: ["src/index.ts", "src/core/index.ts", "src/*/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: true,
});
