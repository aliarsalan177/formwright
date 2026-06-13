/**
 * Formwright schema types — the public, serializable contract.
 *
 * A schema is plain data: hand-written, version-controlled, or emitted by an LLM.
 * Everything the runtime and the codegen compiler need is expressed here as data,
 * never as code, so a schema can round-trip through JSON.
 */

/** Primitive value a form field can hold. */
export type FieldValue = string | number | boolean | null | undefined | FieldValue[];

/** A reference to a value provided by a registered provider, expressed as a sigil object. */
export type ProviderRef =
  | { readonly $t: string; readonly args?: Record<string, FieldValue> } // i18n
  | { readonly $query: string | readonly [string, Record<string, unknown>?] } // data source
  | { readonly $theme: string }; // theme token

/** A value in the schema that may be a literal or resolved through a provider at runtime. */
export type Resolvable<T> = T | ProviderRef;

/**
 * A condition expression evaluated against current form values.
 *
 * Intentionally a small, sandboxed JSONLogic-style algebra — it is *data*, never
 * `eval`. `var` reads a field value; the rest compose comparisons and booleans.
 */
export type Condition =
  | boolean
  | { readonly var: string }
  | { readonly "==": readonly [Condition, Condition] }
  | { readonly "!=": readonly [Condition, Condition] }
  | { readonly ">": readonly [Condition, Condition] }
  | { readonly ">=": readonly [Condition, Condition] }
  | { readonly "<": readonly [Condition, Condition] }
  | { readonly "<=": readonly [Condition, Condition] }
  | { readonly in: readonly [Condition, Condition] }
  | { readonly not: Condition }
  | { readonly and: readonly Condition[] }
  | { readonly or: readonly Condition[] }
  // a bare literal value (string/number/bool) used as an operand
  | FieldValue;

/** Built-in field widget kinds. Extensible: any string maps to a registered widget. */
export type FieldType =
  | "text"
  | "number"
  | "email"
  | "password"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "group" // a nested object: produces `{ ...child values }`
  | "collection" // a repeatable list of groups: produces `[{ ... }, { ... }]`
  | (string & {});

/** Validation descriptor — declarative, mapped to a Standard Schema validator at runtime. */
export interface ValidationSchema {
  readonly kind: "string" | "number" | "boolean" | "array";
  readonly required?: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly format?: "email" | "url" | "uuid";
  readonly message?: Resolvable<string>;
}

/** A selectable option for `select` / `radio` fields. */
export interface FieldOption {
  readonly label: Resolvable<string>;
  readonly value: FieldValue;
}

/**
 * A slot rendered at the start/end of an input — either decorative text/icon
 * (a string like "$" or "🔍") or a nested field (e.g. a currency `select`) whose
 * value is added to the payload as a sibling key.
 */
export type FieldSlot = string | FieldSchema;

/** A single field in the form. Resolved to a widget by `type`, keyed by `id`. */
export interface FieldSchema {
  readonly id: string;
  readonly type: FieldType;
  readonly label?: Resolvable<string>;
  readonly placeholder?: Resolvable<string>;
  readonly help?: Resolvable<string>;
  /** Longer descriptive text, positioned by {@link descriptionPosition}. */
  readonly description?: Resolvable<string>;
  /** Where to render `description` (default `"below-label"`). */
  readonly descriptionPosition?: "below-label" | "below-field";
  /** For check-like fields (checkbox/toggle): label `"start"` (with control at the end) or `"end"` (default). */
  readonly labelPosition?: "start" | "end";
  /** Render content (icon/text or a value-bearing field) before/after the input. */
  readonly slots?: { readonly start?: FieldSlot; readonly end?: FieldSlot };
  /** Exclude this field's value from the submitted payload (UI-only control). */
  readonly omit?: boolean;
  readonly defaultValue?: FieldValue;
  readonly options?: Resolvable<readonly FieldOption[]>;
  readonly validation?: ValidationSchema;
  /** Field is rendered only when this condition holds (default: always). */
  readonly visibleWhen?: Condition;
  /** Field is interactive only when this condition holds (default: always). */
  readonly enabledWhen?: Condition;
  /** Field is required only when this condition holds (overrides validation.required). */
  readonly requiredWhen?: Condition;
  /**
   * Child fields — required for `group` (object) and `collection` (array-of-groups).
   * A child's conditions resolve names lexically: a sibling first, then the
   * enclosing scope, up to the form root (so an outer toggle can hide a field
   * nested inside a group or a collection row).
   */
  readonly fields?: readonly FieldSchema[];
  /**
   * Container layout:
   *  - `group`: `"fieldset"` (default) or `"accordion"` (collapsible section).
   *  - `collection`: `"list"` (default), `"cards"`, or `"accordion"` (each row collapsible).
   */
  readonly layout?: "fieldset" | "accordion" | "list" | "cards";
  /** `collection` only: label for each row, e.g. "Contact". */
  readonly itemLabel?: Resolvable<string>;
  /** `collection` only: text for the add-row button (default: "Add"). */
  readonly addLabel?: Resolvable<string>;
  /** `collection` only: minimum / maximum number of rows. */
  readonly minItems?: number;
  readonly maxItems?: number;
  /** Arbitrary widget-specific config, passed through to the renderer. */
  readonly props?: Record<string, unknown>;
}

/** Declares a provider the form depends on, resolved by the host at runtime. */
export interface ProviderDecl {
  readonly type: "i18n" | "tanstack-query" | "theme" | (string & {});
  readonly [key: string]: unknown;
}

/** How the form submits: transform the payload, send it, handle success/error. */
export interface SubmitSchema {
  /** Name of a registered transform applied to values before sending. */
  readonly transform?: string;
  readonly endpoint?: {
    readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    readonly url: string;
  };
  /** Name of a registered success handler. */
  readonly onSuccess?: string;
  /** Name of a registered error handler. */
  readonly onError?: string;
}

/** The root form schema. */
export interface FormSchema {
  readonly id: string;
  readonly version: string;
  readonly title?: Resolvable<string>;
  readonly providers?: Record<string, ProviderDecl>;
  readonly fields: readonly FieldSchema[];
  readonly submit?: SubmitSchema;
}
