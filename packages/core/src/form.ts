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
import {
  parseSchema,
  type FieldSchema,
  type FieldValue,
  type FormSchema,
} from "@formwright/schema";
import {
  batch,
  computed,
  effect,
  signal,
  untrack,
  type Dispose,
  type ReadSignal,
} from "./reactive.js";
import { FieldState } from "./model.js";
import {
  buildTree,
  collectValues,
  eachLeaf,
  resetNodes,
  CollectionNode,
  GroupNode,
  StepsNode,
  StepNode,
  type FieldNode,
} from "./nodes.js";
import type { Providers } from "./providers.js";
import type { OptionsFetcher, OptionsTransform } from "./field-options.js";
import { interpolateTemplate } from "./interpolate.js";
import {
  clearPersistedKey,
  loadPersisted,
  savePersisted,
  clearPersistDeclined,
  isPersistDeclined,
  setPersistDeclined,
} from "./persist.js";

/** Context passed to a custom success-screen renderer (`@formwright/dom`). */
export interface SuccessScreenContext {
  readonly form: Form;
  readonly data: unknown;
  /** Fill `{{key}}` placeholders from the submit response. */
  interpolate(text: string): string;
  /** Hide the success screen and reset the form. */
  dismiss(): void;
}

/** DOM renderer extension — ignored by the core outside `@formwright/dom`. */
export interface DomRendererOptions {
  /** Replace the built-in success template with your own UI. */
  readonly renderSuccess?: (ctx: SuccessScreenContext, host: HTMLElement) => Dispose | void;
}

/** Why the form is in a loading state (skeleton overlay, disabled nav). */
export type LoadingReason = "submit" | "step" | "init" | "provider";

/** Form values — nested for `group` (object) and `collection` (array) fields. */
export type FormValues = Record<string, unknown>;
export type FormErrors = Record<string, string | null>;

/** The outcome of {@link Form.submit} — resolved for both success and failure. */
export type SubmitResult =
  | { readonly ok: true; readonly data: unknown }
  | { readonly ok: false; readonly error: unknown; readonly errors?: FormErrors };

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
  /**
   * Named fetchers for `$query` field options when no `providers.query` is set.
   * Used by lazy/eager async select/radio/checkbox options.
   */
  readonly optionsFetch?: Record<string, OptionsFetcher>;
  /** Transform raw API payloads before `map` (referenced by `$query.transform`). */
  readonly optionsTransforms?: Record<string, OptionsTransform>;
  /**
   * Persist entered values under this `localStorage` key and restore them on the
   * next load — so a refresh before submitting keeps the form filled. Cleared on
   * a successful submit. Pair with `schema.persist` for copy and consent mode.
   */
  readonly persistKey?: string;
  /** DOM-only extensions (custom success screen, etc.). */
  readonly dom?: DomRendererOptions;
}

/** Renders a {@link Form} into a host node; returns a disposer. Provided by a renderer package. */
export interface FormRenderer {
  mount(form: Form, host: Element, options?: DomRendererOptions): Dispose;
}

