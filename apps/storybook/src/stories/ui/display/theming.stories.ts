import type { Meta, StoryObj } from "@storybook/html";
import {
  createTheme,
  presets,
  resolveTheme,
  themeToCss,
  type Theme,
  type ThemeMode,
  type ThemeOptions,
} from "@formwright/ui/theme";
import { canvas, type StoryHost } from "../../../ui/story";

/** What each `--fw-*` token that createTheme() writes is for. */
const USES: Record<string, string> = {
  "--fw-accent": "Brand colour: primary buttons, checked controls, selection, focus ring",
  "--fw-accent-hover": "Accent on hover",
  "--fw-accent-contrast": "Text on the accent",
  "--fw-accent-soft": "Faint accent wash: selected rows, highlighted options",
  "--fw-surface": "Background of fields, cards, menus and dialogs",
  "--fw-surface-2": "Subtle fill: hover rows, disabled fields",
  "--fw-text": "Main text",
  "--fw-muted": "Secondary text, icons, placeholders",
  "--fw-border": "Borders of fields and cards",
  "--fw-danger": "Errors, destructive actions, danger tone",
  "--fw-success": "Success tone",
  "--fw-warning": "Warning tone",
  "--fw-info": "Info tone",
  "--fw-danger-contrast": "Text on a solid danger fill",
  "--fw-success-contrast": "Text on a solid success fill",
  "--fw-warning-contrast": "Text on a solid warning fill",
  "--fw-info-contrast": "Text on a solid info fill",
  "--fw-backdrop": "Dimmed page behind dialogs, drawers, command palette",
  "--fw-tooltip-background": "Tooltip background",
  "--fw-tooltip-color": "Tooltip text",
  "--fw-radius": "Corner radius of controls and cards",
  "--fw-radius-sm": "Smaller radius: tags, badges, menu items",
  "--fw-font-size": "Base text size of controls",
  "--fw-control-height-sm": 'Height of size="sm" controls',
  "--fw-control-height-md": "Height of default controls",
  "--fw-control-height-lg": 'Height of size="lg" controls',
  "--fw-shadow": "Elevation of menus, popovers, dialogs, elevated cards",
  "--fw-duration": "Transition length",
  "--fw-overlay-z": "Stacking of non-top-layer overlays",
  "--fw-toast-z": "Stacking of the toast region",
};

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const isColor = (name: string) => !/radius|size|height|shadow|duration|-z$/.test(name);

/** A value cell: the raw value, with a swatch when it is a colour. */
const valueCell = (name: string, value: string) =>
  `<td class="sb-theme-value">${
    isColor(name) ? `<span class="sb-theme-swatch" style="background:${escape(value)}"></span>` : ""
  }<code>${escape(value)}</code></td>`;

/** Styles for these stories' own chrome, drawn from the theme tokens. */
const CHROME = /* html */ `
<style>
  .sb-theme-table { border-collapse: collapse; width: 100%; font-size: 13px; }
  .sb-theme-table th { text-align: start; font-weight: 600; padding: 8px; border-bottom: 1px solid var(--fw-border); }
  .sb-theme-table td { padding: 6px 8px; vertical-align: top; border-bottom: 1px solid color-mix(in srgb, var(--fw-border) 55%, transparent); }
  .sb-theme-table td:first-child { white-space: nowrap; }
  .sb-theme-table td:last-child { color: var(--fw-muted); min-width: 12rem; }
  .sb-theme-value { min-width: 11rem; max-width: 15rem; }
  .sb-theme-value code { font-size: 12px; overflow-wrap: anywhere; }
  .sb-theme-swatch {
    display: inline-block; width: 12px; height: 12px; margin-inline-end: 6px; vertical-align: -1px;
    border-radius: 3px; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--fw-text) 20%, transparent);
  }
  .sb-theme-code {
    margin: 0; padding: 12px; border-radius: 8px; font-size: 12px; line-height: 1.5;
    white-space: pre-wrap; overflow-wrap: anywhere;
    background: var(--fw-surface-2); color: var(--fw-text);
  }
  .sb-theme-panel {
    display: grid; gap: 12px; align-content: start; padding: 20px;
    border-radius: 12px; border: 1px solid var(--fw-border);
    background: var(--fw-surface); color: var(--fw-text); font-family: var(--fw-font, inherit);
  }
  .sb-theme-panel > strong { font-size: 15px; }
  .sb-theme-controls { display: flex; flex-wrap: wrap; align-items: end; gap: 12px 24px; }
  .sb-theme-control { display: grid; gap: 6px; font-size: 13px; font-weight: 500; }
  .sb-theme-control .sb-ui-row { gap: 6px; }
  .sb-theme-control input[type="color"] {
    width: 3rem; height: 2rem; padding: 2px; border: 1px solid var(--fw-border);
    border-radius: 6px; background: var(--fw-surface); cursor: pointer;
  }
</style>`;

