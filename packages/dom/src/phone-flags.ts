/**
 * Country flag icons (SVG via CSS) — works on Windows, macOS, and mobile.
 * Styles from `country-flag-icons` are injected once on first phone field mount.
 */
import flagIconStyles from "country-flag-icons/3x2/flags.css";

const STYLE_ID = "formwright-flag-icons";

/** Regional-indicator emoji fallback when CSS flags are unavailable. */
export function flagEmoji(code: string): string {
  if (code.length !== 2) return "";
  return String.fromCodePoint(
    ...([...code.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)) as number[]),
  );
}

/** Inject flag icon CSS once (safe to call multiple times). */
export function injectFlagStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = flagIconStyles;
  document.head.appendChild(style);
}

/** Create a flag icon element for an ISO country code. */
export function createFlagIcon(code: string): HTMLSpanElement {
  const el = document.createElement("span");
  el.className = `fw-phone-flag flag:${code.toUpperCase()}`;
  el.setAttribute("aria-hidden", "true");
  return el;
}

/** Update an existing flag icon element to a new country code. */
export function setFlagIcon(el: HTMLElement, code: string): void {
  el.className = `fw-phone-flag flag:${code.toUpperCase()}`;
}
