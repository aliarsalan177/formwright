/**
 * Formwright Playground.
 *
 * Edit or generate a schema on the left → the form renders live in the middle
 * (surgical DOM updates, no framework) → fill it and submit to see the payload
 * on the right. Demonstrates the full `new Form(schema).mount(el)` loop.
 */
import { Form, effect, type FormSchema } from "@formwright/core";
import { validateSchema } from "@formwright/schema";
import "@formwright/dom"; // registers the default DOM renderer
import { defineComponents } from "./components.js"; // demo <fw-rating> web component
import "./styles.css";

defineComponents();

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const schemaEl = $<HTMLTextAreaElement>("schema");
const statusEl = $<HTMLParagraphElement>("schema-status");
const hostEl = $<HTMLDivElement>("form-host");
const valuesEl = $<HTMLPreElement>("values");
const payloadEl = $<HTMLPreElement>("payload");

const SIGNUP: FormSchema = {
  id: "signup",
  version: "1.0",
  title: "Create your account",
  fields: [
    {
      id: "email",
      type: "email",
      label: "Email",
      placeholder: "you@example.com",
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
        { label: "United Kingdom", value: "UK" },
      ],
    },
    {
      id: "state",
      type: "text",
      label: "State",
      help: "Shown only when Country is United States.",
      visibleWhen: { "==": [{ var: "country" }, "US"] },
      requiredWhen: { "==": [{ var: "country" }, "US"] },
    },
    { id: "newsletter", type: "toggle", label: "Send me product updates" },
  ],
};

// Demonstrates: a nested `group` (object payload), a repeatable `collection`
// (array-of-objects, add/remove with min/max), and cross-scope conditions —
// an outer toggle hiding fields *inside* the group and each collection row,
// one toggle hiding two fields, and a field shown only when a select + radio +
// toggle all match. Plus accordion/card layouts and iOS-style toggles.
const CHECKOUT: FormSchema = {
  id: "checkout",
  version: "1.0",
  title: "Checkout",
  fields: [
    {
      id: "email",
      type: "email",
      label: "Email",
      placeholder: "you@example.com",
      validation: { kind: "string", format: "email", required: true },
    },
    {
      id: "plan",
      type: "select",
      label: "Plan",
      placeholder: "Choose a plan…",
      options: [
        { label: "Free", value: "free" },
        { label: "Pro", value: "pro" },
        { label: "Enterprise", value: "enterprise" },
      ],
    },
    {
      id: "billing",
      type: "radio",
      label: "Billing cycle",
      options: [
        { label: "Monthly", value: "monthly" },
        { label: "Annual", value: "annual" },
      ],
    },
    { id: "agree", type: "toggle", label: "I accept the terms of service" },
    // A custom Web Component (StencilJS-style) mapped straight from the schema,
    // plus a custom CSS class on the wrapper (use Tailwind utilities here too).
    {
      id: "satisfaction",
      type: "number",
      label: "How satisfied are you?",
      widget: { tag: "fw-rating", event: "rating-change", valueProp: "value" },
      classes: { field: "demo-highlight" },
    },
    {
      id: "promoCode",
      type: "text",
      label: "Promo code",
      help: "Shown only when Plan = Pro AND Billing = Annual AND terms accepted.",
      visibleWhen: {
        and: [
          { "==": [{ var: "plan" }, "pro"] },
          { "==": [{ var: "billing" }, "annual"] },
          { var: "agree" },
        ],
      },
    },

    // One toggle that hides TWO fields at once.
    { id: "expedited", type: "toggle", label: "Expedited shipping" },
    {
      id: "giftWrap",
      type: "checkbox",
      label: "Add gift wrap",
      visibleWhen: { not: { var: "expedited" } },
    },
    {
      id: "giftMessage",
      type: "text",
      label: "Gift message",
      visibleWhen: { not: { var: "expedited" } },
    },

    // An outer toggle that hides fields nested inside a group AND a collection.
    { id: "reuseBilling", type: "toggle", label: "Use billing address everywhere" },

    // Nested object → payload `billingAddress: { ... }`.
    {
      id: "billingAddress",
      type: "group",
      label: "Billing address",
      layout: "accordion",
      fields: [
        {
          id: "name",
          type: "text",
          label: "Full name",
          validation: { kind: "string", required: true },
        },
        { id: "street", type: "text", label: "Street" },
        { id: "city", type: "text", label: "City" },
        {
          id: "deliveryNote",
          type: "text",
          label: "Delivery note",
          help: "Hidden by the outer 'Use billing address everywhere' toggle.",
          visibleWhen: { not: { var: "reuseBilling" } },
        },
      ],
    },

    // Repeatable list of objects → payload `contacts: [{ ... }, { ... }]`.
    {
      id: "contacts",
      type: "collection",
      label: "Additional contacts",
      layout: "cards",
      itemLabel: "Contact",
      addLabel: "+ Add contact",
      minItems: 1,
      maxItems: 4,
      fields: [
        {
          id: "name",
          type: "text",
          label: "Name",
          validation: { kind: "string", required: true },
        },
        {
          id: "relation",
          type: "select",
          label: "Relation",
          placeholder: "Select…",
          options: [
            { label: "Family", value: "family" },
            { label: "Friend", value: "friend" },
            { label: "Colleague", value: "colleague" },
          ],
        },
        // Sibling condition INSIDE the row: show only when this row's relation = Colleague.
        {
          id: "company",
          type: "text",
          label: "Company",
          visibleWhen: { "==": [{ var: "relation" }, "colleague"] },
        },
        // Hidden by the OUTER toggle — resolves up the scope chain from the row.
        {
          id: "address",
          type: "text",
          label: "Address",
          visibleWhen: { not: { var: "reuseBilling" } },
        },
      ],
    },
  ],
  submit: { endpoint: { method: "POST", url: "/api/checkout" } },
};

