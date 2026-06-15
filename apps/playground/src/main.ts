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
import { defineComponents, defineIconPicker } from "./components.js"; // demo widgets
import "./styles.css";

defineComponents();
defineIconPicker(); // registers the "icon" widget (bring your own icon source)

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const schemaEl = $<HTMLTextAreaElement>("schema");
const statusEl = $<HTMLParagraphElement>("schema-status");
const hostEl = $<HTMLDivElement>("form-host");
const valuesEl = $<HTMLPreElement>("values");
const payloadEl = $<HTMLPreElement>("payload");
const featureBarEl = $<HTMLDivElement>("feature-bar");
const demoActionsEl = $<HTMLDivElement>("demo-actions");
const featureLegendEl = $<HTMLUListElement>("feature-legend");
const chipStep = $<HTMLSpanElement>("chip-step");
const chipUrl = $<HTMLSpanElement>("chip-url");
const chipConsent = $<HTMLSpanElement>("chip-consent");
const chipResume = $<HTMLSpanElement>("chip-resume");
const chipSuccess = $<HTMLSpanElement>("chip-success");

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
  persist: {
    mode: "consent",
    consentMessage: "Save your signup progress on this device?",
    consentLabel: "Save progress",
    declineLabel: "Not now",
    resumeMessage: "Welcome back — continue your signup?",
    resumeLabel: "Continue",
    discardLabel: "Start over",
  },
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
    { id: "brandColor", type: "color", label: "Brand color", placeholder: "#6ea8fe" },
    {
      id: "icon",
      type: "text",
      label: "Icon",
      widget: "icon",
      description: "Pick from your icon set",
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

const WIZARD: FormSchema = {
  id: "signup-wizard",
  version: "1.0",
  title: "Create your account",
  fields: [
    {
      id: "wizard",
      type: "steps",
      layout: "fill",
      urlSync: "/apply/step/:step",
      nextLabel: "Continue",
      prevLabel: "Back",
      submitLabel: "Create account",
      fields: [
        {
          id: "personal",
          type: "step",
          label: "Personal",
          description: "Tell us a bit about yourself.",
          fields: [
            {
              id: "name",
              type: "text",
              label: "Full name",
              placeholder: "Jane Doe",
              validation: { kind: "string", required: true, minLength: 2 },
            },
            {
              id: "phone",
              type: "text",
              label: "Phone",
              placeholder: "+1 555 0100",
            },
          ],
        },
        {
          id: "account",
          type: "step",
          label: "Account",
          description: "Choose your login credentials.",
          fields: [
            {
              id: "email",
              type: "email",
              label: "Email",
              placeholder: "you@example.com",
              validation: { kind: "string", format: "email", required: true },
            },
            {
              id: "password",
              type: "password",
              label: "Password",
              validation: { kind: "string", required: true, minLength: 8 },
            },
          ],
        },
        {
          id: "preferences",
          type: "step",
          label: "Preferences",
          description: "Optional — you can change these later.",
          fields: [
            {
              id: "newsletter",
              type: "toggle",
              label: "Send me product updates",
            },
            {
              id: "plan",
              type: "radio",
              label: "Plan",
              options: [
                { label: "Free", value: "free" },
                { label: "Pro", value: "pro" },
              ],
              defaultValue: "free",
            },
          ],
        },
      ],
    },
  ],
  submit: { endpoint: { method: "POST", url: "/api/signup" } },
  success: {
    heading: "Account created",
    message: "Reference {{referenceId}} — confirmation sent to {{email}}.",
    details: ["Plan: {{plan}}"],
    actions: [{ name: "done", label: "Done", variant: "primary", handler: "closeSuccess" }],
  },
  persist: {
    mode: "consent",
    consentMessage: "Save your application progress on this device?",
    consentLabel: "Save progress",
    declineLabel: "Not now",
    resumeMessage: "You have a saved draft. Continue your application?",
    resumeLabel: "Continue",
    discardLabel: "Start over",
  },
};

/** YYYY-MM-DD for today — blocks future dates of birth. */
const TODAY = new Date().toISOString().slice(0, 10);

// 3-step social-support application wizard — mirrors the Zod/RHF wizard in
// social-support-wizard (personal info → family & financial → situation).
const SOCIAL_SUPPORT: FormSchema = {
  id: "social-support",
  version: "1.0",
  title: "Social Support Application",
  fields: [
    {
      id: "wizard",
      type: "steps",
      layout: "bar",
      nextLabel: "Next",
      prevLabel: "Back",
      submitLabel: "Submit application",
      fields: [
        {
          id: "personal",
          type: "step",
          label: "Personal Information",
          fields: [
            {
              id: "name",
              type: "text",
              label: "Name",
              colSpan: 6,
              autocomplete: "name",
              validation: { kind: "string", required: true },
            },
            {
              id: "nationalId",
              type: "text",
              label: "National ID",
              colSpan: 6,
              validation: {
                kind: "string",
                required: true,
                pattern: "^\\d+$",
                messages: { pattern: "Enter a valid National ID" },
              },
            },
            {
              id: "dateOfBirth",
              type: "date",
              label: "Date of Birth",
              colSpan: 6,
              autocomplete: "bday",
              props: { max: TODAY },
              validation: { kind: "string", required: true },
            },
            {
              id: "gender",
              type: "select",
              label: "Gender",
              colSpan: 6,
              placeholder: "Select…",
              options: [
                { label: "Male", value: "male" },
                { label: "Female", value: "female" },
                { label: "Other", value: "other" },
              ],
              validation: { kind: "string", required: true },
            },
            {
              id: "address",
              type: "text",
              label: "Address",
              colSpan: 12,
              autocomplete: "street-address",
              validation: { kind: "string", required: true },
            },
            {
              id: "city",
              type: "text",
              label: "City",
              colSpan: 6,
              autocomplete: "address-level2",
              validation: { kind: "string", required: true },
            },
            {
              id: "state",
              type: "text",
              label: "State",
              colSpan: 6,
              autocomplete: "address-level1",
              validation: { kind: "string", required: true },
            },
            {
              id: "country",
              type: "text",
              label: "Country",
              colSpan: 6,
              autocomplete: "country-name",
              validation: { kind: "string", required: true },
            },
            {
              id: "phone",
              type: "text",
              label: "Phone",
              colSpan: 6,
              autocomplete: "tel",
              validation: {
                kind: "string",
                required: true,
                pattern: "^[+]?[\\d\\s-]{7,15}$",
                messages: { pattern: "Enter a valid phone number" },
              },
            },
            {
              id: "email",
              type: "email",
              label: "Email",
              colSpan: 12,
              autocomplete: "email",
              validation: { kind: "string", format: "email", required: true },
            },
          ],
        },
        {
          id: "family",
          type: "step",
          label: "Family & Financial Info",
          fields: [
            {
              id: "maritalStatus",
              type: "select",
              label: "Marital Status",
              colSpan: 6,
              placeholder: "Select…",
              options: [
                { label: "Single", value: "single" },
                { label: "Married", value: "married" },
                { label: "Divorced", value: "divorced" },
                { label: "Widowed", value: "widowed" },
              ],
              validation: { kind: "string", required: true },
            },
            {
              id: "dependents",
              type: "text",
              label: "Dependents",
              colSpan: 6,
              validation: {
                kind: "string",
                required: true,
                pattern: "^\\d+$",
                messages: { pattern: "Must be 0 or more" },
              },
            },
            {
              id: "employmentStatus",
              type: "select",
              label: "Employment Status",
              colSpan: 6,
              placeholder: "Select…",
              options: [
                { label: "Employed", value: "employed" },
                { label: "Unemployed", value: "unemployed" },
                { label: "Self-employed", value: "selfEmployed" },
                { label: "Student", value: "student" },
                { label: "Retired", value: "retired" },
              ],
              validation: { kind: "string", required: true },
            },
            {
              id: "monthlyIncome",
              type: "text",
              label: "Monthly Income",
              colSpan: 6,
              validation: {
                kind: "string",
                required: true,
                pattern: "^\\d+$",
                messages: { pattern: "Must be 0 or more" },
              },
            },
            {
              id: "housingStatus",
              type: "select",
              label: "Housing Status",
              colSpan: 12,
              placeholder: "Select…",
              options: [
                { label: "Owned", value: "owned" },
                { label: "Rented", value: "rented" },
                { label: "Living with family", value: "withFamily" },
                { label: "No fixed housing", value: "homeless" },
              ],
              validation: { kind: "string", required: true },
            },
          ],
        },
        {
          id: "situation",
          type: "step",
          label: "Situation Descriptions",
          fields: [
            {
              id: "currentFinancialSituation",
              type: "textarea",
              label: "Current Financial Situation",
              validation: {
                kind: "string",
                required: true,
                minLength: 10,
                messages: { minLength: "Please provide a little more detail" },
              },
            },
            {
              id: "employmentCircumstances",
              type: "textarea",
              label: "Employment Circumstances",
              validation: {
                kind: "string",
                required: true,
                minLength: 10,
                messages: { minLength: "Please provide a little more detail" },
              },
            },
            {
              id: "reasonForApplying",
              type: "textarea",
              label: "Reason for Applying",
              validation: {
                kind: "string",
                required: true,
                minLength: 10,
                messages: { minLength: "Please provide a little more detail" },
              },
            },
          ],
        },
      ],
    },
  ],
  submit: { endpoint: { method: "POST", url: "/api/social-support" } },
};

function schemaWithStepsLayout(
  schema: FormSchema,
  layout: "bar" | "tabs" | "numbers" | "fill",
): FormSchema {
  return {
    ...schema,
    fields: schema.fields.map((field) => (field.type === "steps" ? { ...field, layout } : field)),
  };
}

function wizardWithLayout(layout: "bar" | "tabs" | "numbers" | "fill"): FormSchema {
  return schemaWithStepsLayout(WIZARD, layout);
}

function socialSupportWithLayout(layout: "bar" | "tabs" | "numbers" | "fill"): FormSchema {
  return schemaWithStepsLayout(SOCIAL_SUPPORT, layout);
}

const EXAMPLES: Record<string, FormSchema> = {
  wizard: WIZARD,
  "wizard-bar": wizardWithLayout("bar"),
  "wizard-tabs": wizardWithLayout("tabs"),
  "wizard-numbers": wizardWithLayout("numbers"),
  signup: SIGNUP,
  "social-support": SOCIAL_SUPPORT,
  "social-support-tabs": socialSupportWithLayout("tabs"),
  "social-support-numbers": socialSupportWithLayout("numbers"),
  checkout: CHECKOUT,
  showcase: SHOWCASE,
};
const STARTER = WIZARD;

const WIZARD_EXAMPLES = new Set([
  "wizard",
  "wizard-bar",
  "wizard-tabs",
  "wizard-numbers",
  "social-support",
  "social-support-tabs",
  "social-support-numbers",
]);

type StepLayout = "bar" | "tabs" | "numbers" | "fill";

let currentForm: Form | null = null;
let disposeValues: (() => void) | null = null;
let disposeFeatures: (() => void) | null = null;

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
  disposeFeatures?.();
  currentForm?.destroy();
  hostEl.replaceChildren();
  payloadEl.textContent = "— submit the form —";

  const schema = result.value;
  const persistKey = schema.persist ? `formwright-playground-${schema.id}` : undefined;
  const hasSteps = schema.fields.some((f) => f.type === "steps");
  const stepsField = schema.fields.find((f) => f.type === "steps");
  const hasUrlSync = stepsField?.type === "steps" && !!stepsField.urlSync;
  const hasPersist = !!schema.persist;
  const hasSuccess = !!schema.success;

  const form = new Form(
    schema,
    {},
    {
      ...(persistKey ? { persistKey } : {}),
      send: async (payload) => {
        const p = payload as {
          wizard?: {
            account?: { email?: string };
            preferences?: { plan?: string };
          };
          email?: string;
        };
        const email = p.wizard?.account?.email ?? p.email ?? "";
        const plan = p.wizard?.preferences?.plan ?? "free";
        return {
          referenceId: `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          email,
          plan,
        };
      },
      handlers: {
        removeItem: () => setStatus("ok", "🗑  Delete action fired (handler: removeItem)"),
        closeSuccess: () => {
          currentForm?.dismissSuccess();
          setStatus("ok", "Success screen dismissed");
        },
      },
    },
  );
  currentForm = form;

  form.on("submit", (payload) => {
    payloadEl.textContent = JSON.stringify(payload, null, 2);
    payloadEl.classList.add("ok");
  });
  form.on("action", (p) => setStatus("ok", `Action: ${(p as { name: string }).name}`));
  form.on("step", (p) => {
    const { index, id } = p as { index: number; id: string };
    setStatus("ok", `→ Step ${index + 1} · ${id}${hasUrlSync ? ` · ${location.pathname}` : ""}`);
  });

  form.mount(hostEl);

  // Live values panel — a single effect that re-runs only when values change.
  disposeValues = effect(() => {
    valuesEl.textContent = JSON.stringify(form.values.get(), null, 2);
  });

  disposeFeatures = wireFeatureBar(form, schema);
  updateDemoHint(schema);
  setFeatureChrome(hasSteps, hasUrlSync, hasPersist, hasSuccess, !!persistKey);

  const steps = form.findSteps();
  const features: string[] = [];
  if (hasSteps) features.push(`${steps?.steps.length ?? 0} steps`);
  if (hasPersist) features.push("consent cache");
  if (hasUrlSync) features.push("URL sync");
  if (hasSuccess) features.push("success screen");
  if (features.length) {
    setStatus("ok", `✓ ${schema.title ?? schema.id} · ${features.join(" · ")}`);
  } else {
    const count = schema.fields.length;
    setStatus("ok", `✓ Valid schema · ${count} field${count === 1 ? "" : "s"} rendered`);
  }
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

/** Live chips for wizard UX + draft caching. */
function wireFeatureBar(form: Form, schema: FormSchema): () => void {
  const stepsNode = form.findSteps();
  const stepsField = schema.fields.find((f) => f.type === "steps");
  const urlSync = stepsField?.type === "steps" ? stepsField.urlSync : undefined;
  const consentMode = schema.persist?.mode === "consent";

  return effect(() => {
    if (stepsNode) {
      const { index, id } = stepsNode.activeStep();
      chipStep.hidden = false;
      chipStep.textContent = `Step ${index + 1}/${stepsNode.steps.length} · ${id}`;
      chipStep.classList.toggle("on", true);
    } else {
      chipStep.hidden = true;
    }

    if (urlSync) {
      chipUrl.hidden = false;
      chipUrl.textContent = `URL ${location.pathname}`;
      chipUrl.classList.toggle("on", location.pathname.includes("/apply/step/"));
    } else {
      chipUrl.hidden = true;
    }

    if (schema.persist) {
      chipConsent.hidden = false;
      if (form.showPersistConsent.get()) {
        chipConsent.textContent = "Draft — awaiting consent";
        chipConsent.classList.remove("on");
      } else if (form.persistConsented.get()) {
        chipConsent.textContent = "Draft — saving locally";
        chipConsent.classList.add("on");
      } else if (consentMode) {
        chipConsent.textContent = "Draft — not saved";
        chipConsent.classList.remove("on");
      } else {
        chipConsent.textContent = "Draft — auto-save";
        chipConsent.classList.add("on");
      }
    } else {
      chipConsent.hidden = true;
    }

    const resume = form.showResumeBanner.get();
    chipResume.hidden = !schema.persist;
    chipResume.textContent = resume ? "Resume banner — visible" : "Resume banner — hidden";
    chipResume.classList.toggle("on", resume);

    const success = form.showSuccessScreen.get();
    chipSuccess.hidden = !schema.success;
    chipSuccess.textContent = success ? "Success screen — visible" : "Success screen — hidden";
    chipSuccess.classList.toggle("on", success);
  });
}

function setFeatureChrome(
  hasSteps: boolean,
  hasUrlSync: boolean,
  hasPersist: boolean,
  hasSuccess: boolean,
  hasPersistKey: boolean,
): void {
  const showBar = hasSteps || hasPersist || hasSuccess;
  featureBarEl.hidden = !showBar;
  demoActionsEl.hidden = !hasPersistKey;
  featureLegendEl.hidden = !(hasPersist || hasUrlSync || hasSuccess);
}

function simulateRefresh(): void {
  rebuild();
  setStatus("ok", "↻ Simulated page refresh — draft restored if you saved progress");
}

function clearSavedDraft(): void {
  if (currentForm) currentForm.discardDraft();
  rebuild();
  setStatus("ok", "Saved draft cleared");
}

/** Load a named example into the editor and re-render. */
function loadExample(name: string): void {
  const schema = EXAMPLES[name];
  if (!schema) return;
  schemaEl.value = JSON.stringify(schema, null, 2);
  const layoutEl = $<HTMLSelectElement>("wizard-layout");
  if (WIZARD_EXAMPLES.has(name)) {
    const steps = schema.fields.find((f) => f.type === "steps");
    const layout = steps?.type === "steps" && steps.layout ? (steps.layout as StepLayout) : "bar";
    layoutEl.value = layout;
  }
  rebuild();
}

/** Show wizard-specific controls and a short hint when the schema contains `steps`. */
function updateDemoHint(schema: FormSchema): void {
  const stepsField = schema.fields.find((f) => f.type === "steps");
  const hasSteps = !!stepsField;
  const hint = $<HTMLParagraphElement>("wizard-hint");
  const layoutRow = $<HTMLDivElement>("wizard-layout-row");
  hint.hidden = !hasSteps && !schema.persist;
  layoutRow.hidden = !hasSteps;

  const parts: string[] = [];
  if (hasSteps) {
    parts.push("Use Back / Next to move through steps");
    if (stepsField?.type === "steps" && stepsField.urlSync) {
      parts.push("watch the URL update");
    }
  }
  if (schema.persist?.mode === "consent") {
    parts.push('type a field → click "Save progress" to enable draft cache');
    parts.push('use "Simulate refresh" to see the resume banner');
  } else if (schema.persist) {
    parts.push("values auto-save — refresh to restore");
  }
  if (schema.success) {
    parts.push("submit to see the success screen with {{variables}}");
  }
  hint.textContent = parts.length ? parts.join(" · ") + "." : "";
}

/** Swap the progress style on the in-editor wizard schema. */
function setWizardLayout(layout: StepLayout): void {
  let schema: FormSchema;
  try {
    schema = JSON.parse(schemaEl.value) as FormSchema;
  } catch {
    return;
  }
  if (!schema.fields.some((f) => f.type === "steps")) return;
  schemaEl.value = JSON.stringify(schemaWithStepsLayout(schema, layout), null, 2);
  const exampleEl = $<HTMLSelectElement>("example");
  const isSocialSupport = schema.id === "social-support";
  const isWizard = schema.id === "signup-wizard";
  if (isWizard) {
    if (layout === "fill") exampleEl.value = "wizard";
    else if (layout === "tabs") exampleEl.value = "wizard-tabs";
    else if (layout === "numbers") exampleEl.value = "wizard-numbers";
    else exampleEl.value = "wizard-bar";
  } else if (isSocialSupport) {
    if (layout === "tabs") exampleEl.value = "social-support-tabs";
    else if (layout === "numbers") exampleEl.value = "social-support-numbers";
    else exampleEl.value = "social-support";
  }
  rebuild();
}

// Wire up interactions.
schemaEl.addEventListener("input", debounce(rebuild, 250));
$<HTMLButtonElement>("b-add").addEventListener("click", addField);
$<HTMLSelectElement>("example").addEventListener("change", (e) => {
  loadExample((e.target as HTMLSelectElement).value);
});
$<HTMLSelectElement>("wizard-layout").addEventListener("change", (e) => {
  setWizardLayout((e.target as HTMLSelectElement).value as StepLayout);
});
$<HTMLButtonElement>("btn-refresh").addEventListener("click", simulateRefresh);
$<HTMLButtonElement>("btn-clear-draft").addEventListener("click", clearSavedDraft);

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
