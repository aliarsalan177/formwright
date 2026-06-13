/**
 * Reactive per-field model. Each {@link FieldState} owns the signals for one
 * field — its value, error, and touched flag — plus computed `visible`,
 * `enabled`, and `required` derived from the schema's conditions. The renderer
 * binds directly to these signals, so a change updates only the affected nodes.
 */
import type { FieldSchema, FieldValue } from "@formwright/schema";
import { computed, signal, type ReadSignal, type WriteSignal } from "./reactive.js";
import { evaluateCondition, type ValueGetter } from "./conditions.js";
import { compileValidator, requiredMessage, type FieldValidator } from "./validation.js";

/** Default value for a leaf field with no explicit initial/default. */
export function defaultValueFor(type: string): FieldValue {
  switch (type) {
    case "checkbox":
      return false;
    case "number":
      return undefined;
    default:
      return "";
  }
}

export class FieldState {
  /** Discriminant for the {@link FieldNode} union (leaf vs group/collection). */
  readonly kind = "field" as const;
  readonly id: string;
  /** The field's schema — mutable at runtime via {@link patchSchema}. */
  schema: FieldSchema;
  readonly value: WriteSignal<FieldValue>;
  readonly error: WriteSignal<string | null>;
  readonly touched: WriteSignal<boolean>;
  readonly visible: ReadSignal<boolean>;
  readonly enabled: ReadSignal<boolean>;
  readonly required: ReadSignal<boolean>;
  /** Bumps whenever the schema is patched — renderers re-render the field on change. */
  readonly revision: ReadSignal<number>;

  private validator: FieldValidator | null;
  private readonly rev = signal(0);

  constructor(schema: FieldSchema, initial: FieldValue, getValue: ValueGetter) {
    this.id = schema.id;
    this.schema = schema;
    this.value = signal<FieldValue>(initial);
    this.error = signal<string | null>(null);
    this.touched = signal(false);
    this.validator = schema.validation ? compileValidator(schema.validation) : null;
    this.revision = this.rev;

    // Conditions read `this.schema` (not the captured arg) and track `rev`, so a
    // runtime patch re-evaluates visibility/enablement/required automatically.
    this.visible = computed(() => {
      this.rev.get();
      return evaluateCondition(this.schema.visibleWhen, getValue, true);
    });
    this.enabled = computed(() => {
      this.rev.get();
      return evaluateCondition(this.schema.enabledWhen, getValue, true);
    });
    this.required = computed(() => {
      this.rev.get();
      if (this.schema.requiredWhen !== undefined) {
        return evaluateCondition(this.schema.requiredWhen, getValue, false);
      }
      return this.schema.validation?.required ?? false;
    });
  }

  /** Merge a partial schema in at runtime (change type, label, options, validation, …). */
  patchSchema(partial: Partial<FieldSchema>): void {
    this.schema = { ...this.schema, ...partial } as FieldSchema;
    this.validator = this.schema.validation ? compileValidator(this.schema.validation) : null;
    this.rev.update((n) => n + 1);
  }

  /** Run validation, store and return the error (or null). Hidden fields never error. */
  validate(): string | null {
    if (!this.visible.peek()) {
      this.error.set(null);
      return null;
    }
    let result: string | null = null;
    if (this.required.peek() && isEmpty(this.value.peek())) {
      result = requiredMessage(this.schema.validation);
    } else if (this.validator) {
      result = this.validator(this.value.peek());
    }
    this.error.set(result);
    return result;
  }

  reset(value: FieldValue): void {
    this.value.set(value);
    this.error.set(null);
    this.touched.set(false);
  }
}

function isEmpty(value: FieldValue): boolean {
  return value === undefined || value === null || value === "";
}
