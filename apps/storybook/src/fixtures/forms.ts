import type { FormSchema } from "@formwright/schema";

export const SIGNUP: FormSchema = {
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

export const CHECKOUT: FormSchema = {
  id: "checkout",
  version: "1.0",
  title: "Checkout",
  fields: [
    {
      id: "email",
      type: "email",
      label: "Email",
      validation: { kind: "string", format: "email", required: true },
    },
    {
      id: "plan",
      type: "select",
      label: "Plan",
      options: [
        { label: "Free", value: "free" },
        { label: "Pro", value: "pro" },
      ],
    },
    {
      id: "billing",
      type: "group",
      label: "Billing address",
      layout: "accordion",
      fields: [
        { id: "name", type: "text", label: "Name on card" },
        { id: "city", type: "text", label: "City" },
      ],
    },
    {
      id: "contacts",
      type: "collection",
      label: "Emergency contacts",
      layout: "cards",
      itemLabel: "Contact",
      minItems: 1,
      maxItems: 3,
      fields: [
        { id: "name", type: "text", label: "Name" },
        { id: "phone", type: "phone", label: "Phone", validation: { required: true } },
      ],
    },
  ],
};

export const WIZARD: FormSchema = {
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
          fields: [
            {
              id: "name",
              type: "text",
              label: "Full name",
              validation: { kind: "string", required: true, minLength: 2 },
            },
            { id: "phone", type: "phone", label: "Phone", validation: { required: true } },
          ],
        },
        {
          id: "account",
          type: "step",
          label: "Account",
          fields: [
            {
              id: "email",
              type: "email",
              label: "Email",
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
          fields: [
            { id: "newsletter", type: "toggle", label: "Product updates" },
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

export const SHOWCASE: FormSchema = {
  id: "showcase",
  version: "1.0",
  title: "Formwright showcase",
  fields: [
    { id: "h1", type: "heading", content: "Authoring & layout" },
    { id: "sep1", type: "separator" },
    {
      id: "name",
      type: "text",
      label: "Full name",
      description: "As it appears on your ID",
      tooltip: "Legal name only",
      validation: { kind: "string", required: true },
      colSpan: 6,
    },
    {
      id: "email",
      type: "email",
      label: "Email",
      colSpan: 6,
      validation: { kind: "string", format: "email", required: true },
    },
    { id: "p1", type: "paragraph", content: "Toggle the switch below to reveal more fields." },
    { id: "advanced", type: "toggle", label: "Show advanced options" },
    {
      id: "color",
      type: "color",
      label: "Accent color",
      visibleWhen: { var: "advanced" },
    },
    {
      id: "range",
      type: "range",
      label: "Volume",
      props: { min: 0, max: 100, step: 5, unit: "%" },
      visibleWhen: { var: "advanced" },
    },
  ],
  actions: [
    { name: "submit", label: "Save", variant: "primary" },
    { name: "reset", label: "Reset", variant: "secondary" },
  ],
};

export function wizardWithLayout(layout: "bar" | "tabs" | "numbers" | "fill"): FormSchema {
  return {
    ...WIZARD,
    fields: WIZARD.fields.map((f) => (f.type === "steps" ? { ...f, layout } : f)),
  };
}
