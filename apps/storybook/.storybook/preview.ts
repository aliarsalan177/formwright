import type { Decorator } from "@storybook/html";
import { createTheme, presets, type Theme, type ThemeOptions } from "@formwright/ui/theme";
import "@playground/styles.css";
import "@playground/grid.css";
import "@playground/forge.css";
import "@playground/builder.css";
import "@playground/settings.css";
import "../src/storybook.css";

let lastDispose: (() => void) | undefined;

/** The toolbar's theme choices for the UI components. */
const THEMES: Record<string, ThemeOptions> = {
  light: { mode: "light" },
  dark: { mode: "dark" },
  system: { mode: "system" },
  ocean: { ...presets.ocean, mode: "light" },
  "ocean-dark": { ...presets.ocean, mode: "dark" },
  forest: { ...presets.forest, mode: "light" },
  rose: { ...presets.rose, mode: "light" },
  mono: { ...presets.mono, mode: "light" },
};
let theme: Theme | undefined;
let themeName = "";

export const globalTypes = {
  fwTheme: {
    description: "Theme for @formwright/ui components",
    toolbar: {
      title: "UI theme",
      icon: "paintbrush",
      items: [
        { value: "light", title: "Light" },
        { value: "dark", title: "Dark" },
        { value: "system", title: "System" },
        { value: "ocean", title: "Ocean" },
        { value: "ocean-dark", title: "Ocean dark" },
        { value: "forest", title: "Forest" },
        { value: "rose", title: "Rose" },
        { value: "mono", title: "Mono" },
      ],
      dynamicTitle: true,
    },
  },
};
export const initialGlobals = { fwTheme: "light" };

export const decorators: Decorator[] = [
  (storyFn, context) => {
    const name = String(context.globals["fwTheme"] ?? "light");
    if (name !== themeName) {
      themeName = name;
      // Replaced rather than updated, so no option from the last preset lingers.
      theme?.dispose();
      theme = createTheme(THEMES[name] ?? THEMES["light"]);
    }
    // A docs page renders every story of a component at once, so disposing
    // the previous story there would empty all but the last one. Only the
    // single-story canvas swaps one story for the next.
    const single = context.viewMode === "story";
    if (single) {
      lastDispose?.();
      lastDispose = undefined;
    }
    const el = storyFn();
    const node = el instanceof HTMLElement ? el : document.createElement("div");
    if (!(el instanceof HTMLElement)) node.appendChild(el as Node);
    if (single)
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
        "UI",
        ["Overview", "Form Controls", "Inputs", "Overlays", "Navigation", "Display"],
        "Gridwright",
        ["Live", "Pagination", "Master Detail", "Grouping", "Your Data"],
        "Apps",
        ["Playground", "Forge", "Theme Builder", "Settings Builder"],
      ],
    },
  },
};
