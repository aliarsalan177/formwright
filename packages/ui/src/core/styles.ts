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
  /* Set by createTheme() from @formwright/ui/theme, or by hand on any
     ancestor. Neutrals that are not set are mixed from surface and text,
     so a page that only sets those two still gets a coherent palette. */
  --_accent: var(--fw-accent, #7c3aed);
  --_text: var(--fw-text, #18181b);
  --_surface: var(--fw-surface, #ffffff);
  --_accent-hover: var(--fw-accent-hover, color-mix(in srgb, var(--_accent) 86%, var(--_text)));
  --_accent-contrast: var(--fw-accent-contrast, #ffffff);
  --_accent-soft: var(--fw-accent-soft, color-mix(in srgb, var(--_accent) 14%, var(--_surface)));
  --_surface-2: var(--fw-surface-2, color-mix(in srgb, var(--_text) 5%, var(--_surface)));
  --_muted: var(--fw-muted, color-mix(in srgb, var(--_text) 62%, var(--_surface)));
  --_border: var(--fw-border, color-mix(in srgb, var(--_text) 17%, var(--_surface)));
  --_danger: var(--fw-danger, #dc2626);
  --_success: var(--fw-success, #15803d);
  --_warning: var(--fw-warning, #b45309);
  --_info: var(--fw-info, #2563eb);
  --_danger-contrast: var(--fw-danger-contrast, #ffffff);
  --_success-contrast: var(--fw-success-contrast, #ffffff);
  --_warning-contrast: var(--fw-warning-contrast, #ffffff);
  --_info-contrast: var(--fw-info-contrast, #ffffff);
  --_backdrop: var(--fw-backdrop, rgb(15 15 20 / 0.5));
  --_radius: var(--fw-radius, 0.5rem);
  --_radius-sm: var(--fw-radius-sm, 0.375rem);
  --_font: var(--fw-font, inherit);
  --_shadow: var(--fw-shadow, 0 10px 30px -10px rgb(0 0 0 / 0.25), 0 2px 6px -2px rgb(0 0 0 / 0.1));
  --_ring: var(--fw-focus-ring, 0 0 0 3px color-mix(in srgb, var(--_accent) 35%, transparent));
  --_height-sm: var(--fw-control-height-sm, 2rem);
  --_height-md: var(--fw-control-height-md, 2.5rem);
  --_height-lg: var(--fw-control-height-lg, 3rem);
  --_duration: var(--fw-duration, 150ms);
  --_font-size: var(--fw-font-size, 0.875rem);
  --_height: var(--_height-md);
  --_text-size: var(--_font-size);

  box-sizing: border-box;
  font-family: var(--_font);
  color: var(--_text);
}
:host([size="sm"]) { --_height: var(--_height-sm); --_text-size: calc(var(--_font-size) - 0.0625rem); }
:host([size="lg"]) { --_height: var(--_height-lg); --_text-size: calc(var(--_font-size) + 0.125rem); }
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
