# @formwright/ui

## 0.12.1

### Patch Changes

- @formwright/reactive@0.12.1
- @formwright/ui-core@0.12.1

## 0.12.0

### Minor Changes

- 19cb6f0: New `@formwright/ui/theme`: `createTheme(options, { target? })` themes every component at runtime from a few choices — an accent, optional colours (neutrals, tones and contrast text are derived), radius, density, shadow, font, font size and motion — with light, dark and system modes. `theme.update()` and `theme.setMode()` restyle the page at once; a theme can be scoped to one element; `themeToCss()` renders the same CSS for a server to inline; `presets` offers ocean, forest, rose and mono starting points.

### Patch Changes

- 19cb6f0: A design pass across every component in light and dark: consistent field heights, borders, hover, pressed and focus states; floating lists, menus and popovers share one panel style; tone colours for badges, tags, alerts, toasts and progress read well in both modes; corners stay sensible at a full radius; tabs, stepper, pagination, calendar, switch and chips are refined. Info toasts use the info colour, and a toast region placed in the page flow stays where it is.
  - @formwright/reactive@0.12.0
  - @formwright/ui-core@0.12.0

## 0.11.1

### Patch Changes

- a129d18: @formwright/ui: components register with bundlers that honour `sideEffects` (the `customElements.define()` calls live in shared chunks, which are now marked), and `<fw-tab panel>` / `<fw-tab-panel name>` reflect, so tabs and panels set through properties (React, Vue) pair up.

  @formwright/overlay-dom: dialog action hovers use `--ow-hover` instead of hard-coded colours (which followed the OS colour scheme rather than the app's theme), and confirm and danger buttons keep their colours on hover (`--ow-accent-hover`, `--ow-danger-hover`).
  - @formwright/reactive@0.11.1
  - @formwright/ui-core@0.11.1

## 0.11.0

### Minor Changes

- e971f7b: Advanced inputs: `<fw-combobox>` (filtering, async search via `fw-search`, custom values), `<fw-multi-select>` (chips, search, a maximum), `<fw-tags-input>` (separators, paste, pattern), `<fw-number-input>` (steppers with press-and-hold, locale formatting, clamping) and `<fw-otp-input>` (paste to fill, `fw-complete`). Multi-value controls submit one form entry per value.
- 80b220a: Dates and commands: `<fw-calendar>` (single or range, one or two months, min/max and disabled dates, locale week start, full grid keyboard), `<fw-date-picker>` (typed or picked, range mode submitting `start/end`) and `<fw-command-palette>` with `<fw-command>` and `<fw-command-group>` (a hotkey such as `mod+k`, ranked filtering).
- e9adf2c: Display and feedback: `<fw-badge>`, `<fw-tag>` (removable), `<fw-avatar>` with `<fw-avatar-group>` (initials fallback, status dot, "+N" overflow), `<fw-spinner>`, `<fw-skeleton>`, `<fw-progress>` (linear or circular, determinate or not), `<fw-divider>`, `<fw-alert>` (dismissible), `<fw-card>` (whole card as a link) and `<fw-empty-state>`. Tone, variant and size are attributes; animations stop under reduced motion.
- 4a7a2b3: `<fw-dropdown>` supports nested submenus with `<fw-submenu slot="submenu">` inside a `<fw-menu-item>`, to any depth: ArrowRight, Enter or Space open one (ArrowLeft in right-to-left pages), ArrowLeft or Escape close only that level, hovering opens with a short delay and a grace period for diagonal moves, and choosing an item at any depth emits `fw-select` from the dropdown and closes the whole tree.
- e22b715: Floating: `<fw-popover>` (click, hover, focus or manual trigger, optional arrow), `<fw-tooltip>` (delayed on hover, immediate on keyboard focus, text mirrored to `aria-description`) and `<fw-dropdown>` with `<fw-menu-item>`, `<fw-menu-divider>` and `<fw-menu-label>` (checkbox and radio items, typeahead, the full menu button keyboard pattern). All open in the top layer and flip at the viewport edge.
- 1bb0e4e: Form controls: `<fw-textarea>` (auto-resize, character counter), `<fw-checkbox>` (indeterminate), `<fw-switch>`, `<fw-radio-group>` with `<fw-radio>` (arrow keys move and select, one tab stop), and `<fw-slider>` (value kept within `min`/`max` and on `step`). All submit with a native form, validate with `required`, reset with the form and follow a disabled `<fieldset>`.
- 8a858d5: Navigation and disclosure: `<fw-tabs>` with `<fw-tab>` and `<fw-tab-panel>` (automatic or manual activation), `<fw-accordion>` with `<fw-accordion-item>` (single or multiple open, animated height), `<fw-breadcrumbs>` with `<fw-breadcrumb-item>` (collapses long trails), `<fw-pagination>` and `<fw-stepper>` with `<fw-step>`. Left and right arrows reverse in right-to-left pages.
- c3e600c: Overlays: `<fw-dialog>` and `<fw-drawer>` built on the native `<dialog>` (focus containment, inert page, scroll lock, a cancelable `fw-request-close` for Escape, backdrop and close button), and `<fw-toast>` with `<fw-toast-region>` plus a `showToast()` helper. Toasts pause while hovered or focused and show above an open modal dialog.
- 4c5264c: New package: web components built on Formwright's headless foundation, each registered under the `fw-` prefix and importable on its own (`@formwright/ui/select`) or all at once.

  - `<fw-button>` — variants (`primary`, `secondary`, `ghost`, `danger`), sizes, a `loading` state that blocks double submission, `href` to render a real link, and `type="submit"` / `type="reset"` that work with a native form.
  - `<fw-input>` — every text-like type in one element, with its label, help text and error message built in and wired for screen readers; `clearable`, and a show/hide toggle for passwords.
  - `<fw-select>` with `<fw-option>` — native-select keyboard behaviour including type-to-find while closed, a list that opens in the top layer and flips at the viewport edge, and `clearable`.

  All three are form-associated: they submit under their `name`, validate with `required`, reset with the form and are disabled by a disabled `<fieldset>`. They are themed through `--fw-*` custom properties and styled further with `::part()`. `@formwright/ui/core` exposes the base classes for building more.

### Patch Changes

- 332124f: Toasts stay clickable while a `<fw-dialog>`, `<fw-drawer>` or `<fw-command-palette>` is open: the toast region moves inside the innermost open modal and back when it closes, with countdowns carrying on. `<fw-command-palette>` now ranks results by moving them in the page rather than with CSS `order`, so screen readers read them in the order shown; the authored order returns when the search clears or the palette closes.
- Updated dependencies [36a5675]
- Updated dependencies [b19eee8]
  - @formwright/ui-core@0.11.0
  - @formwright/reactive@0.11.0
