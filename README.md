# Formwright

> LLM schema-driven, signal-reactive, framework-agnostic form engine.

Define a form **once as data** — hand-written or LLM-generated — and render it to real,
**surgically-updating** DOM (no virtual DOM, no full re-render). Inject it anywhere with
`new Form(schema, initialValue)`, drive it imperatively, and get a typed, nested payload
out.

**Live demos:** [Home](https://aliarsalan177.github.io/formwright/) ·
[Form Playground](https://aliarsalan177.github.io/formwright/playground.html) ·
[Form Builder (Forge)](https://aliarsalan177.github.io/formwright/forge.html) ·
[Theme Builder](https://aliarsalan177.github.io/formwright/builder.html) ·
[Settings Builder](https://aliarsalan177.github.io/formwright/settings.html) ·
[Gridwright](https://aliarsalan177.github.io/formwright/grid.html) ·
[Storybook](https://aliarsalan177.github.io/formwright/storybook/)

**npm — Formwright:** [`@formwright/core`](https://www.npmjs.com/package/@formwright/core) ·
[`@formwright/dom`](https://www.npmjs.com/package/@formwright/dom) ·
[`@formwright/schema`](https://www.npmjs.com/package/@formwright/schema) ·
[`@formwright/ai`](https://www.npmjs.com/package/@formwright/ai)

**npm — Gridwright:** [`@formwright/grid-core`](https://www.npmjs.com/package/@formwright/grid-core) ·
[`@formwright/grid-dom`](https://www.npmjs.com/package/@formwright/grid-dom) ·
[`@formwright/grid-schema`](https://www.npmjs.com/package/@formwright/grid-schema) ·
[`@formwright/reactive`](https://www.npmjs.com/package/@formwright/reactive) (shared engine)

**Live demo:** [Gridwright grid.html](https://aliarsalan177.github.io/formwright/grid.html) (also linked from the [home page](https://aliarsalan177.github.io/formwright/))

**~12 KB gzipped, zero dependencies** for the entire framework-agnostic runtime
(`core` + `dom` + `schema`) — one engine in place of a separate form library, validation
library, conditional-logic library, and per-framework bindings.

---

## What makes it powerful

- **Generate from natural language** — describe a form in plain language (any language) and get a validated
  schema, with any model (Claude, GPT, Gemini, local). A built-in validate-and-repair loop
  guarantees the output renders.
- **Bring your own UI** — map any field to a React, Vue, Svelte, or any-framework component, a
  custom element, or a native tag, all from the schema. The form still produces one clean payload.
- **Wrap rendered nodes your way** — wrap fields and action buttons in any native tag or custom
  element (`section`, `li`, `my-card`, …) from schema data.
- **Nested objects and repeatable collections** — `group` and `collection` fields yield
  `{ items: {…} }` and `[{…}, {…}]`, with add/remove rows and `min`/`max`.
- **Multi-step wizards** — `steps` + `step` fields split a long form into guided steps with
  Back/Next/Submit navigation, per-step validation, progress bar / tabs / fill bar, **URL step sync**,
  **resume-draft banner**, and a **built-in or custom success screen** — no extra library.
- **Conditional logic as data** — `visibleWhen` / `enabledWhen` / `requiredWhen` resolve
  lexically (sibling, then outward), so an outer toggle can hide a field deep inside a collection
  row. Hidden fields are excluded from the payload automatically.
- **Surgical DOM updates** — fine-grained signals update only the node that changed; no virtual
  DOM, no re-render. Real-time, field-by-field validation as the user types.
- **Stateless consumption** — you never manage state. `form.subscribe(values => …)` pushes the
  latest values immediately and on every change; `form.getValues()` snapshots on demand. The
  signal graph is the single source of truth, so framework adapters stay one-liners.
- **Runs everywhere** — vanilla JS, any bundler, or a CDN; the core owns state independently of
  rendering, so web-component and framework adapters drop in cleanly.

## Everything in the box

One schema, one engine — no add-on libraries required:

- **Fields** — text, email, password, number, textarea, select, radio, checkbox, **toggle**,
  **phone** (international, all countries),
  **color** (swatch + hex), **range** (slider with live value bubble),
  **date / time / datetime / daterange** (with or without time), drag-and-drop **file** upload
  (multi/single, accept, thumbnails), nested **group** (object), repeatable **collection**
  (array, add/remove, `min`/`max`), **multi-step wizard** (`steps` + `step`), plus any custom type.
- **Authoring & layout** — `heading`, `separator`, `paragraph`, per-field **tooltips** and
  `description`, **required marker** next to the label, side-by-side fields via **`colSpan`**,
  in-input **slots** (start/end), iPad-style **`labelPosition: "start"`** rows, and a dismissible
  **top-of-form error alert** — enough to build forms in a Shopify/Magento-style editor.
- **Conditional logic as data** — `visibleWhen` / `enabledWhen` / `requiredWhen` with a
  sandboxed JSONLogic algebra (`==`,`>`,`in`,`and`,`or`,`not`,`var`), resolved **lexically**
  across groups and collection rows.
- **Validation** — declarative rules + formats, **real-time field-by-field** as you type, with
  **per-rule message overrides** (`validation.messages`).
- **Runtime patching** — `form.setFieldSchema(id, partial)` / `form.patch(...)` re-render fields
  in place (swap type, options, validation) without rebuilding the form.
- **Bring-your-own UI** — map any field to a **React/Vue/Svelte/any** component, a custom
  element, or a native tag, with `toValue`/`fromValue` transformers — straight from the schema.
- **Styling** — unstyled with stable hooks; override any part with your CSS or **Tailwind**
  utilities (`class` + `classes`).
- **Internationalisation** — `localized` fields → `{ en, ar, … }` payload with a single input +
  in-input language switcher, `defaultLocale`, and **RTL/LTR**; provider sigils for i18n, async
  data (`$query`), and theming.
- **Async options (eager or lazy)** — `select`, `radio`, and `checkbox` options can come from
  `$query` with preload options, mapper keys, named transforms, lazy fetch-on-open, and TanStack
  query config passthrough.
- **Accessibility** — globally-unique field ids, correct `label[for]`, and per-field or
  type-default **`autocomplete`**.
- **Form caching** — set `persistKey` and `persist` on the schema to keep values **and the active
  wizard step** across a refresh. Use `persist.mode: "consent"` to ask before saving locally, or
  `"auto"` to save on every change. Resume banner on restore; cleared on submit or **Start over**.
- **Submission** — `validate → transform → send → onSuccess/onError`, an inline
  `submit(transform)` that resolves with `{ ok, data | error, errors }`, configurable
  **submit/reset/delete action buttons**, and server-error mapping.
- **Smart payload** — nested output; hidden, `omit`, and presentational fields automatically excluded.
- **AI-native** — `@formwright/ai` turns a description in any language into a validated schema with **any** model.

## Why Formwright

Most form libraries are bound to one framework and assume you _write the form in JSX_.
Formwright inverts that:

- **Schema is the source of truth.** Plain, serializable data describes fields, layout,
  validation, conditions, providers, and submission.
- **The runtime is framework-agnostic.** A fine-grained signal core renders directly to
  the DOM — when a value changes, only the exact text node / attribute that read it
  updates.
- **You own the UI.** Native inputs by default; map any field to your own component
  (React/Vue/any) or a custom element without leaving the schema.
- **It's LLM-native.** A model emits the schema; it's validated and repaired before it
  ever reaches the runtime — and `@formwright/ai` does this for you with any provider.

## Install

```bash
npm i @formwright/core @formwright/dom
# or: pnpm add @formwright/core @formwright/dom
```

No build step? Import from a CDN as ESM:

```html
<script type="module">
  import { Form } from "https://esm.sh/@formwright/core";
  import "https://esm.sh/@formwright/dom";
  // …
</script>
```

## Quick start

```ts
import { Form } from "@formwright/core";
import "@formwright/dom"; // registers the default DOM renderer

const schema = {
  id: "signup",
  version: "1.0",
  title: "Create your account",
  fields: [
    {
      id: "email",
      type: "email",
      label: "Email",
      validation: { kind: "string", format: "email", required: true },
    },
    {
      id: "country",
      type: "select",
      label: "Country",
      placeholder: "Select a country…",
      options: [
        { label: "United States", value: "US" },
        { label: "Canada", value: "CA" },
      ],
    },
    // Shown only when country === "US"
    {
      id: "state",
      type: "text",
      label: "State",
      visibleWhen: { "==": [{ var: "country" }, "US"] },
    },
    { id: "newsletter", type: "toggle", label: "Send me product updates" },
  ],
  submit: { endpoint: { method: "POST", url: "/api/signup" } },
};

const form = new Form(schema, { email: "" });
form.mount(document.getElementById("root")!);

form.on("success", (result) => console.log("submitted", result));
```

## Using it in your app

### Vanilla / any bundler

```ts
import { Form } from "@formwright/core";
import "@formwright/dom";

const form = new Form(schema, initialValues, {
  // Named handlers/transforms referenced from the schema's `submit` block:
  transforms: { buildPayload: (values) => ({ ...values, source: "web" }) },
  handlers: { redirectHome: () => location.assign("/") },
  // Override the network send if you don't use `submit.endpoint`:
  send: async (payload) => fetch("/api/x", { method: "POST", body: JSON.stringify(payload) }),
});

form.mount(document.querySelector("#form")!);
```

### Default styling

Forms and grids ship with a **light, polished default theme** on first mount — no extra CSS required.
Built-in styles are scoped to `.fw-root` (forms) and `.gw-root` (grids) and injected once per page.

**Opt out** when you bring your own stylesheet or inline/Tailwind classes (set on `Form` options — `dom` is passed through to the renderer on mount):

```ts
// Skip built-in CSS (playground demos use this with their dark theme)
const form = new Form(schema, initialValues, { dom: { customStyles: true } });
form.mount(host);

// Or pass your own stylesheet URL instead of the default bundle
const themed = new Form(schema, values, { dom: { styles: "/my-form-theme.css" } });
themed.mount(host);

// Or disable injected styles entirely
const bare = new Form(schema, values, { dom: { styles: false } });
bare.mount(host);

// Grid — pass style options to mount()
mount(grid, host, { customStyles: true });
mount(grid, host, { styles: "/my-grid-theme.css" });
```

When `customStyles: true` or a custom `styles` URL is set, Formwright **does not** inject its default CSS.
Use schema `class` / `classes` on fields and actions for inline styling, or target `.fw-*` / `.gw-*` hooks in your own sheet.

### Live summary panel

A **live summary** lists filled field values as the user types. It is **on by default**; disable it on the form or hide individual fields:

```ts
const schema = {
  id: "checkout",
  version: "1.0",
  // summary: false,           // turn off entirely
  summary: { position: "bottom", title: "Your order" },
  fields: [
    { id: "name", type: "text", label: "Name" },
    { id: "coupon", type: "text", label: "Coupon", omitFromSummary: true },
    // or: summary: false on a field
  ],
};
```

Per-field opt-out: `omitFromSummary: true` or `summary: false`. Presentational fields (`heading`, `separator`, …) and empty values are never listed.

### Phone field (all countries)

Use `type: "phone"` for an international number with a **country selector** (every country, **SVG flags** on all platforms) and **per-country validation** powered by libphonenumber. The payload is `{ country, national }`:

```ts
{
  id: "mobile",
  type: "phone",
  label: "Mobile",
  phone: {
    defaultCountry: "US",
    preferredCountries: ["US", "GB", "CA"],
  },
  validation: { required: true }, // format: "phone" is implied
}
```

Import `@formwright/dom` so the phone validator is registered. Optional helpers: `formatPhoneDisplay`, `normalizePhoneValue`.

### Form caching (with user consent)

Add `persist` to the schema and a storage key in options. Values (and wizard step) restore on refresh:

```ts
const schema = {
  id: "application",
  version: "1.0",
  fields: [
    /* … */
  ],
  persist: {
    mode: "consent", // ask before saving — use "auto" to save on every change
    consentMessage: "Save your progress on this device?",
    consentLabel: "Save progress",
    declineLabel: "Not now",
    resumeMessage: "Welcome back — pick up where you left off?",
    resumeLabel: "Continue",
    discardLabel: "Start over",
  },
};

const form = new Form(schema, {}, { persistKey: "my-app-application" });
```

- **`mode: "consent"`** — shows an opt-in banner after the user edits; nothing is written until they accept.
- **`mode: "auto"`** (default) — saves on every change (previous behaviour).
- On restore → **resume banner**; on submit or `discardDraft()` → storage cleared.

### Async options (`$query`) with lazy load + preload

Use provider-backed options for `select`, `radio`, and `checkbox`.

```jsonc
{
  "id": "country",
  "type": "select",
  "label": "Country",
  "options": {
    "$query": ["countries", { "region": "na" }], // or just "countries"
    "lazy": true, // fetch when the user opens/focuses the field
    "preload": [{ "label": "United States", "value": "US" }], // show current value immediately
    "map": { "label": "name", "value": "code" }, // API row -> option shape
    "transform": "unwrapRows", // named transform in FormOptions
    "tanstack": { "staleTime": 60000, "retry": 1 }, // passthrough to query provider
  },
}
```

```ts
import { Form, createQueryProvider } from "@formwright/core";

const form = new Form(
  schema,
  { country: "US" },
  {
    // 1) Plug your own provider (e.g. TanStack Query adapter)
    providers: {
      query: createQueryProvider({
        countries: async () => {
          const res = await fetch("/api/countries");
          return res.json();
        },
      }),
    },
    // 2) Optional named transforms referenced by `options.transform`
    optionsTransforms: {
      unwrapRows: (data) => (data as { items: unknown[] }).items,
    },
  },
);
```

**Implementation example — lazy options + selected preload (select/radio/checkbox):**

```ts
import { Form, createQueryProvider } from "@formwright/core";
import "@formwright/dom";

const schema = {
  id: "shipping",
  version: "1.0",
  fields: [
    {
      id: "country",
      type: "select",
      label: "Country",
      options: {
        $query: "countries",
        lazy: true,
        // initial value is "US", so we show this label before fetch
        preload: [{ label: "United States", value: "US" }],
        map: { label: "name", value: "code" },
        transform: "unwrapRows",
        tanstack: { staleTime: 5 * 60_000, retry: 1 },
      },
    },
    {
      id: "shippingMethod",
      type: "radio",
      label: "Method",
      options: {
        $query: ["shippingMethods", { country: "{{country}}" }],
        lazy: true,
        map: { label: "title", value: "id" },
      },
    },
    {
      id: "addons",
      type: "checkbox",
      label: "Add-ons",
      options: {
        $query: "addons",
        lazy: true,
        map: { label: "title", value: "id" },
      },
    },
  ],
};

const form = new Form(
  schema,
  { country: "US", addons: ["gift-wrap"] },
  {
    providers: {
      query: createQueryProvider({
        countries: async () => fetch("/api/countries").then((r) => r.json()),
        shippingMethods: async (params) =>
          fetch(`/api/shipping?country=${params?.country ?? ""}`).then((r) => r.json()),
        addons: async () => fetch("/api/addons").then((r) => r.json()),
      }),
    },
    optionsTransforms: {
      unwrapRows: (data) => (data as { items: unknown[] }).items,
    },
  },
);

form.mount(document.getElementById("root")!);
```

- `lazy: true` defers the request until user interaction.
- `preload` keeps selected labels visible before the API returns.
- If your API already returns `{ label, value }[]`, omit `map`.
- For checkbox with options, payload is a selected-values array.

### Wrap fields/actions/title in custom tags

You can wrap field nodes, action buttons, and the form title with custom host tags (including web components).
Pass a single wrapper or an array — **the first entry wraps the element directly** (innermost), each later entry wraps outward.

Use `attrs` for HTML attributes (`data-*`, `aria-*`, booleans → empty attr) and `props` for element properties (e.g. `active` on a custom element).

```jsonc
{
  "title": {
    "text": "Profile",
    "tag": "h1",
    "class": "text-2xl",
    "wrapper": [
      { "tag": "my-title-shell", "props": { "active": true } },
      { "tag": "header", "class": "form-header" },
    ],
  },
  "fields": [
    {
      "id": "email",
      "type": "email",
      "wrapper": {
        "tag": "my-field-shell",
        "class": "field-card",
        "attrs": { "data-slot": "main", "data-active": true },
        "props": { "variant": "outlined" },
      },
    },
  ],
  "actions": [
    {
      "name": "save",
      "role": "submit",
      "widget": { "tag": "my-button" },
      "wrapper": [
        { "tag": "my-action-inner", "props": { "active": true } },
        { "tag": "my-action-outer", "attrs": { "data-kind": "primary" } },
      ],
    },
  ],
}
```

**Implementation example — custom wrappers for fields/actions/title:**

```ts
import { Form } from "@formwright/core";
import "@formwright/dom";

const schema = {
  id: "profile",
  version: "1.0",
  title: {
    text: "Profile",
    tag: "h1",
    wrapper: { tag: "header", class: "form-header" },
  },
  fields: [
    {
      id: "email",
      type: "email",
      label: "Email",
      wrapper: {
        tag: "my-field-shell",
        class: "field-shell",
        attrs: { "data-section": "contact", "data-active": true },
        props: { active: true },
      },
    },
    {
      id: "newsletter",
      type: "toggle",
      label: "Newsletter",
      labelPosition: "start",
      wrapper: {
        tag: "section",
        class: "setting-row",
        attrs: { "aria-label": "Newsletter setting" },
      },
    },
  ],
  actions: [
    {
      name: "save",
      role: "submit",
      label: "Save",
      widget: { tag: "my-button" },
      wrapper: [
        { tag: "my-action-inner", props: { active: true } },
        { tag: "my-action-shell", attrs: { "data-kind": "primary" } },
      ],
    },
    {
      name: "delete",
      role: "button",
      label: "Delete",
      variant: "danger",
      wrapper: { tag: "my-action-shell", attrs: { "data-kind": "danger" } },
    },
  ],
};

new Form(schema).mount(document.getElementById("root")!);
```

### React

The `Form` instance is render-agnostic — mount it into a ref:

```tsx
import { useEffect, useRef } from "react";
import { Form } from "@formwright/core";
import "@formwright/dom";

export function SignupForm({ schema }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const form = new Form(schema, { email: "" });
    form.mount(ref.current!);
    return () => form.destroy();
  }, [schema]);
  return <div ref={ref} />;
}
```

> First-party `@formwright/react`, `/vue`, and a `<formwright-form>` web component are on
> the roadmap; the core already supports them since it owns state independently of rendering.

## What you can build

A field is resolved to a widget by `type` and keyed by `id`.

### Field types

`text` · `email` · `password` · `number` · `textarea` · `select` · `radio` · `checkbox` ·
`toggle` · `color` · `range` · `phone` · `date` · `time` · `datetime` · `daterange` · `file` ·
`heading` · `separator` · `paragraph` (presentational) ·
`group` (nested object) · `collection` (repeatable list) ·
`steps` (wizard container) · `step` (one wizard step) —
plus any custom type via `registerWidget`.

### Conditional logic (as data)

`visibleWhen`, `enabledWhen`, and `requiredWhen` use a sandboxed JSONLogic-style algebra —
no `eval`:

```jsonc
{
  "id": "promoCode",
  "type": "text",
  "visibleWhen": {
    "and": [
      { "==": [{ "var": "plan" }, "pro"] },
      { "==": [{ "var": "billing" }, "annual"] },
      { "var": "agree" },
    ],
  },
}
```

Operators: `==` `!=` `>` `>=` `<` `<=` `in` `and` `or` `not` `var`.

### Nested objects and repeatable lists

```jsonc
{ "id": "billingAddress", "type": "group", "label": "Billing address", "layout": "accordion",
  "fields": [ { "id": "name", "type": "text" }, { "id": "city", "type": "text" } ] },

{ "id": "contacts", "type": "collection", "label": "Contacts", "layout": "cards",
  "itemLabel": "Contact", "minItems": 1, "maxItems": 4,
  "fields": [ { "id": "name", "type": "text" }, { "id": "email", "type": "email" } ] }
```

→ payload:

```jsonc
{
  "billingAddress": { "name": "Ada", "city": "London" },
  "contacts": [{ "name": "Grace", "email": "g@x.com" }],
}
```

Conditions resolve **lexically** (sibling → enclosing scope → form root), so an outer
toggle can hide a field nested inside a group or a collection row, and a field can react to
a sibling in its own row.

### Multi-step wizards

Wrap fields in a `steps` container; each child must be a `step` (like a titled group, shown
one at a time):

```jsonc
{
  "id": "wizard",
  "type": "steps",
  "layout": "fill", // "bar" | "tabs" | "numbers" | "fill" (thin % bar)
  "showProgress": true,
  "validateOnNext": true,
  "urlSync": "/apply/step/:step",
  "urlSyncBy": "id", // or "index" for zero-based step numbers in the URL
  "nextLabel": "Continue",
  "prevLabel": "Back",
  "submitLabel": "Create account",
  "fields": [
    {
      "id": "personal",
      "type": "step",
      "label": "Personal",
      "description": "Tell us about yourself.",
      "fields": [
        { "id": "name", "type": "text", "validation": { "kind": "string", "required": true } },
      ],
    },
    {
      "id": "account",
      "type": "step",
      "label": "Account",
      "fields": [
        {
          "id": "email",
          "type": "email",
          "validation": { "kind": "string", "format": "email", "required": true },
        },
      ],
    },
  ],
}
```

At the **form** level, pair wizard UX with draft persistence and a post-submit screen:

```jsonc
{
  "id": "signup",
  "version": "1.0",
  "fields": [
    /* …steps as above… */
  ],
  "submit": { "endpoint": { "method": "POST", "url": "/api/signup" } },
  "persist": {
    "mode": "consent",
    "consentMessage": "Save your application progress on this device?",
    "consentLabel": "Save progress",
    "declineLabel": "Not now",
    "resumeMessage": "You have a saved draft. Continue your application?",
    "resumeLabel": "Continue",
    "discardLabel": "Start over",
  },
  "success": {
    "heading": "Account created",
    "message": "Reference {{referenceId}} — confirmation sent to {{email}}.",
    "details": ["Plan: {{plan}}"],
    "actions": [
      { "name": "done", "label": "Done", "variant": "primary", "handler": "closeSuccess" },
    ],
  },
}
```

```ts
const form = new Form(
  schema,
  {},
  {
    persistKey: "my-app-draft",
    send: async (payload) => {
      const res = await fetch("/api/signup", { method: "POST", body: JSON.stringify(payload) });
      return res.json(); // { referenceId, email, plan } — fills {{…}} in success
    },
  },
);
```

→ payload:

```jsonc
{
  "wizard": {
    "personal": { "name": "Ada" },
    "account": { "email": "ada@example.com" },
  },
}
```

- **Next** validates the current step only; **Submit** (on the last step) validates every step.
- Inactive steps are skipped during step-by-step validation but included in the final payload.
- Imperative control: `form.findSteps()?.next()`, `.prev()`, `.goTo(index)`, `.goToId(id)`,
  `.validateStep()`.
- **Step events:** `form.on("step", ({ index, id }) => …)` when the active step changes.
- **URL sync:** `urlSync` updates the browser path as the user moves through steps; back/forward
  restores the step. Helpers exported from `@formwright/dom`: `readStepFromUrl`, `writeStepToUrl`.
- **Resume banner:** when `persistKey` restores a draft, a banner offers **Continue** or
  **Start over** (`form.dismissResumeBanner()`, `form.discardDraft()`).
- **Consent prompt:** when `persist.mode` is `"consent"`, nothing is written until the user agrees
  (`form.grantPersistConsent()`). Declining hides the prompt for the session
  (`form.declinePersistConsent()`). Works for single-page forms and multi-step wizards alike.
- **Success screen:** after a successful submit, the form body is replaced by the built-in template
  (`success` schema) or your own renderer. `{{key}}` placeholders are filled from the submit
  response via `form.successContext().interpolate("…")`.
- When a top-level `steps` field is present, the renderer supplies its own Back/Next/Submit bar
  (root `actions` are omitted).

**Custom success screen** (full UI control — React, Vue, plain DOM):

```ts
new Form(
  schema,
  {},
  {
    dom: {
      renderSuccess(ctx, host) {
        host.innerHTML = "";
        const h1 = document.createElement("h1");
        h1.textContent = ctx.interpolate("Ref {{referenceId}}");
        const btn = document.createElement("button");
        btn.textContent = "Back to home";
        btn.onclick = () => ctx.dismiss();
        host.append(h1, btn);
      },
    },
  },
);
```

Try it live: open the [Form Playground](https://aliarsalan177.github.io/formwright/playground.html) and pick
**Wizard — multi-step form (steps)** from the Example dropdown.

### Validation

Declarative rules — `required`, `min`/`max`, `minLength`/`maxLength`, `pattern`,
`format: "email" | "url" | "uuid"` — or bring any Standard-Schema validator (Zod / Valibot /
ArkType). Errors surface in **real time, field by field**, as the user types.

## Generate a form from natural language — with any model

`@formwright/ai` turns a description in **any language** into a **validated** schema. It's
provider-agnostic: Claude by default, GPT via your OpenAI client, or anything else through a
small adapter. A built-in validate→repair loop feeds errors back to the model until the schema
renders.

```ts
import { generateSchema, openaiProvider } from "@formwright/ai";
import { Form } from "@formwright/core";
import "@formwright/dom";

// Claude (default — uses ANTHROPIC_API_KEY, model claude-opus-4-8)
const { schema } = await generateSchema(
  "a 3-step signup wizard: personal info, account credentials, then preferences",
);
new Form(schema).mount(document.getElementById("root")!);

// …or GPT
import OpenAI from "openai";
await generateSchema("a contact form", { provider: openaiProvider({ client: new OpenAI() }) });
```

### JSON + TOON (both supported)

**JSON is canonical** — storage, APIs, npm types, and the default everywhere. **TOON** ([Token-Oriented Object Notation](https://toonformat.dev/)) is a lossless encoding of the same data model, useful for LLM prompts (fewer tokens).

```ts
import {
  serializeSchema,
  deserializeSchema,
  parseSchemaText,
  parseSchemaInput,
} from "@formwright/schema";

const schema = { id: "signup", version: "1.0", fields: [{ id: "email", type: "email" }] };

// Serialize either way
const json = serializeSchema(schema, "json");
const toon = serializeSchema(schema, "toon");

// Parse either way (auto-detects format)
parseSchemaText(json);
parseSchemaText(toon);

// Form accepts objects, JSON strings, or TOON strings
new Form(toon).mount(el);
```

For `@formwright/ai`:

```ts
await generateSchema("signup form", {
  promptFormat: "toon", // repair feedback in TOON (lower tokens)
  outputFormat: "auto", // accept JSON or TOON strings from the model
});
```

## Bring your own components (React / Vue / any)

A field renders with the built-in widget for its `type`, a **custom element**, or **your own
framework component** — chosen from the schema, wired with a tiny adapter. Whatever you set
flows straight into the payload.

```jsonc
// Custom element — no code, pure schema:
{ "id": "country", "type": "text", "widget": { "tag": "s-select", "event": "value-change" } }
```

```tsx
// A React component, registered once by name:
import { createRoot } from "react-dom/client";
import { registerWidget } from "@formwright/dom";

registerWidget("rating", {
  mount(host, b) {
    const root = createRoot(host);
    b.onValue((value) => root.render(<StarRating value={value} onChange={b.setValue} />));
    return () => root.unmount();
  },
});
// schema: { id: "score", type: "number", widget: "rating" }
```

The `WidgetBinding` (`b.value()`, `b.setValue()`, `b.onValue()`, `b.onEnabled()`, `b.onError()`,
`b.onInvalid()`, `b.onRequired()`) is the whole contract — Vue, Svelte, Solid, Angular plug in the
same ~8-line way. Add `toValue`/`fromValue` (inline or via `FormOptions.widgetTransforms`) to
translate between your component's shape and the stored value, or a native `file` widget for
uploads.

### Align custom components (`widget.bind`)

When your UI library uses different property names, map form state in the schema:

```jsonc
{
  "id": "email",
  "type": "email",
  "widget": {
    "tag": "my-text-field",
    "event": "value-change",
    "bind": {
      "value": "modelValue",
      "invalid": "hasError",
      "error": "errorMessage",
      "disabled": "isDisabled",
      "hideError": true,
    },
    "toValue": "normalizeIn",
    "fromValue": "normalizeOut",
  },
}
```

```ts
new Form(
  schema,
  {},
  {
    widgetTransforms: {
      normalizeIn: { toValue: (raw) => String(raw).trim().toLowerCase() },
      normalizeOut: { fromValue: (v) => v },
      readDetail: {
        read: (_el, ev) => (ev as CustomEvent).detail.payload,
      },
    },
  },
);
```

`bind` writes **properties** on the host element (not attributes) — ideal for custom elements
and web components. Set `hideError: true` (or map `error` / `invalid`) when your component
shows validation itself.

### Custom events & nested payloads

For components that emit non-standard shapes, use **`readPath`** (declarative) or a named **`read`** transform (full control):

```jsonc
{
  "id": "country",
  "type": "select",
  "widget": {
    "tag": "client-select",
    "event": "value-changed",
    "readPath": "detail.value.payload",
    "valueKey": "code",
    "valueMode": "single",
    "bind": { "value": "selected", "options": "choices" },
    "optionsMap": { "label": "name", "value": "code" },
  },
}
```

| Piece        | Role                                                          |
| ------------ | ------------------------------------------------------------- |
| `event`      | DOM event name (`value-changed`, not `change`)                |
| `readPath`   | Dot-path on the event (`detail.value.payload`)                |
| `valueKey`   | Pull `code` from `{ code, name }` objects                     |
| `valueMode`  | `"single"` or `"multi"` (checkbox groups)                     |
| `valueShape` | Write back as `"scalar"`, `"object"`, or `"object[]"`         |
| `optionsMap` | Map form options → component choice objects on `bind.options` |

**Multiselect** — same idea with `valueMode: "multi"` and `valueShape: "object[]"`:

```jsonc
{
  "id": "tags",
  "type": "checkbox",
  "widget": {
    "tag": "client-multi",
    "event": "value-changed",
    "readPath": "detail.value.payload",
    "valueKey": "id",
    "valueMode": "multi",
    "valueShape": "object[]",
    "bind": { "value": "selectedItems", "options": "choices" },
    "optionsMap": { "label": "title", "value": "id" },
  },
}
```

For one-off logic, point `widget.read` / `widget.toValue` at `widgetTransforms` instead of `readPath` / `valueKey`.

### Accordion layout (`widget` on `group` / `collection`)

When `layout` is `"accordion"`, override the native `<details>` / `<summary>` shell:

```jsonc
{
  "id": "billing",
  "type": "group",
  "label": "Billing address",
  "layout": "accordion",
  "widget": {
    "tag": "my-accordion",
    "headerTag": "my-accordion-header",
    "bodyTag": "my-accordion-panel",
    "titleProp": "heading",
    "openProp": "expanded",
    "attrs": { "variant": "bordered" },
  },
  "fields": [{ "id": "city", "type": "text", "label": "City" }],
}
```

Collection rows with `layout: "accordion"` use the same `widget` on the collection field.
Register a reusable shell with `registerAccordionWidget("my-accordion", { tag: "my-accordion", … })`
and reference it via `"widget": "my-accordion"` or `"widget": { "component": "my-accordion" }`.

### StencilJS / Lit / any web component

A component that compiles to a custom element (Stencil, Lit, Angular Elements…) needs **no
adapter at all** — just point the schema at its tag, value property, and change event. The
[Form playground](https://aliarsalan177.github.io/formwright/playground.html) ships a live `<fw-rating>` demo:

```jsonc
// <fw-rating value="..."> emits a `rating-change` event
{
  "id": "score",
  "type": "number",
  "widget": { "tag": "fw-rating", "event": "rating-change", "valueProp": "value" },
}
```

```ts
// your-rating.tsx (Stencil)
@Component({ tag: "fw-rating" })
export class FwRating {
  @Prop({ mutable: true }) value = 0;
  @Event() ratingChange: EventEmitter<{ value: number }>;
  // …render stars; on click: this.value = n; this.ratingChange.emit({ value: n })
}
```

### Vue, Svelte, Solid

Each is the same `mount` adapter as React above — render the component into `host`, call
`b.setValue` on change, and `b.onValue` to push updates back in. See `registerWidget` in
[`@formwright/dom`](https://www.npmjs.com/package/@formwright/dom).

## Styling — your CSS or Tailwind, your layout

The renderer ships **unstyled** with stable class hooks (`.fw-field`, `.fw-group`, `.fw-steps`,
`.fw-step-panel`, `.fw-progress-fill`, `.fw-persist-consent`, `.fw-resume-banner`, `.fw-success`, `.fw-error`,
`.fw-switch`, …) — bring your own stylesheet. Or override per field, right in the schema, with
any classes or **Tailwind utilities**:

```jsonc
{
  "id": "email",
  "type": "email",
  "label": "Email",
  "class": "md:col-span-2",
  "classes": {
    "field": "rounded-xl bg-slate-50 p-3",
    "label": "text-sm font-medium text-slate-600",
    "control": "w-full rounded-lg border px-3 py-2 focus:ring-2",
    "error": "text-red-600 text-xs",
  },
}
```

`class` lands on the field wrapper; `classes` targets the wrapper, label, control, help,
description, and error parts individually — so you control layout (grid spans, spacing) and look
without touching the engine.

## Imperative API

```ts
// Stateless consumption — you never manage state. `subscribe` pushes the latest
// values immediately and on every change; `getValues()` is an on-demand snapshot.
const off = form.subscribe((values) => render(values)); // returns an unsubscribe
form.getValues(); // plain snapshot of all values right now

form.values; // the underlying reactive signal (`.get()` / `.peek()`)
form.getValue("billingAddress.name");
form.setValue("country", "US");
form.isDirty;
form.isValid;
form.isSubmitting; // computed signals
form.showSuccessScreen; // true after submit when success UI is configured
form.successData; // last successful submit response
form.showResumeBanner; // true when a persisted draft was restored
form.showPersistConsent; // true when consent is needed before saving
form.persistConsented; // true after the user opted in to local storage
form.on("change" | "submit" | "success" | "error" | "step", handler);
form.findSteps()?.next(); // wizard navigation
form.grantPersistConsent(); // start saving draft locally (consent mode)
form.declinePersistConsent(); // hide consent prompt for this session
form.discardDraft(); // clear persistKey storage + reset (resume banner)
form.successContext().interpolate("Ref {{id}}"); // fill {{…}} from submit response
await form.submit(); // validate → transform → send → onSuccess/onError
form.reset();
form.destroy();
```

## Security model

Formwright treats a schema as **data, not code**. Every schema-provided string —
`label`, `content`, `placeholder`, `description`, option labels, `props` — is rendered as
**text** (`textContent`), never as HTML. There is no `innerHTML` path and no `eval`: conditions
(`visibleWhen` / `enabledWhen` / `requiredWhen`) run through a sandboxed JSONLogic-style
evaluator over your data, not the JavaScript engine. This means a schema from an untrusted source
— an LLM (`@formwright/ai`), a database, or a form-builder backend — **cannot inject markup or
execute script** through the renderer.

Two integration responsibilities remain yours, as with any app:

- **Custom widgets / `mount`** — if you map a field to your own component, you are responsible for
  how that component renders values (e.g. don't pass field values to `innerHTML` /
  `dangerouslySetInnerHTML`).
- **Submission** — the payload is validated client-side for UX, but, like any client, treat it as
  untrusted on the server: always re-validate and authorize there.

## Gridwright — schema-driven data grid

A sibling package in this monorepo: **Gridwright** applies the same idea to data grids — a grid
described as **data** (column defs), rendered by a tiny **signal-reactive, virtual-DOM-free**
engine. Each row's data is its own signal, so a single cell updates **surgically** (no row
re-render, no reflow) — the property that makes real-time data smooth where framework-reconciled
grids stutter. It ships the features AG Grid charges for — **for free, MIT**.

**Install:**

```bash
npm i @formwright/grid-core @formwright/grid-dom
```

**Live demo:** https://aliarsalan177.github.io/formwright/grid.html (Live 50k · Server pagination ·
Master/detail + selection · Grouping + aggregation · Your-data) — the whole runtime + demo is
**~8 KB gzipped**.

```ts
import { Grid } from "@formwright/grid-core";
import { mount } from "@formwright/grid-dom";

const grid = new Grid(
  {
    id: "trades",
    columns: [
      { field: "symbol", width: 110 },
      { field: "price", type: "number", valueFormatter: "currency", editable: true },
      { field: "change", type: "number", cellRenderer: "change" },
      { field: "status", cellRenderer: "badge" },
    ],
  },
  rows, // your array — or omit and pass a `datasource` for server mode
  { pagination: { pageSize: 25 }, selection: "multi", masterDetail: true },
);

mount(grid, document.getElementById("app")!, {
  // master/detail: render anything for an expanded row — including another grid
  detail: (row, panel) => {
    /* mount a sub-grid, a form, a chart… */
  },
});

// Stateless consumption — you never mirror state; subscriptions push the latest.
grid.subscribe((rows) => render(rows)); // any cell/row/dataset change → latest rows
grid.onSelectionChange((selectedRows) => updateBulkBar(selectedRows));
grid.onStateChange(() => persist(/* sort / filter / page / grouping changed */));
grid.getData(); // plain snapshot of the current rows
```

| Capability             | Gridwright                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Virtualization**     | Row windowing + DOM node pooling — only the visible window is in the DOM (tested at 50k rows)                                                                          |
| **Surgical updates**   | A cell update re-renders only that cell; a live tick does **not** resort the view                                                                                      |
| **Stateless API**      | `subscribe` / `onSelectionChange` / `onStateChange` push the latest on every change; `getData()` snapshots — the consumer never mirrors state                          |
| **Pagination**         | Client-side or **server-side** (`datasource` returns `{ rows, total }`); built-in pager (first/prev/next/last), reactive `pagination()` state, `setPage`/`setPageSize` |
| **Selection**          | `single` / `multi`, select-all-on-page, `selectedRows()` for bulk actions                                                                                              |
| **Master / detail**    | Expandable rows; the detail panel renders anything — including another paginated grid from a second API                                                                |
| **Grouping**           | Multi-level `groupBy` + per-column `aggFunc` (sum/avg/min/max/count); expandable group rows with subtotals + a **grand-total footer** — free                           |
| **Editing**            | Inline cell editing (double-click), composable with live updates                                                                                                       |
| **Filtering**          | Global filter across all columns **and** per-column filters                                                                                                            |
| **Sorting**            | **Multi-column** (shift-click), type-aware comparators; header shows priority order                                                                                    |
| **Columns**            | Reactive **resize** (drag), **reorder** (drag header), **pinning** (sticky left/right), and **visibility** — driven by a reactive column model                         |
| **Accessibility**      | Full ARIA grid roles + `aria-sort`/`selected`/`expanded`/`rowcount`                                                                                                    |
| **Export**             | CSV (`toCsv` / `downloadCsv`); no-rows + loading overlays                                                                                                              |
| **Framework-agnostic** | One engine; bring your own framework via thin adapters (planned)                                                                                                       |

Packages: [`@formwright/grid-schema`](https://www.npmjs.com/package/@formwright/grid-schema) ·
[`@formwright/grid-core`](https://www.npmjs.com/package/@formwright/grid-core) ·
[`@formwright/grid-dom`](https://www.npmjs.com/package/@formwright/grid-dom).
Both Formwright and Gridwright share
[`@formwright/reactive`](https://www.npmjs.com/package/@formwright/reactive), the extracted
zero-dependency signal core — so a Gridwright cell editor can be a Formwright field.
See [TABLE_PLAN.md](TABLE_PLAN.md) for the roadmap.

## In production: Next.js App Router

Everything below is lifted from [GymOS](https://gymos.shop), a multi-tenant SaaS that runs both
packages on every screen — 40-odd forms and every table view. It is the integration layer the
API reference does not cover: server actions, server-side validation, and swapping the built-in
widgets for a design system.

### One client wrapper, reused by every form

The engine is framework-agnostic, so React's only job is to own a `<div>` and hand it over.
Write this once:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { Form, type FormSchema } from "@formwright/core";
import "@formwright/dom";

type SubmitResult = { fieldErrors?: Record<string, string>; error?: string } | void;

export function SchemaForm({
  schema,
  values,
  onSubmit,
}: {
  schema: FormSchema;
  values?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>, form: Form) => Promise<SubmitResult>;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const form = new Form(schema, values ?? {}, {
      // `send` is the engine's submit hook: it owns the pending state,
      // disables the actions and re-enables them when this resolves.
      send: async (payload) => {
        const result = await onSubmit(payload ?? form.getValues(), form);
        if (result?.fieldErrors) {
          form.setErrors(result.fieldErrors);
          throw new Error("validation"); // keeps the form in its error state
        }
        if (result?.error) throw new Error(result.error);
        return result ?? {};
      },
    });
    const dispose = form.mount(el);
    return () => {
      dispose?.();
      form.destroy();
    };
  }, [schema, values, onSubmit]);

  return <div ref={host} />;
}
```

Two things that will bite you if you skip them:

- **Memoise `schema`, `values` and `onSubmit`.** They are effect dependencies, so a fresh object
  literal on every render tears the form down and rebuilds it — losing focus mid-typing. Wrap
  them in `useMemo` / `useCallback`.
- **`form.destroy()` in the cleanup**, not just the mount disposer. The disposer unbinds the DOM;
  `destroy` releases the signal subscriptions.

### Calling a server action

Server actions take `FormData`, and the engine hands you plain values, so convert between them:

```ts
export function valuesToFormData(values: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value == null) continue;
    if (typeof value === "boolean") {
      if (value) fd.set(key, "on"); // unchecked boxes are absent, as in a real form post
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) fd.append(key, String(item));
      continue;
    }
    fd.set(key, String(value));
  }
  return fd;
}
```

Then a form is a schema, a `useMemo`, and one call:

```tsx
"use client";

export function GymProfileForm({ initial }: { initial: GymProfile }) {
  const schema: FormSchema = useMemo(
    () => ({
      id: "gym-profile",
      version: "1",
      fields: [
        {
          id: "name",
          type: "text",
          label: "Gym name",
          colSpan: 12,
          validation: { kind: "string", required: true, maxLength: 120 },
        },
        { id: "address", type: "text", label: "Address", colSpan: 12 },
        { id: "city", type: "text", label: "City", colSpan: 6 },
        { id: "phone", type: "phone", label: "Phone", colSpan: 6 },
      ],
      actions: [{ name: "submit", role: "submit", label: "Save" }],
      actionsAlign: "end",
    }),
    [],
  );

  const values = useMemo(() => ({ ...initial }), [initial]);
  const onSubmit = useCallback(
    (vals: Record<string, unknown>) => saveGymProfileAction(valuesToFormData(vals)),
    [],
  );

  return <SchemaForm schema={schema} values={values} onSubmit={onSubmit} />;
}
```

### Server validation, mapped back onto the fields

Validate on the server regardless of what the schema says — client validation is a convenience,
not a boundary. Return field errors keyed by field `id` and the engine paints them in place:

```ts
"use server";

export async function saveGymProfileAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { fieldErrors: { name: "Gym name is required." } };

  await db.tenant.update({ where: { id: tenantId }, data: { name } });
  revalidatePath("/settings/general");
}
```

### The redirect gotcha

A server action that calls `redirect()` signals it by **throwing**. Left alone, that surfaces as a
failed submit and the form paints an error a moment before the browser navigates away. Swallow it:

```ts
function isNextRedirectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const digest = "digest" in error && error.digest != null ? String(error.digest) : "";
  return digest.startsWith("NEXT_REDIRECT");
}

// inside `send`
try {
  return (await onSubmit(payload, form)) ?? {};
} catch (error) {
  if (isNextRedirectError(error)) return {}; // a redirect is a success
  throw error;
}
```

### Using your own components instead of the built-ins

This is the part worth the integration effort: `registerWidget` replaces a field type's renderer
globally, so a schema stays portable while every `select` becomes _your_ select. The binding is
signal-driven, not prop-driven — subscribe to it and re-render:

```tsx
import { registerWidget, type WidgetBinding } from "@formwright/dom";
import { createRoot } from "react-dom/client";

function mountReactWidget(host, binding: WidgetBinding, render) {
  const root = createRoot(host);
  const state = { value: binding.value(), enabled: true };
  const paint = () => root.render(render(state.value, state.enabled));
  binding.onValue((value) => {
    state.value = value;
    paint();
  });
  binding.onEnabled((enabled) => {
    state.enabled = enabled;
    paint();
  });
  // Unmount on a microtask — React refuses to unmount during a render pass.
  return () => queueMicrotask(() => root.unmount());
}

registerWidget("select", {
  mount: (host, binding) =>
    mountReactWidget(host, binding, (value, enabled) => (
      <MySelect
        id={binding.field.domId}
        value={value == null ? "" : String(value)}
        disabled={!enabled}
        onChange={(next) => binding.setValue(next)}
        options={(binding.field.schema.options ?? []).map((o) => ({
          value: String(o.value ?? ""),
          label: String(o.label ?? o.value ?? ""),
        }))}
      />
    )),
});
```

Register once, at module scope behind a guard — registration is global, and doing it inside a
component re-registers on every mount.

For a widget that draws its own label (a toggle, say), hide the one the engine rendered:

```ts
host.closest(".fw-field")?.querySelector(":scope > label")?.classList.add("sr-only");
```

### Grids: columns as data, cells as your components

Same shape — a memoised schema, a host `<div>`, and `mount`:

```tsx
"use client";

import { Grid } from "@formwright/grid-core";
import { mount, registerCellRenderer } from "@formwright/grid-dom";

registerCellRenderer("statusBadge", (value) => {
  const el = document.createElement("span");
  el.className = `badge badge--${String(value).toLowerCase()}`;
  el.textContent = String(value);
  return el;
});

export function PackagesGrid({ rows }: { rows: Row[] }) {
  const host = useRef<HTMLDivElement>(null);

  const schema = useMemo(
    () => ({
      id: "packages",
      columns: [
        { field: "name", header: "Package", flex: 2, minWidth: 160 },
        { field: "priceLabel", header: "Price", width: 120 },
        { field: "durationLabel", header: "Duration", width: 120 },
        { field: "status", header: "Status", width: 90, cellRenderer: "statusBadge" },
      ],
    }),
    [],
  );

  useEffect(() => {
    const grid = new Grid(schema, rows, {
      selection: "multi",
      pagination: { pageSize: 25 },
    });
    const dispose = mount(grid, host.current!);
    const off = grid.onSelectionChange((selected) => setBulkBar(selected));
    return () => {
      off?.();
      dispose?.();
    };
  }, [schema, rows]);

  return <div ref={host} />;
}
```

The grid owns sort, filter, page and selection internally — do not mirror them into React state.
Subscribe (`onSelectionChange`, `onStateChange`, `subscribe`) and read `getData()` when you need a
snapshot. Mirroring is what makes framework grids stutter, and it is the mistake this engine
exists to avoid.

### Rendering both on a page that streams

Both engines mount in `useEffect`, so they are client-only by definition. In the App Router that
means the page stays a server component and only the grid or form is a `"use client"` island —
the table data is fetched server-side, passed as plain rows, and the client bundle carries the
engine but none of the data-fetching code.

## Packages

| Package                                                                            | Description                                                   |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------- |
| Package                                                                            | Description                                                   | Size (min+gzip)  |
| ------------------------------------------------------------------------           | ----------------------------------------------------          | ---------------- |
| [`@formwright/schema`](https://www.npmjs.com/package/@formwright/schema)           | Schema types + dependency-free validator                      | ~1.2 KB          |
| [`@formwright/core`](https://www.npmjs.com/package/@formwright/core)               | Signal reactivity + the `Form` class                          | ~5.8 KB          |
| [`@formwright/dom`](https://www.npmjs.com/package/@formwright/dom)                 | Surgical direct-DOM renderer + widget adapters                | ~4.8 KB          |
| [`@formwright/ai`](https://www.npmjs.com/package/@formwright/ai)                   | Generate a validated schema from a description (any language) | optional, server |
| **Formwright runtime** (`schema` + `core` + `dom`)                                 | Everything above to render & submit a form                    | **~12 KB**       |
| [`@formwright/grid-schema`](https://www.npmjs.com/package/@formwright/grid-schema) | Grid/column schema types + validator                          | ~1.5 KB          |
| [`@formwright/grid-core`](https://www.npmjs.com/package/@formwright/grid-core)     | Signal-reactive grid engine (sort, filter, pagination, …)     | ~5 KB            |
| [`@formwright/grid-dom`](https://www.npmjs.com/package/@formwright/grid-dom)       | Virtualized direct-DOM renderer                               | ~4 KB            |
| [`@formwright/reactive`](https://www.npmjs.com/package/@formwright/reactive)       | Shared zero-dep signal engine (Formwright + Gridwright)       | ~1 KB            |
| **Gridwright runtime** (`schema` + `core` + `dom`)                                 | Virtualized grid with surgical cell updates                   | **~8 KB**        |

**No third-party runtime dependencies** (the only dependency is `@formwright/reactive`, our own
zero-dependency signal core, shared with the Gridwright data grid). Tree-shakeable subpath
exports — pull only what you use. Ships
ESM + CJS + types, and works straight from a CDN (`esm.sh`) with no build step. For comparison,
that's smaller than most single-purpose form libraries — and it includes validation, conditional
logic, nesting, i18n, custom widgets, and the submission pipeline in the box.

## Run the playground locally

```bash
git clone https://github.com/aliarsalan177/formwright.git
cd formwright
pnpm install
pnpm build
pnpm --filter @formwright/playground dev
```

Open [http://localhost:5173](http://localhost:5173) for the project home and links to all demos, or
[http://localhost:5173/playground.html](http://localhost:5173/playground.html) for the form
playground and [http://localhost:5173/grid.html](http://localhost:5173/grid.html) for Gridwright.

Edit a schema on the left, watch the form render live in the middle, and see the live
values + submitted payload on the right.

## Development

```bash
pnpm install
pnpm build       # build all packages (turbo)
pnpm test        # run unit tests
pnpm typecheck   # type-check all packages
pnpm format      # prettier
pnpm storybook   # component catalog @ http://localhost:6006
pnpm build-storybook
```

### Storybook

`apps/storybook` is an interactive catalog of Formwright and Gridwright features:

| Section                    | Stories                                                                        |
| -------------------------- | ------------------------------------------------------------------------------ |
| **Formwright / Forms**     | Sign up, checkout, showcase                                                    |
| **Formwright / Wizard UX** | Full UX, bar/tabs/numbers progress                                             |
| **Gridwright**             | Live updates, server pagination, master/detail, grouping, your data            |
| **Apps**                   | Forge, theme builder, settings builder (mini embeds + full playground iframes) |

```bash
pnpm storybook               # dev server on port 6006
pnpm build-storybook         # static site → apps/storybook/dist
pnpm build-storybook:pages   # GitHub Pages base path (/formwright/storybook/)
```

**Live:** [Storybook on GitHub Pages](https://aliarsalan177.github.io/formwright/storybook/) (deployed with the playground via GitHub Actions).

See also [SKELETON_PLAN.md](SKELETON_PLAN.md) for the upcoming schema-driven skeleton loaders and wizard step transitions.

pnpm + Turborepo monorepo; releases automated with
[changesets](https://github.com/changesets/changesets). See
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Roadmap

- `@formwright/wc` web component + `@formwright/react` / `/vue` adapters
- `@formwright/codegen` — compile a schema to idiomatic React / Vue / HTML source
- First-party providers (i18n, TanStack Query, theming)
- Standard Schema / Valibot validation bridge

## License

MIT
