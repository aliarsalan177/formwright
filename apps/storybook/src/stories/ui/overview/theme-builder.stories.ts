import type { Meta, StoryObj } from "@storybook/html";
import {
  createTheme,
  presets,
  type Density,
  type RadiusScale,
  type ShadowScale,
  type ThemeMode,
  type ThemeOptions,
} from "@formwright/ui/theme";
import { canvas } from "../../../ui/story";

const meta: Meta = {
  title: "UI/Overview/Theme builder",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          'Build a theme for every `fw-` component and copy the result. The preview uses `createTheme` scoped to the preview area, so it ignores the toolbar theme. `import { createTheme } from "@formwright/ui/theme";`',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

const PREVIEW = `
  <div class="tb-preview-grid">
    <fw-card variant="outline">
      <span slot="header"><strong>New member</strong></span>
      <div class="tb-stack">
        <fw-input label="Full name" placeholder="Sara Khan" required></fw-input>
        <fw-select label="Plan" placeholder="Choose a plan">
          <fw-option value="monthly">Monthly · PKR 6,000</fw-option>
          <fw-option value="quarterly">Quarterly · PKR 16,500</fw-option>
          <fw-option value="yearly">Yearly · PKR 60,000</fw-option>
        </fw-select>
        <fw-date-picker label="Start date"></fw-date-picker>
        <fw-checkbox checked>Send a welcome message</fw-checkbox>
        <fw-switch checked>Auto-renew</fw-switch>
      </div>
      <div slot="footer" class="tb-row">
        <fw-button variant="ghost">Cancel</fw-button>
        <fw-button>Save member</fw-button>
      </div>
    </fw-card>
    <div class="tb-stack">
      <fw-tabs value="overview">
        <fw-tab slot="nav" panel="overview">Overview</fw-tab>
        <fw-tab slot="nav" panel="payments">Payments</fw-tab>
        <fw-tab slot="nav" panel="attendance">Attendance</fw-tab>
        <fw-tab-panel name="overview">
          <div class="tb-row">
            <fw-avatar name="Sara Khan" status="online"></fw-avatar>
            <div>
              <strong>Sara Khan</strong>
              <div class="tb-muted">Member since March 2026</div>
            </div>
            <fw-badge tone="success" variant="soft" dot>Active</fw-badge>
          </div>
        </fw-tab-panel>
        <fw-tab-panel name="payments">Last payment PKR 6,000 on 1 Sept.</fw-tab-panel>
        <fw-tab-panel name="attendance">14 visits this month.</fw-tab-panel>
      </fw-tabs>
      <fw-alert tone="warning" heading="Membership ends in 5 days">
        Remind Sara to renew before 22 September.
      </fw-alert>
      <fw-progress value="68" show-value label="Monthly visits goal"></fw-progress>
      <div class="tb-row">
        <fw-badge tone="accent">Trainer</fw-badge>
        <fw-badge tone="danger" variant="solid">Overdue</fw-badge>
        <fw-tag removable>Yoga</fw-tag>
        <fw-tag tone="accent">Strength</fw-tag>
      </div>
      <div class="tb-row">
        <fw-dropdown>
          <fw-button slot="trigger" variant="secondary">Actions</fw-button>
          <fw-menu-item value="edit">Edit</fw-menu-item>
          <fw-menu-item value="freeze">Freeze membership</fw-menu-item>
          <fw-menu-divider></fw-menu-divider>
          <fw-menu-item value="delete" danger>Delete</fw-menu-item>
        </fw-dropdown>
        <fw-tooltip content="Sends an SMS reminder">
          <fw-button variant="ghost">Remind</fw-button>
        </fw-tooltip>
        <fw-button variant="danger">Cancel plan</fw-button>
      </div>
      <fw-pagination total-pages="12" page="3"></fw-pagination>
    </div>
  </div>
`;

const STYLE = `
<style>
  .tb { display: grid; grid-template-columns: minmax(15rem, 18rem) 1fr; gap: 24px; align-items: start; }
  @media (max-width: 860px) { .tb { grid-template-columns: 1fr; } }
  .tb-controls { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 16px; }
  .tb-colors { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .tb-color { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; }
  .tb-color span { display: flex; align-items: center; gap: 8px; }
  .tb-color input[type="color"] { width: 32px; height: 32px; padding: 0; border: 1px solid var(--fw-border, #d4d4d8); border-radius: 8px; background: none; cursor: pointer; }
  .tb-color code { font-size: 12px; color: var(--fw-muted, #71717a); }
  .tb-preview { padding: 24px; border-radius: 16px; background: var(--fw-surface); color: var(--fw-text); border: 1px solid var(--fw-border); font-family: var(--fw-font, inherit); }
  .tb-preview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 20px; }
  .tb-stack { display: flex; flex-direction: column; gap: 14px; }
  .tb-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
  .tb-row[slot="footer"] { justify-content: flex-end; }
  .tb-muted { color: var(--fw-muted); font-size: 13px; }
  .tb-code { margin: 0; padding: 14px; border-radius: 10px; background: #0f1115; color: #e6e9ef; font-size: 12px; line-height: 1.5; overflow: auto; max-height: 22rem; }
  .tb-output { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; }
</style>
`;

const COLOR_FIELDS: Array<{
  key: "accent" | "surface" | "text" | "danger" | "success" | "warning";
  label: string;
}> = [
  { key: "accent", label: "Accent" },
  { key: "surface", label: "Surface" },
  { key: "text", label: "Text" },
  { key: "danger", label: "Danger" },
  { key: "success", label: "Success" },
  { key: "warning", label: "Warning" },
];

const DEFAULT_COLORS = {
  accent: "#7c3aed",
  surface: "#ffffff",
  text: "#18181b",
  danger: "#dc2626",
  success: "#15803d",
  warning: "#b45309",
};

export const Builder: Story = {
  render: () => {
    const host = canvas(
      `${STYLE}
      <div class="tb">
        <div class="tb-controls">
          <fw-select id="preset" label="Start from preset" value="default">
            <fw-option value="default">Default</fw-option>
            <fw-option value="ocean">Ocean</fw-option>
            <fw-option value="forest">Forest</fw-option>
            <fw-option value="rose">Rose</fw-option>
            <fw-option value="mono">Mono</fw-option>
          </fw-select>
          <fw-radio-group id="mode" label="Mode" value="light" orientation="horizontal">
            <fw-radio value="light">Light</fw-radio>
            <fw-radio value="dark">Dark</fw-radio>
            <fw-radio value="system">System</fw-radio>
          </fw-radio-group>
          <div class="tb-colors">
            ${COLOR_FIELDS.map(
              (f) => `<label class="tb-color">${f.label}
                <span><input type="color" data-color="${f.key}" value="${DEFAULT_COLORS[f.key]}"><code data-code="${f.key}">${DEFAULT_COLORS[f.key]}</code></span>
              </label>`,
            ).join("")}
          </div>
          <fw-select id="radius" label="Radius" value="md">
            <fw-option value="none">None</fw-option>
            <fw-option value="sm">Small</fw-option>
            <fw-option value="md">Medium</fw-option>
            <fw-option value="lg">Large</fw-option>
            <fw-option value="full">Full</fw-option>
          </fw-select>
          <fw-select id="density" label="Density" value="comfortable">
            <fw-option value="compact">Compact</fw-option>
            <fw-option value="comfortable">Comfortable</fw-option>
            <fw-option value="spacious">Spacious</fw-option>
          </fw-select>
          <fw-select id="shadow" label="Shadow" value="md">
            <fw-option value="none">None</fw-option>
            <fw-option value="sm">Small</fw-option>
            <fw-option value="md">Medium</fw-option>
            <fw-option value="lg">Large</fw-option>
          </fw-select>
          <fw-slider id="font-size" label="Font size (px)" min="12" max="18" step="1" value="14" show-value></fw-slider>
          <fw-select id="font" label="Font" value="inherit">
            <fw-option value="inherit">Inherit from page</fw-option>
            <fw-option value="system-ui, sans-serif">System UI</fw-option>
            <fw-option value="Georgia, serif">Serif</fw-option>
            <fw-option value="ui-monospace, monospace">Monospace</fw-option>
          </fw-select>
        </div>
        <div>
          <div class="tb-preview" id="preview">${PREVIEW}</div>
          <div class="tb-output">
            <div class="tb-row">
              <strong>Your theme</strong>
              <fw-button size="sm" variant="secondary" id="copy-ts">Copy code</fw-button>
              <fw-button size="sm" variant="ghost" id="copy-css">Copy CSS</fw-button>
            </div>
            <pre class="tb-code" id="code"></pre>
          </div>
        </div>
      </div>`,
      { width: "80rem" },
    );

    const $ = <T extends HTMLElement = HTMLElement>(sel: string) => host.querySelector<T>(sel)!;
    const preview = $("#preview");
    const colors: Record<string, string> = { ...DEFAULT_COLORS };
    const state: {
      preset: keyof typeof presets;
      mode: ThemeMode;
      radius: RadiusScale;
      density: Density;
      shadow: ShadowScale;
      fontSize: number;
      font: string;
    } = {
      preset: "default",
      mode: "light",
      radius: "md",
      density: "comfortable",
      shadow: "md",
      fontSize: 14,
      font: "",
    };

    const options = (): ThemeOptions => {
      const base = presets[state.preset];
      const result: ThemeOptions = {
        ...base,
        accent: colors["accent"]!,
        colors: {
          ...base.colors,
          surface: colors["surface"]!,
          text: colors["text"]!,
          danger: colors["danger"]!,
          success: colors["success"]!,
          warning: colors["warning"]!,
        },
        radius: state.radius,
        density: state.density,
        shadow: state.shadow,
        fontSize: `${state.fontSize / 16}rem`,
        mode: state.mode,
      };
      if (state.font) result.font = state.font;
      return result;
    };

    const theme = createTheme(options(), { target: preview });
    const code = $("#code");

    const render = () => {
      const opts = options();
      theme.update(opts);
      theme.setMode(state.mode);
      const { mode: _mode, ...rest } = opts;
      code.textContent =
        `import { createTheme } from "@formwright/ui/theme";\n\n` +
        `const theme = createTheme(${JSON.stringify({ ...rest, mode: state.mode }, null, 2)});\n\n` +
        `// Later: theme.update({ accent: "#e11d48" }); theme.setMode("dark");`;
    };

    const setColor = (key: string, value: string) => {
      colors[key] = value;
      const input = host.querySelector<HTMLInputElement>(`input[data-color="${key}"]`);
      if (input) input.value = value;
      const label = host.querySelector(`[data-code="${key}"]`);
      if (label) label.textContent = value;
    };

    host.addEventListener("input", (event) => {
      const input = event.target as HTMLInputElement;
      if (input.dataset["color"]) {
        setColor(input.dataset["color"], input.value);
        render();
      }
    });

    const onChange = (id: string, fn: (value: string) => void) => {
      $(id).addEventListener("change", (event) => {
        fn(String((event.target as HTMLElement & { value: unknown }).value ?? ""));
        render();
      });
    };
    onChange("#preset", (value) => {
      state.preset = (value in presets ? value : "default") as keyof typeof presets;
      const p = presets[state.preset];
      setColor("accent", p.accent ?? DEFAULT_COLORS.accent);
      setColor("surface", p.colors?.surface ?? DEFAULT_COLORS.surface);
      setColor("text", p.colors?.text ?? DEFAULT_COLORS.text);
      if (p.radius) {
        state.radius = p.radius as RadiusScale;
        $<HTMLElement & { value: string }>("#radius").value = state.radius;
      }
      if (p.shadow) {
        state.shadow = p.shadow as ShadowScale;
        $<HTMLElement & { value: string }>("#shadow").value = state.shadow;
      }
    });
    onChange("#mode", (value) => (state.mode = value as ThemeMode));
    onChange("#radius", (value) => (state.radius = value as RadiusScale));
    onChange("#density", (value) => (state.density = value as Density));
    onChange("#shadow", (value) => (state.shadow = value as ShadowScale));
    onChange("#font", (value) => (state.font = value === "inherit" ? "" : value));
    $("#font-size").addEventListener("input", (event) => {
      state.fontSize = Number((event.target as HTMLElement & { value: number }).value);
      render();
    });

    const copy = (text: string, button: HTMLElement) => {
      void navigator.clipboard?.writeText(text).then(() => {
        const label = button.textContent;
        button.textContent = "Copied";
        setTimeout(() => (button.textContent = label), 1200);
      });
    };
    $("#copy-ts").addEventListener("click", () => copy(code.textContent ?? "", $("#copy-ts")));
    $("#copy-css").addEventListener("click", () => copy(theme.css(), $("#copy-css")));

    render();
    host.__storyDispose = () => theme.dispose();
    return host;
  },
};