// Shows off the authoring/UX features: static elements, tooltips, an iOS toggle
// with the label at the start, a file input, multilingual fields, a custom message,
// and configurable action buttons (submit + delete).
const SHOWCASE: FormSchema = {
  id: "showcase",
  version: "1.0",
  title: "Product",
  locales: ["en", "ar"],
  rtlLocales: ["ar"],
  fields: [
    { id: "section", type: "heading", label: "Basic details" },
    {
      id: "note",
      type: "paragraph",
      content: "Fields below show tooltips, i18n, a slot, and validation.",
    },
    {
      id: "name",
      type: "text",
      label: "Product name",
      localized: true,
      tooltip: "One value per language; switch with the EN/AR tabs",
      validation: { kind: "string", required: true, messages: { required: "A name is required" } },
    },
    {
      id: "price",
      type: "number",
      label: "Price",
      tooltip: "Whole dollars",
      slots: { start: "$" },
      validation: { kind: "number", min: 1, messages: { min: "Price must be at least $1" } },
    },
    { id: "div", type: "separator" },
    { id: "section2", type: "heading", label: "Options" },
    { id: "inStock", type: "toggle", label: "In stock", labelPosition: "start" },
    { id: "featured", type: "toggle", label: "Feature on homepage", labelPosition: "start" },
    {
      id: "images",
      type: "file",
      label: "Product images",
      description: "Drag & drop, or browse. PNG or JPG.",
      props: { accept: "image/*", multiple: true },
    },
  ],
  actionsAlign: "between",
  actions: [
    { name: "delete", role: "button", label: "Delete", variant: "danger", handler: "removeItem" },
    { name: "save", role: "submit", label: "Save product", variant: "primary" },
  ],
};

const EXAMPLES: Record<string, FormSchema> = {
  checkout: CHECKOUT,
  showcase: SHOWCASE,
  signup: SIGNUP,
};
const STARTER = CHECKOUT;

