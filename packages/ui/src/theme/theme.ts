/**
 * Runtime theming for every `fw-` component.
 *
 * Components read `--fw-*` custom properties, which inherit through shadow
 * roots. A theme is one stylesheet that sets those properties on `:root` (or
 * on one element, to theme an area), with a light block, a dark block and a
 * `prefers-color-scheme` block for "system". Changing the theme or the mode
 * rewrites that one sheet or flips one attribute, so every component on the
 * page restyles at once without being touched.
 */

export type ThemeMode = "light" | "dark" | "system";
export type RadiusScale = "none" | "sm" | "md" | "lg" | "full";
export type ShadowScale = "none" | "sm" | "md" | "lg";
export type Density = "compact" | "comfortable" | "spacious";

/** Colours. Anything left out is derived from the rest. */
export interface ThemeColors {
  /** Brand colour: primary buttons, focus, selection, checked controls. */
  accent: string;
  /** Hover shade of the accent. Default: the accent mixed toward the text colour. */
  accentHover: string;
  /** Text on the accent. Default: black or white, whichever reads better. */
  accentContrast: string;
  /** A faint accent wash for selected rows and soft badges. */
  accentSoft: string;
  /** Background of controls, cards, menus and dialogs. */
  surface: string;
  /** A subtle second background: hover rows, tracks, disabled fields. */
  surface2: string;
  /** Main text. */
  text: string;
  /** Secondary text: help, placeholders, icons. */
  muted: string;
  /** Control and card borders. */
  border: string;
  danger: string;
  success: string;
  warning: string;
  info: string;
  /** Text on a solid danger, success, warning or info background. Default: computed per tone. */
  dangerContrast: string;
  successContrast: string;
  warningContrast: string;
  infoContrast: string;
  /** The dimmed page behind dialogs, drawers and the command palette. */
  backdrop: string;
  /** Tooltip background and text colour. Default: the text and surface colours swapped. */
  tooltipBackground: string;
  tooltipColor: string;
}

export interface ThemeOptions {
  /** Shorthand for `colors.accent`; hover, soft and contrast shades follow it. */
  accent?: string;
  /** Light-mode colours (and the base for dark mode). */
  colors?: Partial<ThemeColors>;
  /** Dark-mode colours, laid over the built-in dark palette. */
  dark?: Partial<ThemeColors>;
  /** Corner rounding: a scale step or any CSS length. Default "md". */
  radius?: RadiusScale | string;
  /** Font family. Default: inherited from the page. */
  font?: string;
  /** Base text size of controls. Default "0.875rem". */
  fontSize?: string;
  /** Control heights. Default "comfortable". */
  density?: Density;
  /** Elevation of menus, popovers and dialogs. Default "md". */
  shadow?: ShadowScale | string;
  /** Transition length in ms, or "none". Default 150. */
  motion?: number | "none";
  /** Focus ring as a box-shadow. Default: a 3px accent halo. */
  focusRing?: string;
  /** Stacking for the non-top-layer fallbacks. */
  zIndex?: { overlay?: number; toast?: number };
  /** Which palette applies. Default "system". */
  mode?: ThemeMode;
}

/** The resolved custom properties for one mode, keyed by property name. */
export type ThemeTokens = Record<`--fw-${string}`, string>;

const LIGHT: Pick<
  ThemeColors,
  "accent" | "surface" | "text" | "danger" | "success" | "warning" | "info" | "backdrop"
> = {
  accent: "#7c3aed",
  surface: "#ffffff",
  text: "#18181b",
  danger: "#dc2626",
  success: "#15803d",
  warning: "#b45309",
  info: "#2563eb",
  backdrop: "rgb(15 15 20 / 0.5)",
};

const DARK: typeof LIGHT = {
  accent: "#8b5cf6",
  surface: "#18181b",
  text: "#f4f4f5",
  danger: "#f87171",
  success: "#4ade80",
  warning: "#fbbf24",
  info: "#60a5fa",
  backdrop: "rgb(0 0 0 / 0.65)",
};