/** The same handful of components, rendered inside each themed area. */
const SAMPLE = /* html */ `
  <div class="sb-ui-row">
    <fw-button>Renew</fw-button>
    <fw-button variant="secondary">Details</fw-button>
    <fw-badge tone="accent">Gold</fw-badge>
    <fw-badge tone="success" dot>Active</fw-badge>
  </div>
  <fw-input label="Member name" value="Sara Khan"></fw-input>
  <fw-select label="Plan" value="gold">
    <fw-option value="basic">Basic — PKR 3,500</fw-option>
    <fw-option value="gold">Gold — PKR 12,000</fw-option>
    <fw-option value="platinum">Platinum — PKR 20,000</fw-option>
  </fw-select>
  <fw-switch checked>SMS payment reminders</fw-switch>
  <fw-progress label="Sessions used" value="7" max="12" show-value></fw-progress>
  <fw-alert tone="warning" heading="Expires in 3 days">Gold plan ends 20 September.</fw-alert>`;

/**
 * Run `fn` once `el` is in the document, so createTheme() adopts its
 * stylesheet into the page (a story's canvas is built before it is inserted).
 */
function whenConnected(el: HTMLElement, fn: () => void): void {
  let frames = 0;
  const tick = () => {
    if (el.isConnected) fn();
    else if (frames++ < 120) requestAnimationFrame(tick);
  };
  tick();
}

const meta: Meta = {
  title: "UI/Overview/Theming",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Every `@formwright/ui` component reads its colours, radius, sizes, shadow and timing from `--fw-*` custom properties, which inherit through shadow roots. `createTheme()` from `@formwright/ui/theme` writes them for you — one stylesheet holding a light palette, a dark palette and a `prefers-color-scheme` block — and returns a handle: `update()` merges new options, `setMode()` switches between `light`, `dark` and `system`, `dispose()` removes it.",
          "",
          "```ts",
          'import { createTheme, presets, themeToCss } from "@formwright/ui/theme";',
          "",
          'const theme = createTheme({ accent: "#0f766e", radius: "lg", mode: "system" });',
          'theme.update({ accent: "#e11d48" }); // every component restyles at once',
          'theme.setMode("dark");',
          "",
          "// Theme one area only; a scoped theme wins over the page theme.",
          'createTheme({ ...presets.ocean, mode: "dark" }, { target: sidebar });',
          "",
          "// The same CSS as a string, to inline in a server-rendered <head>.",
          'const css = themeToCss(presets.forest); // then <html data-fw-mode="system">',
          "```",
          "",
          "Colours you leave out are derived: hover, soft and contrast shades follow the accent, neutrals are mixed from `surface` and `text`, and dark mode keeps your accent. Presets: `default`, `ocean`, `forest`, `rose`, `mono`.",
          "",
          "In this Storybook, the **UI theme** toolbar menu (paintbrush icon) calls `createTheme()` on the whole document, so every story can be checked in Light, Dark, System, Ocean, Ocean dark, Forest, Rose and Mono.",
        ].join("\n"),
      },
    },
  },
};
export default meta;

