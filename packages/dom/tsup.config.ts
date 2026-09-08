import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // The `.css` loader below only runs for files esbuild actually loads,
  // and a dependency is external by default — so the flag stylesheet was
  // left as a bare `import x from "…/flags.css"` in dist, which every
  // consumer bundler rejects (CSS has no default export). Bundling just
  // this package inlines the stylesheet as the string the code expects.
  noExternal: ["country-flag-icons"],
  esbuildOptions(options) {
    options.loader = {
      ...options.loader,
      ".css": "text",
    };
  },
});
