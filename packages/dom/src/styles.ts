import type { Dispose } from "@formwright/core";

export interface StyleMountOptions {
  readonly styles?: false | "default" | string;
  readonly customStyles?: boolean;
  readonly className?: string;
  readonly rootClass: string;
  readonly defaultCss: string;
  readonly styleId: string;
}

function shouldUseDefaultStyles(options: StyleMountOptions | undefined): boolean {
  if (!options) return true;
  if (options.customStyles) return false;
  if (options.styles === false) return false;
  if (typeof options.styles === "string" && options.styles !== "default") return false;
  return true;
}

function injectStyleTag(id: string, css: string): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

function injectStylesheet(id: string, href: string): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

/** Apply root class and inject default or custom stylesheet on the mount host. */
export function applyMountStyles(host: Element, options: StyleMountOptions | undefined): Dispose {
  const rootClass = options?.rootClass ?? "fw-root";
  host.classList.add(rootClass);
  if (options?.className) {
    for (const c of options.className.split(/\s+/)) if (c) host.classList.add(c);
  }

  const styleId = options?.styleId ?? "formwright-default-styles";
  if (shouldUseDefaultStyles(options)) {
    injectStyleTag(styleId, options?.defaultCss ?? "");
    return () => {};
  }

  if (typeof options?.styles === "string" && options.styles !== "default") {
    injectStylesheet(styleId, options.styles);
  }

  return () => {};
}

export function resolveSummaryEnabled(
  summary: boolean | { enabled?: boolean } | undefined,
): boolean {
  if (summary === false) return false;
  if (summary === undefined) return true;
  if (typeof summary === "object") return summary.enabled !== false;
  return true;
}