type Story = StoryObj;

export const Tokens: Story = {
  name: "Design tokens",
  render: () => {
    const { light, dark } = resolveTheme();
    const rows = (Object.keys(light) as Array<keyof typeof light>)
      .map(
        (name) =>
          `<tr><td><code>${name}</code></td>${valueCell(name, light[name] ?? "")}${valueCell(
            name,
            dark[name] ?? "",
          )}<td>${USES[name] ?? ""}</td></tr>`,
      )
      .join("");
    return canvas(
      `${CHROME}
      <div style="overflow-x:auto">
        <table class="sb-theme-table">
          <thead><tr><th>Property</th><th>Light</th><th>Dark</th><th>Used for</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <pre class="sb-theme-code">/* Tokens can also be set by hand, on :root or on any wrapper. */
:root { --fw-accent: #0d9488; --fw-radius: 0.25rem; }

/* Beyond tokens, components expose parts. */
fw-select::part(listbox) { max-height: 20rem; }</pre>`,
      {
        width: "60rem",
        note: "What <code>createTheme()</code> writes with no options, from <code>resolveTheme()</code>. The <code>font</code> and <code>focusRing</code> options add <code>--fw-font</code> and <code>--fw-focus-ring</code>. Some components read their own too, e.g. <code>--fw-avatar-background</code>, <code>--fw-divider-spacing</code>, <code>--fw-drawer-size</code>, <code>--fw-toast-width</code>.",
      },
    );
  },
};

const AREAS: ReadonlyArray<{ title: string; options: ThemeOptions; code: string }> = [
  {
    title: "Default",
    options: { mode: "light" },
    code: `createTheme({ mode: "light" }, { target })`,
  },
  {
    title: "Custom brand",
    options: {
      accent: "#0f766e",
      radius: "sm",
      font: "Georgia, serif",
      colors: { text: "#0f172a", border: "#94a3b8" },
      mode: "light",
    },
    code: `createTheme({
  accent: "#0f766e",
  radius: "sm",
  font: "Georgia, serif",
  colors: { text: "#0f172a", border: "#94a3b8" },
  mode: "light",
}, { target })`,
  },
  {
    title: "Dark",
    options: { radius: "lg", mode: "dark" },
    code: `createTheme({ radius: "lg", mode: "dark" }, { target })`,
  },
];

export const SideBySide: Story = {
  name: "Default, brand & dark",
  render: () => {
    const host = canvas(
      `${CHROME}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(17rem,1fr));gap:16px">
        ${AREAS.map(
          (area, i) => `
          <section class="sb-theme-panel" data-area="${i}">
            <strong>${area.title}</strong>
            ${SAMPLE}
            <pre class="sb-theme-code">${escape(area.code)}</pre>
          </section>`,
        ).join("")}
      </div>`,
      {
        width: "64rem",
        note: "The same components three times. Each panel is its own <code>createTheme(options, { target })</code>, so it keeps its look whatever the UI theme toolbar is set to.",
      },
    );
    const themes: Theme[] = [];
    whenConnected(host, () => {
      host.querySelectorAll<HTMLElement>("[data-area]").forEach((section) => {
        const area = AREAS[Number(section.dataset["area"])];
        if (area) themes.push(createTheme(area.options, { target: section }));
      });
    });
    host.__storyDispose = () => themes.forEach((theme) => theme.dispose());
    return host;
  },
};

const PRESETS = Object.keys(presets) as Array<keyof typeof presets>;
const RADII = ["none", "sm", "md", "lg", "full"] as const;
const MODES: ThemeMode[] = ["light", "dark", "system"];

const choices = (group: string, label: string, values: readonly string[]) => `
  <div class="sb-theme-control">${label}
    <div class="sb-ui-row" data-group="${group}">
      ${values.map((v) => `<fw-button size="sm" variant="secondary" data-value="${v}">${v}</fw-button>`).join("")}
    </div>
  </div>`;

