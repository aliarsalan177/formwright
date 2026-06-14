import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  // Relative base so the build works under any GitHub Pages project subpath
  // (e.g. https://<user>.github.io/formwright/).
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: {
        main: `${root}index.html`,
        builder: `${root}builder.html`,
        settings: `${root}settings.html`,
      },
    },
  },
});
