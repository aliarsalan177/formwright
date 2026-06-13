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
import {
  buildTree,
  collectValues,
  eachLeaf,
  resetNodes,
  CollectionNode,
  GroupNode,
  type FieldNode,
} from "./nodes.js";
import type { Providers } from "./providers.js";

/** Form values — nested for `group` (object) and `collection` (array) fields. */
export type FormValues = Record<string, unknown>;
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
  /** Top-level field tree (leaf fields, groups, and collections, in order). */
  readonly tree: readonly FieldNode[];
  readonly order: readonly string[];

  /** Reactive snapshot of all field values (nested for groups/collections). */
  readonly values: ReadSignal<FormValues>;
  /** True when the current values differ from the initial values. */
  readonly isDirty: ReadSignal<boolean>;
  /** True when no visible field currently has an error. */
  readonly isValid: ReadSignal<boolean>;

  private readonly submitting = signal(false);
  private readonly initialValues: FormValues;
  private readonly initialSnapshot: string;
  private readonly rootByName: ReadonlyMap<string, FieldNode>;
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
    this.initialValues = initialValues;

    const tree = buildTree(this.schema.fields, initialValues);
    this.tree = tree.nodes;
    this.rootByName = tree.byName;
    this.order = this.schema.fields.map((f) => f.id);

    this.values = computed(() => collectTree(this.tree));
    this.initialSnapshot = JSON.stringify(untrack(() => this.values.peek()));
    this.isDirty = computed(() => JSON.stringify(this.values.get()) !== this.initialSnapshot);
    this.isValid = computed(() => {
      let valid = true;
      eachLeaf(this.tree, (leaf) => {
        if (leaf.visible.get() && leaf.error.get() !== null) valid = false;
      });
      return valid;
    });
  }

  // ---- value access -------------------------------------------------------

  /** All leaf fields keyed by dotted path (e.g. `items.name`, `contacts.0.email`). */
  get fields(): ReadonlyMap<string, FieldState> {
    return collectLeaves(this.tree);
  }

  /** Resolve a leaf field by dotted path. Top-level ids work directly. */
  field(path: string): FieldState | undefined {
    return resolveLeaf(this.tree, this.rootByName, path);
  }

  getValue(path: string): FieldValue {
    return this.field(path)?.value.peek();
  }

  setValue(path: string, value: FieldValue): void {
    const field = this.field(path);
    if (field) this.setFieldValue(field, value);
  }

  /** Apply a value to a specific leaf node (used by the renderer). */
  setFieldValue(field: FieldState, value: FieldValue): void {
    field.value.set(value);
    field.touched.set(true);
    // Real-time, field-by-field validation: validate the edited field on every
    // change so its error shows as you type and clears the moment it's valid.
    field.validate();
    this.emit("change", { id: field.id, value });
  }

  setError(id: string, error: string | null): void {
    this.field(id)?.error.set(error);
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

  /** Validate every (visible) leaf field; returns true when the whole form is valid. */
  validate(): boolean {
    return untrack(() => {
      let ok = true;
      batch(() => {
        eachLeaf(this.tree, (leaf) => {
          if (leaf.validate() !== null) ok = false;
        });
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

  reset(values: FormValues = this.initialValues): void {
    batch(() => {
      resetNodes(this.tree, values as Record<string, unknown>);
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
    for (const [path, field] of this.fields) errors[path] = field.error.peek();
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

/** Aggregate the tree into a nested values object (subscribes to all values). */
function collectTree(tree: readonly FieldNode[]): FormValues {
  return collectValues(tree) as FormValues;
}

/** Flatten all leaf fields, keyed by dotted path (`group.child`, `coll.0.child`). */
function collectLeaves(tree: readonly FieldNode[]): Map<string, FieldState> {
  const out = new Map<string, FieldState>();
  const walk = (nodes: readonly FieldNode[], prefix: string): void => {
    for (const node of nodes) {
      const path = prefix ? `${prefix}.${node.id}` : node.id;
      if (node.kind === "field") out.set(path, node);
      else if (node.kind === "group") walk(node.children, path);
      else {
        node.items.peek().forEach((row, i) => walk(row.group.children, `${path}.${i}`));
      }
    }
  };
  walk(tree, "");
  return out;
}

/** Resolve a leaf field by dotted path, descending groups and collection rows. */
function resolveLeaf(
  tree: readonly FieldNode[],
  rootByName: ReadonlyMap<string, FieldNode>,
  path: string,
): FieldState | undefined {
  const parts = path.split(".");
  let node: FieldNode | undefined = rootByName.get(parts[0]!);
  for (let i = 1; i < parts.length && node; i++) {
    const part = parts[i]!;
    if (node instanceof GroupNode) {
      node = node.byName.get(part) as FieldNode | undefined;
    } else if (node instanceof CollectionNode) {
      node = node.items.peek()[Number(part)]?.group;
    } else {
      return undefined;
    }
  }
  return node && node.kind === "field" ? node : undefined;
}