export const Live: Story = {
  name: "Live theme",
  render: () => {
    const host: StoryHost = canvas(
      `${CHROME}
      <div class="sb-theme-controls">
        ${choices("preset", "Preset", PRESETS)}
        <label class="sb-theme-control">Accent <input type="color" value="#7c3aed" data-accent></label>
        ${choices("mode", "Mode", MODES)}
        ${choices("radius", "Radius", RADII)}
      </div>
      <section class="sb-theme-panel" data-live>${SAMPLE}</section>
      <pre class="sb-theme-code" data-code></pre>
      <details>
        <summary style="cursor:pointer;font-size:13px;color:var(--fw-muted)">themeToCss() for these options</summary>
        <pre class="sb-theme-code" data-css style="margin-top:8px;max-height:20rem;overflow:auto"></pre>
      </details>`,
      {
        width: "48rem",
        note: "One scoped theme changed in place: the accent and radius go through <code>theme.update()</code>, the mode through <code>theme.setMode()</code>. A preset is a whole set of options, so picking one replaces the theme.",
      },
    );

    const panel = host.querySelector<HTMLElement>("[data-live]")!;
    const code = host.querySelector<HTMLElement>("[data-code]")!;
    const cssOut = host.querySelector<HTMLElement>("[data-css]")!;
    const accentInput = host.querySelector<HTMLInputElement>("[data-accent]")!;
    let theme: Theme | undefined;
    let preset: keyof typeof presets = "default";
    let accent: string | undefined;
    let radius: string | undefined;
    let mode: ThemeMode = "light";

    const options = (): ThemeOptions => ({
      ...presets[preset],
      ...(accent ? { accent } : {}),
      ...(radius ? { radius } : {}),
      mode,
    });

    const render = () => {
      const opts = options();
      const args = [
        preset !== "default" ? `...presets.${preset}` : "",
        accent ? `accent: "${accent}"` : "",
        radius ? `radius: "${radius}"` : "",
        `mode: "${mode}"`,
      ].filter(Boolean);
      code.textContent = `const theme = createTheme({ ${args.join(", ")} }, { target: panel });`;
      cssOut.textContent = themeToCss(opts, "#panel");
      accentInput.value = accent ?? opts.accent ?? "#7c3aed";
      const selected: Record<string, string> = {
        preset,
        mode,
        radius: radius ?? String(opts.radius ?? "md"),
      };
      host.querySelectorAll<HTMLElement>("[data-group]").forEach((group) => {
        group.querySelectorAll<HTMLElement>("fw-button").forEach((button) => {
          const on = button.dataset["value"] === selected[group.dataset["group"]!];
          button.setAttribute("aria-pressed", String(on));
          button.setAttribute("variant", on ? "primary" : "secondary");
        });
      });
    };

    const onClick = (event: Event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>("fw-button[data-value]");
      const group = button?.parentElement?.dataset["group"];
      const value = button?.dataset["value"];
      if (!group || !value) return;
      if (group === "mode") {
        mode = value as ThemeMode;
        theme?.setMode(mode);
      } else if (group === "radius") {
        radius = value;
        theme?.update({ radius });
      } else {
        preset = value as keyof typeof presets;
        accent = undefined;
        radius = undefined;
        theme?.dispose();
        theme = createTheme(options(), { target: panel });
      }
      render();
    };
    const onAccent = () => {
      accent = accentInput.value;
      theme?.update({ accent });
      render();
    };
    host.addEventListener("click", onClick);
    accentInput.addEventListener("input", onAccent);

    render();
    whenConnected(host, () => {
      theme = createTheme(options(), { target: panel });
    });
    host.__storyDispose = () => {
      host.removeEventListener("click", onClick);
      accentInput.removeEventListener("input", onAccent);
      theme?.dispose();
    };
    return host;
  },
};
