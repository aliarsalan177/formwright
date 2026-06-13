/**
 * The {@link Form} class — Formwright's public, class-based, imperative API.
 *
 *   const form = new Form(schema, { email: "" }, options);
 *   form.mount(document.getElementById("root")!);
 *   await form.submit();
 *
 * The instance owns the reactive field graph, validation, the condition engine,
 * provider wiring, and the submission pipeline. It is render-agnostic: `mount`
 * delegates to a registered renderer (e.g. `@formwright/dom`), so the same
 * instance can drive the DOM, a web component, or a framework adapter.
 */
import { parseSchema, type FieldValue, type FormSchema } from "@formwright/schema";
import { batch, computed, signal, untrack, type Dispose, type ReadSignal } from "./reactive.js";
import { FieldState } from "./model.js";
import type { ValueGetter } from "./conditions.js";
import type { Providers } from "./providers.js";

export type FormValues = Record<string, FieldValue>;
export type FormErrors = Record<string, string | null>;

/** A transform applied to values before submission. */
export type Transform = (values: FormValues, form: Form) => unknown;
/** Handlers referenced by name from the schema's `submit` block. */
export type SuccessHandler = (result: unknown, form: Form) => void;
export type ErrorHandler = (error: unknown, form: Form) => void;

export interface FormOptions {
  readonly providers?: Providers;
  readonly transforms?: Record<string, Transform>;
  readonly handlers?: Record<string, SuccessHandler | ErrorHandler>;
  /** Override the network send (defaults to `fetch` against `submit.endpoint`). */
  readonly send?: (payload: unknown, form: Form) => Promise<unknown>;
}

/** Renders a {@link Form} into a host node; returns a disposer. Provided by a renderer package. */
export interface FormRenderer {
  mount(form: Form, host: Element): Dispose;
}

type EventName = "submit" | "success" | "error" | "change";
type Listener = (payload: unknown) => void;

let defaultRenderer: FormRenderer | null = null;

/** Register the renderer used by {@link Form.mount} when none is passed explicitly. */
export function setDefaultRenderer(renderer: FormRenderer): void {
  defaultRenderer = renderer;
}

export class Form {
  readonly schema: FormSchema;
  readonly options: FormOptions;
  readonly fields: ReadonlyMap<string, FieldState>;
  readonly order: readonly string[];

  /** Reactive snapshot of all field values. */
  readonly values: ReadSignal<FormValues>;
  /** True when any field's value differs from its initial value. */
  readonly isDirty: ReadSignal<boolean>;
  /** True when no visible field currently has an error. */
  readonly isValid: ReadSignal<boolean>;

  private readonly submitting = signal(false);
  private readonly initial: FormValues;
  private readonly listeners = new Map<EventName, Set<Listener>>();
  private disposeRenderer: Dispose | null = null;

  constructor(
    schema: FormSchema | unknown,
    initialValues: FormValues = {},
    options: FormOptions = {},
  ) {
    // Always validate: parseSchema passes valid schemas through unchanged and
    // throws a precise SchemaValidationError otherwise (key for LLM-emitted input).
    this.schema = parseSchema(schema);
    this.options = options;

    const getValue: ValueGetter = (id) => this.fields.get(id)?.value.get();

    const fields = new Map<string, FieldState>();
    const initial: FormValues = {};
    for (const fieldSchema of this.schema.fields) {
      const init =
        initialValues[fieldSchema.id] ??
        fieldSchema.defaultValue ??
        defaultForType(fieldSchema.type);
      initial[fieldSchema.id] = init;
      fields.set(fieldSchema.id, new FieldState(fieldSchema, init, getValue));
    }
    this.fields = fields;
    this.order = this.schema.fields.map((f) => f.id);
    this.initial = initial;

    this.values = computed(() => {
      const out: FormValues = {};
      for (const [id, field] of fields) out[id] = field.value.get();
      return out;
    });
    this.isDirty = computed(() => {
      for (const [id, field] of fields) {
        if (!Object.is(field.value.get(), this.initial[id])) return true;
      }
      return false;
    });
    this.isValid = computed(() => {
      for (const field of fields.values()) {
        if (field.visible.get() && field.error.get() !== null) return false;
      }
      return true;
    });
  }

  // ---- value access -------------------------------------------------------

  getValue(id: string): FieldValue {
    return this.fields.get(id)?.value.peek();
  }

