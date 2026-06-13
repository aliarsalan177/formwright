import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the build works under any GitHub Pages project subpath
  // (e.g. https://<user>.github.io/formwright/).
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