let currentForm: Form | null = null;
let disposeValues: (() => void) | null = null;

/** (Re)build the Form from the textarea contents and mount it. */
function rebuild(): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(schemaEl.value);
  } catch (err) {
    setStatus("error", `JSON parse error: ${(err as Error).message}`);
    return;
  }

  const result = validateSchema(parsed);
  if (!result.ok) {
    setStatus(
      "error",
      "Invalid schema:\n" + result.issues.map((i) => `• ${i.path}: ${i.message}`).join("\n"),
    );
    return;
  }

  // Tear down the previous instance before mounting a new one.
  disposeValues?.();
  currentForm?.destroy();
  hostEl.replaceChildren();
  payloadEl.textContent = "— submit the form —";

  const form = new Form(
    result.value,
    {},
    {
      send: async (payload) => payload,
      // Named handlers referenced by schema actions (e.g. the Showcase "Delete" button).
      handlers: {
        removeItem: () => setStatus("ok", "🗑  Delete action fired (handler: removeItem)"),
      },
    },
  );
  currentForm = form;

  form.on("submit", (payload) => {
    payloadEl.textContent = JSON.stringify(payload, null, 2);
    payloadEl.classList.add("ok");
  });
  form.on("action", (p) => setStatus("ok", `Action: ${(p as { name: string }).name}`));

  form.mount(hostEl);

  // Live values panel — a single effect that re-runs only when values change.
  disposeValues = effect(() => {
    valuesEl.textContent = JSON.stringify(form.values.get(), null, 2);
  });

  const count = result.value.fields.length;
  setStatus("ok", `✓ Valid schema · ${count} field${count === 1 ? "" : "s"} rendered`);
}

function setStatus(kind: "ok" | "error", message: string): void {
  statusEl.textContent = message;
  statusEl.className = `status ${kind}`;
}

/** Append a field built from the small "add field" form to the schema. */
function addField(): void {
  const id = $<HTMLInputElement>("b-id").value.trim();
  const label = $<HTMLInputElement>("b-label").value.trim();
  const type = $<HTMLSelectElement>("b-type").value;
  const required = $<HTMLInputElement>("b-required").checked;

  if (!id) {
    setStatus("error", "Enter a field id to add.");
    return;
  }

  let schema: FormSchema;
  try {
    schema = JSON.parse(schemaEl.value) as FormSchema;
  } catch {
    setStatus("error", "Fix the schema JSON before adding a field.");
    return;
  }

  if (schema.fields.some((f) => f.id === id)) {
    setStatus("error", `A field with id "${id}" already exists.`);
    return;
  }

  const field: Record<string, unknown> = { id, type };
  if (label) field["label"] = label;
  if (required)
    field["validation"] = { kind: type === "number" ? "number" : "string", required: true };
  if (type === "select" || type === "radio") {
    field["options"] = [
      { label: "Option A", value: "a" },
      { label: "Option B", value: "b" },
    ];
  }

  const next: FormSchema = { ...schema, fields: [...schema.fields, field as never] };
  schemaEl.value = JSON.stringify(next, null, 2);

  // Reset the builder inputs and re-render.
  $<HTMLInputElement>("b-id").value = "";
  $<HTMLInputElement>("b-label").value = "";
  $<HTMLInputElement>("b-required").checked = false;
  rebuild();
}

/** Load a named example into the editor and re-render. */
function loadExample(name: string): void {
  const schema = EXAMPLES[name];
  if (!schema) return;
  schemaEl.value = JSON.stringify(schema, null, 2);
  rebuild();
}

// Wire up interactions.
schemaEl.addEventListener("input", debounce(rebuild, 250));
$<HTMLButtonElement>("b-add").addEventListener("click", addField);
$<HTMLSelectElement>("example").addEventListener("change", (e) => {
  loadExample((e.target as HTMLSelectElement).value);
});

// Boot.
schemaEl.value = JSON.stringify(STARTER, null, 2);
rebuild();

function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
