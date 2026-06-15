import type { Decorator } from "@storybook/html";
import "@playground/styles.css";
import "@playground/grid.css";
import "@playground/forge.css";
import "@playground/builder.css";
import "@playground/settings.css";
import "../src/storybook.css";

let lastDispose: (() => void) | undefined;

export const decorators: Decorator[] = [
  (storyFn) => {
    lastDispose?.();
    lastDispose = undefined;
    const el = storyFn();
    const node = el instanceof HTMLElement ? el : document.createElement("div");
    if (!(el instanceof HTMLElement)) node.appendChild(el as Node);
    lastDispose = (node as HTMLElement & { __storyDispose?: () => void }).__storyDispose;
    return node;
  },
];

export const parameters = {
  layout: "fullscreen",
  controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  options: {
    storySort: {
      order: [
        "Overview",
        "Formwright",
        ["Forms", "Wizard UX", "Widgets"],
        "Gridwright",
        ["Live", "Pagination", "Master Detail", "Grouping", "Your Data"],
        "Apps",
        ["Playground", "Forge", "Theme Builder", "Settings Builder"],
      ],
    },
  },
};
