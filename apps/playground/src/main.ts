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
import "./styles.css";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const schemaEl = $<HTMLTextAreaElement>("schema");
const statusEl = $<HTMLParagraphElement>("schema-status");
const hostEl = $<HTMLDivElement>("form-host");
const valuesEl = $<HTMLPreElement>("values");
const payloadEl = $<HTMLPreElement>("payload");

const STARTER: FormSchema = {
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
    {
      id: "newsletter",
      type: "checkbox",
      label: "Send me product updates",
    },
  ],
};

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

  const form = new Form(result.value, {}, { send: async (payload) => payload });
  currentForm = form;

  form.on("submit", (payload) => {
    payloadEl.textContent = JSON.stringify(payload, null, 2);
    payloadEl.classList.add("ok");
  });

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
  if (required) field["validation"] = { kind: type === "number" ? "number" : "string", required: true };
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

// Wire up interactions.
schemaEl.addEventListener("input", debounce(rebuild, 250));
$<HTMLButtonElement>("b-add").addEventListener("click", addField);

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