const RADIUS: Record<RadiusScale, [string, string]> = {
  none: ["0", "0"],
  sm: ["0.25rem", "0.1875rem"],
  md: ["0.5rem", "0.375rem"],
  lg: ["0.75rem", "0.5rem"],
  full: ["9999px", "9999px"],
};

const HEIGHTS: Record<Density, [string, string, string]> = {
  compact: ["1.75rem", "2.125rem", "2.5rem"],
  comfortable: ["2rem", "2.5rem", "3rem"],
  spacious: ["2.25rem", "2.75rem", "3.25rem"],
};

const SHADOWS: Record<"light" | "dark", Record<ShadowScale, string>> = {
  light: {
    none: "none",
    sm: "0 1px 2px rgb(0 0 0 / 0.08), 0 1px 3px rgb(0 0 0 / 0.06)",
    md: "0 10px 30px -10px rgb(0 0 0 / 0.25), 0 2px 6px -2px rgb(0 0 0 / 0.1)",
    lg: "0 24px 48px -12px rgb(0 0 0 / 0.3), 0 4px 12px -4px rgb(0 0 0 / 0.12)",
  },
  dark: {
    none: "none",
    sm: "0 1px 2px rgb(0 0 0 / 0.4), 0 0 0 1px rgb(255 255 255 / 0.04)",
    md: "0 10px 30px -10px rgb(0 0 0 / 0.7), 0 0 0 1px rgb(255 255 255 / 0.06)",
    lg: "0 24px 48px -12px rgb(0 0 0 / 0.8), 0 0 0 1px rgb(255 255 255 / 0.06)",
  },
};