type EventName = "submit" | "success" | "error" | "change" | "action" | "step";
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

  /** True when a built-in or custom success screen should replace the form body. */
  readonly showSuccessScreen: ReadSignal<boolean>;
  /** Payload returned from the last successful submit (when showing success). */
  readonly successData: ReadSignal<unknown | null>;
  /** True when a persisted draft was restored and the resume banner may show. */
  readonly showResumeBanner: ReadSignal<boolean>;
  /** True when consent is required and the opt-in banner should show. */
  readonly showPersistConsent: ReadSignal<boolean>;
  /** True after the user agreed to local draft storage (`persist.mode: "consent"`). */
  readonly persistConsented: ReadSignal<boolean>;

  private readonly submitting = signal(false);
  private readonly _loadingReason = signal<LoadingReason | null>(null);
  private readonly loading = computed(
    () => this.submitting.get() || this._loadingReason.get() !== null,
  );
  private readonly succeeded = signal(false);
  private readonly successPayload = signal<unknown | null>(null);
  private readonly resumeBanner = signal(false);
  private readonly persistConsent = signal(false);
  private readonly persistDeclined = signal(false);
  private readonly initialValues: FormValues;
  private initialSnapshot: string;
  private readonly rootByName: ReadonlyMap<string, FieldNode>;
  private readonly listeners = new Map<EventName, Set<Listener>>();
  private disposeRenderer: Dispose | null = null;
  private disposePersist: Dispose | null = null;
  private disposeStepWatch: Dispose | null = null;
  private skipPersistWrites = false;

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

    // Expand `localized` fields into per-locale groups → payload `{ en, ar }`.
    const fields = this.schema.locales?.length
      ? expandLocalized(this.schema.fields, this.schema.locales)
      : this.schema.fields;
    // Restore persisted values (form caching) over the provided initial values.
    const persisted = loadPersisted(options.persistKey, initialValues);
    const tree = buildTree(fields, persisted.values);
    this.tree = tree.nodes;
    this.rootByName = tree.byName;
    this.order = fields.map((f) => f.id);

    const steps = findSteps(this.tree);
    if (steps) {
      if (persisted.stepId) steps.goToId(persisted.stepId);
      else if (persisted.step !== undefined) steps.goTo(persisted.step);
      this.wireStepEvents(steps);
    }

    this.values = computed(() => collectTree(this.tree));

    const consentMode = this.schema.persist?.mode === "consent";
    const persistKey = options.persistKey;
    const consented =
      !consentMode ||
      persisted.consented === true ||
      (persisted.restored && persisted.consented !== false);
    if (persistKey && consentMode) {
      this.persistDeclined.set(isPersistDeclined(persistKey));
    }
    this.persistConsent.set(consented);

    const showBanner =
      persisted.restored && !!persistKey && this.schema.persist?.showResumeBanner !== false;
    this.resumeBanner = signal(showBanner);

    this.initialSnapshot = JSON.stringify(untrack(() => this.values.peek()));
    this.isDirty = computed(() => JSON.stringify(this.values.get()) !== this.initialSnapshot);

    // Persist values + active step on every change (form caching).
    if (persistKey) {
      const key = persistKey;
      this.disposePersist = effect(() => {
        if (this.skipPersistWrites) {
          if (!this.isDirty.get()) return;
          this.skipPersistWrites = false;
        }
        if (consentMode && !this.persistConsent.get()) return;
        const v = this.values.get();
        const meta = steps
          ? {
              step: steps.currentStep.get(),
              stepId: steps.activeStep().id,
              ...(consentMode ? { consented: true as const } : {}),
            }
          : consentMode
            ? { consented: true as const }
            : {};
        savePersisted(key, v, meta);
      });
    }
    this.isValid = computed(() => {
      let valid = true;
      eachLeaf(this.tree, (leaf) => {
        if (leaf.visible.get() && leaf.error.get() !== null) valid = false;
      });
      return valid;
    });
    this.showSuccessScreen = computed(
      () => this.succeeded.get() && !!(this.schema.success || this.options.dom?.renderSuccess),
    );
    this.successData = this.successPayload;
    this.showResumeBanner = this.resumeBanner;
    this.persistConsented = this.persistConsent;
    this.showPersistConsent = computed(
      () =>
        !!persistKey &&
        consentMode &&
        !this.persistConsent.get() &&
        !this.persistDeclined.get() &&
        !this.resumeBanner.get() &&
        this.isDirty.get(),
    );
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

  /** Current values as a plain snapshot (non-reactive). */
  getValues(): FormValues {
    return untrack(() => this.values.peek());
  }

  /**
   * Subscribe to all value changes — `listener` is called immediately with the
   * current values and again on every change. The consumer never tracks state:
   * it always receives the latest snapshot. Returns an unsubscribe.
   */
  subscribe(listener: (values: FormValues) => void): Dispose {
    return effect(() => listener(this.values.get()));
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

  /** Patch one field's schema at runtime (change type, label, options, validation, …). */
  setFieldSchema(path: string, partial: Partial<FieldSchema>): void {
    this.field(path)?.patchSchema(partial);
  }

  /** Patch many fields' schemas at once: `form.patch({ state: { type: "text" }, … })`. */
  patch(updates: Record<string, Partial<FieldSchema>>): void {
    batch(() => {
      for (const [path, partial] of Object.entries(updates)) this.setFieldSchema(path, partial);
    });
  }

  setErrors(errors: FormErrors): void {
    batch(() => {
      for (const [id, error] of Object.entries(errors)) this.setError(id, error);
    });
  }

  get isSubmitting(): ReadSignal<boolean> {
    return this.submitting;
  }

  /** True when any loading reason is active (submit, step transition, …). */
  get isLoading(): ReadSignal<boolean> {
    return this.loading;
  }

  /** Which loading UX is active, or `null` when idle. */
  get loadingReason(): ReadSignal<LoadingReason | null> {
    return this._loadingReason;
  }

  /** Build a success-screen context for custom renderers. */
  successContext(): SuccessScreenContext {
    const data = this.successPayload.peek();
    return {
      form: this,
      data,
      interpolate: (text) => interpolateTemplate(text, data),
      dismiss: () => this.dismissSuccess(),
    };
  }

  /** Hide the success screen and reset field values. */
  dismissSuccess(): void {
    this.succeeded.set(false);
    this.successPayload.set(null);
    this.reset();
    const steps = this.findSteps();
    steps?.goTo(0);
  }

  /** Dismiss the resume-draft banner without clearing data. */
  dismissResumeBanner(): void {
    this.resumeBanner.set(false);
  }

  /** Opt in to local draft storage (`persist.mode: "consent"`). */
  grantPersistConsent(): void {
    const key = this.options.persistKey;
    if (!key) return;
    this.persistConsent.set(true);
    this.persistDeclined.set(false);
    clearPersistDeclined(key);
    if (this.skipPersistWrites) this.skipPersistWrites = false;
    const steps = this.findSteps();
    const v = untrack(() => this.values.peek());
    const meta = steps
      ? {
          step: steps.currentStep.peek(),
          stepId: steps.activeStep().id,
          consented: true as const,
        }
      : { consented: true as const };
    savePersisted(key, v, meta);
  }

  /** Decline local draft storage for this session (`persist.mode: "consent"`). */
  declinePersistConsent(): void {
    const key = this.options.persistKey;
    if (!key) return;
    this.persistDeclined.set(true);
    setPersistDeclined(key);
  }

  /** Clear the saved draft, reset values, and hide the resume banner. */
  discardDraft(): void {
    this.skipPersistWrites = true;
    this.clearPersisted();
    this.resumeBanner.set(false);
    if (this.schema.persist?.mode === "consent") {
      this.persistConsent.set(false);
      this.persistDeclined.set(false);
      const key = this.options.persistKey;
      if (key) clearPersistDeclined(key);
    }
    batch(() => {
      this.reset();
      this.findSteps()?.goTo(0);
      this.initialSnapshot = JSON.stringify(untrack(() => this.values.peek()));
    });
  }

  // ---- lifecycle ----------------------------------------------------------

  /** Validate every (visible) leaf field; returns true when the whole form is valid. */
  validate(options?: { allSteps?: boolean }): boolean {
    const allSteps = options?.allSteps ?? false;
    return untrack(() => {
      let ok = true;
      batch(() => {
        eachLeaf(this.tree, (leaf) => {
          if (leaf.validate({ allSteps }) !== null) ok = false;
        });
      });
      return ok;
    });
  }

  /** Find the first `steps` container in the field tree (if any). */
  findSteps(): StepsNode | undefined {
    return findSteps(this.tree);
  }

  /**
   * Run the submission pipeline: validate → transform → send → onSuccess/onError.
   * Pass an inline `transform` to shape the final payload, e.g.
   * `form.submit((values) => ({ ...values, source: "web" }))`.
   *
   * Always **resolves** with a {@link SubmitResult} — never throws — so you can
   * handle both outcomes from the API in one place:
   * `const res = await form.submit(); res.ok ? res.data : res.error`.
   */
  async submit(transform?: (values: FormValues, form: Form) => unknown): Promise<SubmitResult> {
    if (!this.validate({ allSteps: true })) {
      const errors = this.collectErrors();
      const error = new FormValidationError(errors);
      this.runErrorHandler(error);
      this.emit("error", error);
      return { ok: false, error, errors };
    }

    this.submitting.set(true);
    this._loadingReason.set("submit");
    const values = untrack(() => this.values.peek());
    const named = this.applyTransform(values);
    const payload = transform ? transform(named as FormValues, this) : named;
    this.emit("submit", payload);

    try {
      const data = await this.send(payload);
      this.skipPersistWrites = true;
      this.clearPersisted();
      this.resumeBanner.set(false);
      this.runSuccessHandler(data);
      this.emit("success", data);
      if (this.schema.success || this.options.dom?.renderSuccess) {
        this.successPayload.set(data);
        this.succeeded.set(true);
      }
      return { ok: true, data };
    } catch (error) {
      this.runErrorHandler(error);
      this.emit("error", error);
      return { ok: false, error };
    } finally {
      this.submitting.set(false);
      this._loadingReason.set(null);
    }
  }

  reset(values: FormValues = this.initialValues): void {
    batch(() => {
      resetNodes(this.tree, values as Record<string, unknown>);
    });
  }

  /** Trigger a named form action: runs its handler (from options) and emits "action". */
  action(name: string): void {
    const def = this.schema.actions?.find((a) => a.name === name);
    const handler = def?.handler ? this.options.handlers?.[def.handler] : undefined;
    (handler as ((form: Form) => void) | undefined)?.(this);
    this.emit("action", { name });
  }

  /** Mount into a host element using the given renderer (or the registered default). */
  mount(host: Element, renderer: FormRenderer | null = defaultRenderer): Dispose {
    if (!renderer) {
      throw new Error(
        "No renderer available. Import '@formwright/dom' or pass a renderer to Form.mount().",
      );
    }
    this.disposeRenderer?.();
    this.disposeRenderer = renderer.mount(this, host, this.options.dom);
    return this.disposeRenderer;
  }

  destroy(): void {
    this.disposeRenderer?.();
    this.disposeRenderer = null;
    this.disposePersist?.();
    this.disposePersist = null;
    this.disposeStepWatch?.();
    this.disposeStepWatch = null;
    this.listeners.clear();
  }

  /** Remove the cached draft from `localStorage` (called on a successful submit). */
  private clearPersisted(): void {
    clearPersistedKey(this.options.persistKey);
  }

  private wireStepEvents(steps: StepsNode): void {
    let prev = steps.currentStep.peek();
    this.disposeStepWatch = effect(() => {
      const index = steps.currentStep.get();
      if (index === prev) return;
      const step = steps.steps[index];
      this.emit("step", { index, id: step?.id });
      prev = index;
    });
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

/**
 * Rewrite each `localized` field into a group with one child per locale, so its
 * value becomes `{ en: …, ar: … }`. Recurses into groups/collections. Pure data.
 */
function expandLocalized(
  fields: readonly FieldSchema[],
  locales: readonly string[],
): readonly FieldSchema[] {
  return fields.map((f): FieldSchema => {
    if (f.localized) {
      const leafType = f.type === "group" || f.type === "collection" ? "text" : f.type;
      const child = (loc: string): FieldSchema => {
        const c: Record<string, unknown> = { id: loc, type: leafType, label: loc };
        if (f.placeholder !== undefined) c["placeholder"] = f.placeholder;
        if (f.validation !== undefined) c["validation"] = f.validation;
        if (f.options !== undefined) c["options"] = f.options;
        if (f.widget !== undefined) c["widget"] = f.widget;
        if (f.tooltip !== undefined) c["tooltip"] = f.tooltip;
        return c as unknown as FieldSchema;
      };
      const group: Record<string, unknown> = {
        id: f.id,
        type: "group",
        // Keep the `localized` flag so the renderer shows ONE input + a language
        // switcher (instead of one input per locale). Value stays `{ en, ar }`.
        localized: true,
        fields: locales.map(child),
      };
      if (f.defaultLocale !== undefined) group["defaultLocale"] = f.defaultLocale;
      for (const key of [
        "label",
        "visibleWhen",
        "enabledWhen",
        "class",
        "classes",
        "help",
        "tooltip",
      ] as const) {
        if (f[key] !== undefined) group[key] = f[key];
      }
      return group as unknown as FieldSchema;
    }
    if (f.fields) return { ...f, fields: expandLocalized(f.fields, locales) };
    return f;
  });
}

/** Flatten all leaf fields, keyed by dotted path (`group.child`, `coll.0.child`). */
function collectLeaves(tree: readonly FieldNode[]): Map<string, FieldState> {
  const out = new Map<string, FieldState>();
  const walk = (nodes: readonly FieldNode[], prefix: string): void => {
    for (const node of nodes) {
      const path = prefix ? `${prefix}.${node.id}` : node.id;
      if (node.kind === "field") out.set(path, node);
      else if (node.kind === "group" || node.kind === "step") walk(node.children, path);
      else if (node.kind === "steps") {
        for (const step of node.steps) walk(step.children, `${path}.${step.id}`);
      } else {
        node.items.peek().forEach((row, i) => walk(row.group.children, `${path}.${i}`));
      }
    }
  };
  walk(tree, "");
  return out;
}

/** Resolve a leaf field by dotted path, descending groups, steps, and collection rows. */
function resolveLeaf(
  tree: readonly FieldNode[],
  rootByName: ReadonlyMap<string, FieldNode>,
  path: string,
): FieldState | undefined {
  const parts = path.split(".");
  let node: FieldNode | undefined = rootByName.get(parts[0]!);
  for (let i = 1; i < parts.length && node; i++) {
    const part = parts[i]!;
    if (node instanceof GroupNode || node instanceof StepNode) {
      node = node.byName.get(part) as FieldNode | undefined;
    } else if (node instanceof StepsNode) {
      node = node.byName.get(part);
    } else if (node instanceof CollectionNode) {
      node = node.items.peek()[Number(part)]?.group;
    } else {
      return undefined;
    }
  }
  return node && node.kind === "field" ? node : undefined;
}

function findSteps(tree: readonly FieldNode[]): StepsNode | undefined {
  for (const node of tree) {
    if (node.kind === "steps") return node;
    if (node.kind === "group" || node.kind === "step") {
      const found = findSteps(node.children);
      if (found) return found;
    } else if (node.kind === "collection") {
      for (const row of node.items.peek()) {
        const found = findSteps(row.group.children);
        if (found) return found;
      }
    }
  }
  return undefined;
}
