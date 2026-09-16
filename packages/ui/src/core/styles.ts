/**
 * Design tokens and the rules every component starts from.
 *
 * Every visual decision is a `--fw-*` custom property with a default, so
 * an app themes the whole library by setting a handful of variables on
 * `:root` — or on any ancestor, to theme one area — and never needs to
 * reach into a shadow root. Custom properties inherit through shadow
 * boundaries; that is what makes this work.
 *
 * For anything the tokens do not cover, components expose `part`s:
 * `fw-select::part(listbox) { max-height: 20rem }`.
 */
export const baseStyles = /* css */ `
:host {
  --_accent: var(--fw-accent, #7c3aed);
  --_accent-hover: var(--fw-accent-hover, #6d28d9);
  --_accent-contrast: var(--fw-accent-contrast, #ffffff);
  --_surface: var(--fw-surface, #ffffff);
  --_surface-2: var(--fw-surface-2, #f4f4f5);
  --_text: var(--fw-text, #18181b);
  --_muted: var(--fw-muted, #71717a);
  --_border: var(--fw-border, #d4d4d8);
  --_danger: var(--fw-danger, #dc2626);
  --_success: var(--fw-success, #16a34a);
  --_warning: var(--fw-warning, #d97706);
  --_radius: var(--fw-radius, 0.5rem);
  --_radius-sm: var(--fw-radius-sm, 0.375rem);
  --_font: var(--fw-font, inherit);
  --_shadow: var(--fw-shadow, 0 10px 30px -10px rgb(0 0 0 / 0.25), 0 2px 6px -2px rgb(0 0 0 / 0.1));
  --_ring: var(--fw-focus-ring, 0 0 0 3px color-mix(in srgb, var(--_accent) 35%, transparent));
  --_height-sm: var(--fw-control-height-sm, 2rem);
  --_height-md: var(--fw-control-height-md, 2.5rem);
  --_height-lg: var(--fw-control-height-lg, 3rem);
  --_duration: var(--fw-duration, 150ms);
  --_height: var(--_height-md);
  --_text-size: 0.875rem;

  box-sizing: border-box;
  font-family: var(--_font);
  color: var(--_text);
}
:host([size="sm"]) { --_height: var(--_height-sm); --_text-size: 0.8125rem; }
:host([size="lg"]) { --_height: var(--_height-lg); --_text-size: 1rem; }
:host([hidden]) { display: none !important; }
*, *::before, *::after { box-sizing: inherit; }
[hidden] { display: none !important; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; }
}
`;

/** A visually hidden but screen-reader-readable block. */
export const srOnly = /* css */ `
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
`;
