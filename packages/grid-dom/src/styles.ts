import type { Dispose } from "@formwright/reactive";

export interface GridStyleOptions {
  readonly styles?: false | "default" | string;
  readonly customStyles?: boolean;
  readonly className?: string;
}

function shouldUseDefault(options: GridStyleOptions | undefined): boolean {
  if (!options) return true;
  if (options.customStyles) return false;
  if (options.styles === false) return false;
  if (typeof options.styles === "string" && options.styles !== "default") return false;
  return true;
}

export function applyGridMountStyles(
  host: Element,
  defaultCss: string,
  options?: GridStyleOptions,
): Dispose {
  host.classList.add("gw-root");
  if (options?.className) {
    for (const c of options.className.split(/\s+/)) if (c) host.classList.add(c);
  }
  const styleId = "formwright-grid-default-styles";
  if (typeof document === "undefined") return () => {};
  if (shouldUseDefault(options)) {
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = defaultCss;
      document.head.appendChild(style);
    }
    return () => {};
  }
  if (typeof options?.styles === "string" && options.styles !== "default") {
    if (!document.getElementById(styleId)) {
      const link = document.createElement("link");
      link.id = styleId;
      link.rel = "stylesheet";
      link.href = options.styles;
      document.head.appendChild(link);
    }
  }
  return () => {};
}
