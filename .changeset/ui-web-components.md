---
"@formwright/ui": minor
---

New package: web components built on Formwright's headless foundation, each registered under the `fw-` prefix and importable on its own (`@formwright/ui/select`) or all at once.

- `<fw-button>` — variants (`primary`, `secondary`, `ghost`, `danger`), sizes, a `loading` state that blocks double submission, `href` to render a real link, and `type="submit"` / `type="reset"` that work with a native form.
- `<fw-input>` — every text-like type in one element, with its label, help text and error message built in and wired for screen readers; `clearable`, and a show/hide toggle for passwords.
- `<fw-select>` with `<fw-option>` — native-select keyboard behaviour including type-to-find while closed, a list that opens in the top layer and flips at the viewport edge, and `clearable`.

All three are form-associated: they submit under their `name`, validate with `required`, reset with the form and are disabled by a disabled `<fieldset>`. They are themed through `--fw-*` custom properties and styled further with `::part()`. `@formwright/ui/core` exposes the base classes for building more.
