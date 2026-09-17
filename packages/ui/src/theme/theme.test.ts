import { afterEach, describe, expect, it } from "vitest";
import {
  contrastText,
  createTheme,
  parseColor,
  presets,
  resolveTheme,
  themeToCss,
} from "./index.js";

afterEach(() => {
  document.documentElement.removeAttribute("data-fw-mode");
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

describe("colour helpers", () => {
  it("parses hex and rgb, and gives up on the rest", () => {
    expect(parseColor("#fff")).toEqual([255, 255, 255]);
    expect(parseColor("#0d9488")).toEqual([13, 148, 136]);
    expect(parseColor("rgb(10 20 30 / 0.5)")).toEqual([10, 20, 30]);
    expect(parseColor("rebeccapurple")).toBeNull();
  });

  it("picks the more readable of black and white", () => {
    expect(contrastText("#7c3aed")).toBe("#ffffff");
    expect(contrastText("#fbbf24")).toBe("#0a0a0a");
    expect(contrastText("oklch(70% 0.1 200)")).toBe("#ffffff");
  });
});

describe("resolveTheme", () => {
  it("derives hover, soft, contrast and neutrals from a few colours", () => {
    const { light } = resolveTheme({ accent: "#facc15", colors: { surface: "#fffbeb" } });
    expect(light["--fw-accent"]).toBe("#facc15");
    expect(light["--fw-accent-contrast"]).toBe("#0a0a0a");
    expect(light["--fw-accent-soft"]).toContain("#facc15");
    expect(light["--fw-surface-2"]).toContain("#fffbeb");
    expect(light["--fw-border"]).toContain("#fffbeb");
  });

  it("keeps the brand accent in dark mode but not light neutrals", () => {
    const { dark } = resolveTheme({ accent: "#0d9488", colors: { surface: "#fafafa" } });
    expect(dark["--fw-accent"]).toBe("#0d9488");
    expect(dark["--fw-surface"]).toBe("#18181b");
  });

  it("maps radius, density, shadow and motion scales", () => {
    const { light } = resolveTheme({
      radius: "full",
      density: "compact",
      shadow: "none",
      motion: "none",
    });
    expect(light["--fw-radius"]).toBe("9999px");
    expect(light["--fw-control-height-md"]).toBe("2.125rem");
    expect(light["--fw-shadow"]).toBe("none");
    expect(light["--fw-duration"]).toBe("0ms");
    expect(resolveTheme({ radius: "10px" }).light["--fw-radius-sm"]).toBe("calc(10px * 0.75)");
  });

  it("writes tooltip tokens under the names the tooltip reads", () => {
    const { light } = resolveTheme();
    expect(light["--fw-tooltip-background"]).toBeDefined();
    expect(light["--fw-tooltip-color"]).toBeDefined();
  });
});

describe("themeToCss", () => {
  it("emits light, dark and system blocks for a selector", () => {
    const css = themeToCss(presets.ocean, ".app");
    expect(css).toContain(".app {");
    expect(css).toContain('.app[data-fw-mode="dark"] {');
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain('.app[data-fw-mode="system"]');
    expect(css).toContain("--fw-accent: #0284c7;");
  });
});

describe("createTheme", () => {
  const sheetText = () => document.querySelector("style[data-fw-theme-sheet]")?.textContent ?? "";

  it("applies to the document, updates live, switches mode and cleans up", () => {
    const theme = createTheme({ accent: "#0d9488", mode: "light" });
    expect(document.documentElement.getAttribute("data-fw-mode")).toBe("light");
    expect(sheetText()).toContain("--fw-accent: #0d9488;");

    theme.update({ accent: "#e11d48", colors: { text: "#111111" } });
    expect(sheetText()).toContain("--fw-accent: #e11d48;");
    expect(theme.options.colors?.text).toBe("#111111");

    theme.setMode("dark");
    expect(document.documentElement.getAttribute("data-fw-mode")).toBe("dark");
    expect(theme.resolvedMode()).toBe("dark");

    theme.dispose();
    expect(document.querySelector("style[data-fw-theme-sheet]")).toBeNull();
    expect(document.documentElement.hasAttribute("data-fw-mode")).toBe(false);
  });

  it("scopes a theme to one element", () => {
    const area = document.createElement("section");
    document.body.append(area);
    const theme = createTheme({ accent: "#15803d" }, { target: area });
    const name = area.getAttribute("data-fw-theme");
    expect(name).toMatch(/^fw-theme-\d+$/);
    expect(sheetText()).toContain(`[data-fw-theme="${name}"] {`);
    expect(area.getAttribute("data-fw-mode")).toBe("system");
    theme.dispose();
    expect(area.hasAttribute("data-fw-theme")).toBe(false);
  });
});

describe("contrastText on brand colours", () => {
  it("keeps white on mid-tone brand colours and switches to black on light ones", () => {
    expect(contrastText("#0d9488")).toBe("#ffffff");
    expect(contrastText("#8b5cf6")).toBe("#ffffff");
    expect(contrastText("#4ade80")).toBe("#0a0a0a");
    expect(contrastText("#ffffff")).toBe("#0a0a0a");
  });
});