/** [r, g, b] in 0–255 for #rgb, #rrggbb, rgb() and rgba(); null for anything else. */
export function parseColor(value: string): [number, number, number] | null {
  const text = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text);
  if (hex) {
    const h = hex[1]!;
    const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(text);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Black or white text for `background`. White while it keeps at least 3:1
 * contrast (the WCAG minimum for bold UI text such as button labels), since
 * white on a saturated brand colour is what people expect; black only on
 * light colours like yellow or mint. Colours it cannot parse (named colours,
 * oklch, variables) get white.
 */
export function contrastText(background: string): string {
  const rgb = parseColor(background);
  if (!rgb) return "#ffffff";
  const onWhite = 1.05 / (luminance(rgb) + 0.05);
  return onWhite >= 3 ? "#ffffff" : "#0a0a0a";
}

function palette(base: typeof LIGHT, overrides: Partial<ThemeColors>): ThemeColors {
  const c = { ...base, ...overrides };
  const mix = (color: string, amount: number, into: string) =>
    `color-mix(in srgb, ${color} ${amount}%, ${into})`;
  return {
    accent: c.accent,
    accentHover: overrides.accentHover ?? mix(c.accent, 86, c.text),
    accentContrast: overrides.accentContrast ?? contrastText(c.accent),
    accentSoft: overrides.accentSoft ?? mix(c.accent, 14, c.surface),
    surface: c.surface,
    surface2: overrides.surface2 ?? mix(c.text, 5, c.surface),
    text: c.text,
    muted: overrides.muted ?? mix(c.text, 62, c.surface),
    border: overrides.border ?? mix(c.text, 17, c.surface),
    danger: c.danger,
    success: c.success,
    warning: c.warning,
    info: c.info,
    dangerContrast: overrides.dangerContrast ?? contrastText(c.danger),
    successContrast: overrides.successContrast ?? contrastText(c.success),
    warningContrast: overrides.warningContrast ?? contrastText(c.warning),
    infoContrast: overrides.infoContrast ?? contrastText(c.info),
    backdrop: c.backdrop,
    tooltipBackground: overrides.tooltipBackground ?? c.text,
    tooltipColor: overrides.tooltipColor ?? c.surface,
  };
}

const kebab = (key: string) => key.replace(/[A-Z0-9]+/g, (m) => `-${m.toLowerCase()}`);

/** The custom properties a theme sets, for light and for dark. */
export function resolveTheme(options: ThemeOptions = {}): {
  light: ThemeTokens;
  dark: ThemeTokens;
} {
  const lightColors = palette(LIGHT, {
    ...options.colors,
    ...(options.accent ? { accent: options.accent } : {}),
  });
  // Dark keeps the brand accent unless dark mode names its own.
  const darkColors = palette(DARK, {
    ...(options.accent ? { accent: options.accent } : {}),
    ...pickBrand(options.colors),
    ...options.dark,
  });

  const radius = options.radius ?? "md";
  const [r, rSm] =
    radius in RADIUS ? RADIUS[radius as RadiusScale] : [radius, `calc(${radius} * 0.75)`];
  const [hSm, hMd, hLg] = HEIGHTS[options.density ?? "comfortable"];
  const motion = options.motion ?? 150;

  const shared = (mode: "light" | "dark"): ThemeTokens => {
    const shadow = options.shadow ?? "md";
    const tokens: ThemeTokens = {
      "--fw-radius": r,
      "--fw-radius-sm": rSm,
      "--fw-font-size": options.fontSize ?? "0.875rem",
      "--fw-control-height-sm": hSm,
      "--fw-control-height-md": hMd,
      "--fw-control-height-lg": hLg,
      "--fw-shadow": shadow in SHADOWS[mode] ? SHADOWS[mode][shadow as ShadowScale] : shadow,
      "--fw-duration": motion === "none" ? "0ms" : `${motion}ms`,
      "--fw-overlay-z": String(options.zIndex?.overlay ?? 1000),
      "--fw-toast-z": String(options.zIndex?.toast ?? 1100),
    };
    if (options.font) tokens["--fw-font"] = options.font;
    if (options.focusRing) tokens["--fw-focus-ring"] = options.focusRing;
    return tokens;
  };

  const colorTokens = (colors: ThemeColors): ThemeTokens =>
    Object.fromEntries(
      Object.entries(colors).map(([key, value]) => [`--fw-${kebab(key)}`, value]),
    ) as ThemeTokens;

  return {
    light: { ...colorTokens(lightColors), ...shared("light") },
    dark: { ...colorTokens(darkColors), ...shared("dark") },
  };
}

/**
 * Brand colours carry into dark mode; neutrals (surface, text and what is
 * derived from them) do not, or a light surface would leak into dark.
 */
function pickBrand(colors: Partial<ThemeColors> | undefined): Partial<ThemeColors> {
  if (!colors) return {};
  const { accent, accentContrast } = colors;
  return {
    ...(accent ? { accent } : {}),
    ...(accentContrast ? { accentContrast } : {}),
  };
}

const block = (selector: string, tokens: ThemeTokens, scheme: "light" | "dark") =>
  `${selector} {\n${Object.entries(tokens)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n")}\n  color-scheme: ${scheme};\n}`;

/**
 * The theme as CSS, for a server to inline in `<head>` so the first paint
 * is already themed. Add `data-fw-mode="light|dark|system"` to the element
 * `selector` matches to choose the palette; without it, light applies.
 */
export function themeToCss(options: ThemeOptions = {}, selector = ":root"): string {
  const { light, dark } = resolveTheme(options);
  return [
    block(selector, light, "light"),
    block(`${selector}[data-fw-mode="dark"]`, dark, "dark"),
    `@media (prefers-color-scheme: dark) {\n${block(`${selector}[data-fw-mode="system"]`, dark, "dark")}\n}`,
  ].join("\n");
}

export interface Theme {
  /** The options currently applied. */
  readonly options: Readonly<ThemeOptions>;
  /** Merge in changes and restyle. Nested `colors` and `dark` merge too. */
  update(changes: ThemeOptions): void;
  /** Switch palette. */
  setMode(mode: ThemeMode): void;
  /** The mode set: "light", "dark" or "system". */
  getMode(): ThemeMode;
  /** The palette showing now, with "system" resolved. */
  resolvedMode(): "light" | "dark";
  /** The CSS this theme is applying. */
  css(): string;
  /** Remove the theme; components fall back to their defaults. */
  dispose(): void;
}

export interface CreateThemeOptions {
  /**
   * Where the theme applies. Default: the whole document. Pass an element to
   * theme only what is inside it; nested themes win over outer ones.
   */
  target?: HTMLElement;
}

let counter = 0;

/**
 * Apply a theme.
 *
 * ```ts
 * import { createTheme } from "@formwright/ui/theme";
 *
 * const theme = createTheme({ accent: "#0d9488", radius: "lg", mode: "system" });
 * theme.update({ accent: "#e11d48" });
 * theme.setMode("dark");
 * ```
 */
export function createTheme(options: ThemeOptions = {}, where: CreateThemeOptions = {}): Theme {
  const element = where.target ?? document.documentElement;
  const scoped = Boolean(where.target);
  const name = scoped ? `fw-theme-${++counter}` : "";
  if (scoped) element.setAttribute("data-fw-theme", name);
  const selector = scoped ? `[data-fw-theme="${name}"]` : ":root";

  const root = element.getRootNode() as Document | ShadowRoot;
  const adoptable =
    "adoptedStyleSheets" in root &&
    typeof CSSStyleSheet !== "undefined" &&
    "replaceSync" in CSSStyleSheet.prototype;

  let current: ThemeOptions = { ...options };
  let mode: ThemeMode = options.mode ?? "system";
  let sheet: CSSStyleSheet | null = null;
  let styleEl: HTMLStyleElement | null = null;
  let disposed = false;

  const write = () => {
    const css = themeToCss(current, selector);
    if (adoptable) {
      if (!sheet) {
        sheet = new CSSStyleSheet();
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      }
      sheet.replaceSync(css);
    } else {
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.setAttribute("data-fw-theme-sheet", name || "root");
        (root instanceof Document ? root.head : root).append(styleEl);
      }
      styleEl.textContent = css;
    }
  };

  const applyMode = () => element.setAttribute("data-fw-mode", mode);

  write();
  applyMode();

  return {
    get options() {
      return current;
    },
    update(changes) {
      if (disposed) return;
      current = {
        ...current,
        ...changes,
        colors: { ...current.colors, ...changes.colors },
        dark: { ...current.dark, ...changes.dark },
      };
      if (changes.mode) {
        mode = changes.mode;
        applyMode();
      }
      write();
    },
    setMode(next) {
      if (disposed) return;
      mode = next;
      current = { ...current, mode: next };
      applyMode();
    },
    getMode: () => mode,
    resolvedMode() {
      if (mode !== "system") return mode;
      return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    },
    css: () => themeToCss(current, selector),
    dispose() {
      if (disposed) return;
      disposed = true;
      if (sheet) root.adoptedStyleSheets = root.adoptedStyleSheets.filter((s) => s !== sheet);
      styleEl?.remove();
      element.removeAttribute("data-fw-mode");
      if (scoped) element.removeAttribute("data-fw-theme");
    },
  };
}

/** Ready-made starting points. Spread and adjust: `createTheme({ ...presets.ocean, radius: "lg" })`. */
export const presets = {
  /** The defaults: violet on white, zinc neutrals. */
  default: {} as ThemeOptions,
  ocean: {
    accent: "#0284c7",
    colors: { text: "#0f172a", surface: "#ffffff" },
    dark: { surface: "#0b1220", text: "#e2e8f0", accent: "#38bdf8" },
    radius: "md",
  } as ThemeOptions,
  forest: {
    accent: "#15803d",
    colors: { text: "#14231a", surface: "#ffffff" },
    dark: { surface: "#0f1712", text: "#e3efe6", accent: "#4ade80" },
    radius: "lg",
  } as ThemeOptions,
  rose: {
    accent: "#e11d48",
    radius: "full",
    dark: { accent: "#fb7185" },
  } as ThemeOptions,
  mono: {
    accent: "#18181b",
    radius: "sm",
    shadow: "sm",
    dark: { accent: "#fafafa" },
  } as ThemeOptions,
} satisfies Record<string, ThemeOptions>;
