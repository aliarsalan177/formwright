import type { StorybookConfig } from "@storybook/html-vite";
import { mergeConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/stories/**/*.mdx", "../src/stories/**/*.stories.@(ts|js)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-links"],
  framework: { name: "@storybook/html-vite", options: {} },
  docs: { autodocs: "tag" },
  staticDirs: [{ from: path.join(dir, "../../playground"), to: "/playground" }],
  async viteFinal(config) {
    const base = process.env.STORYBOOK_BASE ?? config.base ?? "/";
    return mergeConfig(config, {
      base,
      resolve: {
        alias: [
          { find: "@playground", replacement: path.join(dir, "../../playground/src") },
          // Stories run against the component source, so styling changes show
          // up on reload without rebuilding the package.
          {
            find: /^@formwright\/ui$/,
            replacement: path.join(dir, "../../../packages/ui/src/index.ts"),
          },
          {
            find: /^@formwright\/ui\/(.+)$/,
            replacement: path.join(dir, "../../../packages/ui/src/$1/index.ts"),
          },
        ],
      },
    });
  },
};

export default config;