  setValue(id: string, value: FieldValue): void {
    const field = this.fields.get(id);
    if (!field) return;
    field.value.set(value);
    field.touched.set(true);
    if (field.error.peek() !== null) field.validate(); // re-validate once shown an error
    this.emit("change", { id, value });
  }

  setError(id: string, error: string | null): void {
    this.fields.get(id)?.error.set(error);
  }

  setErrors(errors: FormErrors): void {
    batch(() => {
      for (const [id, error] of Object.entries(errors)) this.setError(id, error);
    });
  }

  get isSubmitting(): ReadSignal<boolean> {
    return this.submitting;
  }

  // ---- lifecycle ----------------------------------------------------------

  /** Validate every field; returns true when the whole form is valid. */
  validate(): boolean {
    return untrack(() => {
      let ok = true;
      batch(() => {
        for (const field of this.fields.values()) {
          if (field.validate() !== null) ok = false;
        }
      });
      return ok;
    });
  }

  /** Run the submission pipeline: validate → transform → send → onSuccess/onError. */
  async submit(): Promise<unknown> {
    if (!this.validate()) {
      const error = new FormValidationError(this.collectErrors());
      this.runErrorHandler(error);
      this.emit("error", error);
      throw error;
    }

    this.submitting.set(true);
    const values = untrack(() => this.values.peek());
    const payload = this.applyTransform(values);
    this.emit("submit", payload);

    try {
      const result = await this.send(payload);
      this.runSuccessHandler(result);
      this.emit("success", result);
      return result;
    } catch (error) {
      this.runErrorHandler(error);
      this.emit("error", error);
      throw error;
    } finally {
      this.submitting.set(false);
    }
  }

  reset(values: FormValues = this.initial): void {
    batch(() => {
      for (const [id, field] of this.fields) {
        field.reset(values[id] ?? this.initial[id]);
      }
    });
  }

  /** Mount into a host element using the given renderer (or the registered default). */
  mount(host: Element, renderer: FormRenderer | null = defaultRenderer): Dispose {
    if (!renderer) {
      throw new Error(
        "No renderer available. Import '@formwright/dom' or pass a renderer to Form.mount().",
      );
    }
    this.disposeRenderer?.();
    this.disposeRenderer = renderer.mount(this, host);
    return this.disposeRenderer;
  }

  destroy(): void {
    this.disposeRenderer?.();
    this.disposeRenderer = null;
    this.listeners.clear();
  }

  // ---- events -------------------------------------------------------------

  on(event: EventName, listener: Listener): Dispose {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => set.delete(listener);
  }

  private emit(event: EventName, payload: unknown): void {
    const set = this.listeners.get(event);
    if (set) for (const listener of [...set]) listener(payload);
  }

  // ---- internals ----------------------------------------------------------

  private collectErrors(): FormErrors {
    const errors: FormErrors = {};
    for (const [id, field] of this.fields) errors[id] = field.error.peek();
    return errors;
  }

  private applyTransform(values: FormValues): unknown {
    const name = this.schema.submit?.transform;
    const transform = name ? this.options.transforms?.[name] : undefined;
    return transform ? transform(values, this) : values;
  }

  private async send(payload: unknown): Promise<unknown> {
    if (this.options.send) return this.options.send(payload, this);
    const endpoint = this.schema.submit?.endpoint;
    if (!endpoint) return payload; // no transport configured: succeed with the payload
    const init: RequestInit = {
      method: endpoint.method,
      headers: { "content-type": "application/json" },
    };
    if (endpoint.method !== "GET") init.body = JSON.stringify(payload);
    const response = await fetch(endpoint.url, init);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : undefined;
  }

  private runSuccessHandler(result: unknown): void {
    const name = this.schema.submit?.onSuccess;
    const handler = name ? this.options.handlers?.[name] : undefined;
    (handler as SuccessHandler | undefined)?.(result, this);
  }

  private runErrorHandler(error: unknown): void {
    const name = this.schema.submit?.onError;
    const handler = name ? this.options.handlers?.[name] : undefined;
    (handler as ErrorHandler | undefined)?.(error, this);
  }
}

export class FormValidationError extends Error {
  readonly errors: FormErrors;
  constructor(errors: FormErrors) {
    super("Form validation failed");
    this.name = "FormValidationError";
    this.errors = errors;
  }
}

function defaultForType(type: string): FieldValue {
  switch (type) {
    case "checkbox":
      return false;
    case "number":
      return undefined;
    default:
      return "";
  }
}
