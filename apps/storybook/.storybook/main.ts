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
    return mergeConfig(config, {
      resolve: {
        alias: {
          "@playground": path.join(dir, "../../playground/src"),
        },
      },
    });
  },
};

export default config;
