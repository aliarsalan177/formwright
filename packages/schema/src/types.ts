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
  | OptionsQueryRef
  | { readonly $theme: string }; // theme token

/** Maps API rows to {@link FieldOption} label/value keys. */
export interface OptionsMapper {
  readonly label: string;
  readonly value: string;
}

/**
 * Async field options via a registered query provider (`tanstack-query`, custom).
 * Set `lazy: true` to fetch when the user opens the control; use `preload` for
 * the current selection before the first fetch completes.
 */
export interface OptionsQueryRef {
  readonly $query: string | readonly [string, Record<string, unknown>?];
  /** Defer fetch until the user opens the control (default `false`). */
  readonly lazy?: boolean;
  /** Map each API row to `{ label, value }`. */
  readonly map?: OptionsMapper;
  /** Name of a transform in `FormOptions.optionsTransforms` (runs before `map`). */
  readonly transform?: string;
  /** Options shown immediately (e.g. the selected value from initial data). */
  readonly preload?: readonly FieldOption[];
  /** Passthrough TanStack Query options (`staleTime`, `gcTime`, `retry`, …). */
  readonly tanstack?: Record<string, unknown>;
}

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
  | "date" // native date picker
  | "time" // native time picker
  | "datetime" // native date + time picker
  | "daterange" // a from/to range (with or without time)
  | "color" // color picker (swatch + hex input)
  | "range" // a slider (e.g. brightness) with live value bubble
  | "file" // native file input (override with a custom widget for uploads)
  | "group" // a nested object: produces `{ ...child values }`
  | "collection" // a repeatable list of groups: produces `[{ ... }, { ... }]`
  | "steps" // a multi-step wizard: child `step` fields shown one at a time
  | "step" // one wizard step (nested object, like `group`)
  | "heading" // presentational: a section title (no payload)
  | "separator" // presentational: a divider (no payload)
  | "paragraph" // presentational: static text (no payload)
  | (string & {});

/**
 * Map form field state to a custom component's property names.
 * Use with `widget.bind` so Formwright drives your UI library's API
 * (`hasError`, `errorMessage`, `isDisabled`, …) instead of native input attrs.
 */
export interface WidgetBindMap {
  /** Value property (default `"value"` — same as `valueProp`). */
  readonly value?: string;
  /** Boolean invalid state, e.g. `"hasError"`. */
  readonly invalid?: string;
  /** Error message string, e.g. `"errorMessage"`. */
  readonly error?: string;
  /** Disabled state, e.g. `"isDisabled"`. */
  readonly disabled?: string;
  /** Required flag, e.g. `"isRequired"`. */
  readonly required?: string;
  /** Placeholder text, e.g. `"placeholder"`. */
  readonly placeholder?: string;
  /** Hide the default `.fw-error` line when the widget shows errors itself. */
  readonly hideError?: boolean;
}

/**
 * Map a field to your own UI — a custom element, native tag, or a widget you
 * registered by name. The serializable bits (tag/component/valueProp/event/attrs)
 * live here; code-level transforms and framework `mount` functions are attached
 * via `registerWidget` in the renderer.
 */
export type WidgetRef =
  | string // the name of a registered widget to use instead of `type`
  | {
      /** A registered widget name (takes precedence over `tag`). */
      readonly component?: string;
      /** A custom element / native tag to render, e.g. "s-select". */
      readonly tag?: string;
      /** Property the value is written to / read from (default "value"). */
      readonly valueProp?: string;
      /** DOM event that signals a change, e.g. "value-change" (default "input"). */
      readonly event?: string;
      /** Static attributes to set on the element. */
      readonly attrs?: Record<string, string>;
      /** Map form state → component props (value, error, disabled, …). */
      readonly bind?: WidgetBindMap;
      /** Named `toValue` in `FormOptions.widgetTransforms`. */
      readonly toValue?: string;
      /** Named `fromValue` in `FormOptions.widgetTransforms`. */
      readonly fromValue?: string;
      /** Named `read` in `FormOptions.widgetTransforms`. */
      readonly read?: string;
      /** Named `write` in `FormOptions.widgetTransforms`. */
      readonly write?: string;
    };

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
  /** Catch-all override for every rule's message. */
  readonly message?: Resolvable<string>;
  /** Per-rule message overrides (take precedence over `message` and the defaults). */
  readonly messages?: {
    readonly required?: string;
    readonly min?: string;
    readonly max?: string;
    readonly minLength?: string;
    readonly maxLength?: string;
    readonly pattern?: string;
    readonly format?: string;
    readonly type?: string;
  };
}

/** A selectable option for `select` / `radio` fields. */
export interface FieldOption {
  readonly label: Resolvable<string>;
  readonly value: FieldValue;
}

/**
 * Per-part class overrides — drop in your own CSS classes or Tailwind utilities
 * to restyle any part of a field without touching the renderer.
 */
export interface FieldClasses {
  readonly field?: string; // the wrapper
  readonly label?: string;
  readonly control?: string; // the input / control element
  readonly help?: string;
  readonly description?: string;
  readonly error?: string;
}

/** Wrap rendered nodes in a custom HTML/custom-element tag. */
export interface RenderWrapper {
  /** Host tag (e.g. `"div"`, `"section"`, `"my-card"`). */
  readonly tag: string;
  /** Extra class(es) on the wrapper host. */
  readonly class?: string;
  /** Static attributes applied to the wrapper host (`data-*`, `aria-*`, boolean → empty attr). */
  readonly attrs?: Record<string, string | number | boolean>;
  /**
   * Properties set on the host element — useful for custom elements
   * (e.g. `active`, `variant`, `open`).
   */
  readonly props?: Record<string, unknown>;
}

/** One wrapper or nested wrappers (first = innermost, closest to the child). */
export type RenderWrappers = RenderWrapper | readonly RenderWrapper[];

/** Form title configuration — text, heading tag, and optional wrappers. */
export interface FormTitleSchema {
  readonly text: Resolvable<string>;
  /** Heading tag (default `"h2"`). */
  readonly tag?: string;
  readonly class?: string;
  readonly wrapper?: RenderWrappers;
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
  /** Native `autocomplete` token for the input (e.g. "email", "name", "off"). */
  readonly autocomplete?: string;
  readonly help?: Resolvable<string>;
  /** Static body text — for `paragraph`/`heading` presentational fields. */
  readonly content?: Resolvable<string>;
  /** An info tooltip shown next to the field's label. */
  readonly tooltip?: Resolvable<string>;
  /**
   * Capture a value per locale → payload `{ en: "...", ar: "..." }`. Requires
   * the form's `locales`. Renders as one input with a language switcher; reshape to
   * `translations: { en: {...} }` in submit if needed.
   */
  readonly localized?: boolean;
  /** The locale shown first for a `localized` field (default: the form's first locale). */
  readonly defaultLocale?: string;
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
  /** Render this field with your own component/element instead of the built-in for `type`. */
  readonly widget?: WidgetRef;
  /** Columns the field spans in the form's 12-column grid (e.g. 6 = half width, two side by side). */
  readonly colSpan?: number;
  /** Extra class(es) on the field wrapper (e.g. Tailwind utilities). */
  readonly class?: string;
  /** Wrap this field node in a custom host tag (native or custom element). */
  readonly wrapper?: RenderWrappers;
  /** Skeleton placeholder overrides for loading states. */
  readonly skeleton?: SkeletonFieldOptions;
  /** Per-part class overrides (wrapper, label, control, help, description, error). */
  readonly classes?: FieldClasses;
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
   *  - `steps`: `"bar"` | `"tabs"` | `"numbers"` (step labels) or `"fill"` (thin % progress bar).
   */
  readonly layout?:
    | "fieldset"
    | "accordion"
    | "list"
    | "cards"
    | "bar"
    | "tabs"
    | "numbers"
    | "fill";
  /** `steps` only: show a progress indicator (default `true`). */
  readonly showProgress?: boolean;
  /** `steps` only: validate the current step before advancing (default `true`). */
  readonly validateOnNext?: boolean;
  /** `steps` only: label for the Next button (default `"Next"`). */
  readonly nextLabel?: Resolvable<string>;
  /** `steps` only: label for the Back button (default `"Back"`). */
  readonly prevLabel?: Resolvable<string>;
  /** `steps` only: label for Submit on the last step (default `"Submit"`). */
  readonly submitLabel?: Resolvable<string>;
  /**
   * `steps` only: sync the active step with the URL, e.g. `"/apply/step/:step"` where
   * `:step` is the step `id` (default) or a zero-based index when `urlSyncBy` is `"index"`.
   */
  readonly urlSync?: string;
  /** `steps` only: whether `urlSync` uses step `id` (default) or numeric `index`. */
  readonly urlSyncBy?: "id" | "index";
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

/** A form-level action button (submit, reset, or a named custom action like "delete"). */
export interface FormAction {
  readonly name: string;
  readonly label?: Resolvable<string>;
  /** `"submit"` triggers submission, `"reset"` resets, `"button"` (default) emits an action event. */
  readonly role?: "submit" | "reset" | "button";
  readonly variant?: "primary" | "secondary" | "danger";
  /** Render this button full-width (stretches to fill the action bar). */
  readonly fullWidth?: boolean;
  /** Name of a handler in `options.handlers`, called with the form on click. */
  readonly handler?: string;
  /** Override the action control — custom element tag or registered action widget (`registerActionWidget`). */
  readonly widget?: WidgetRef;
  /** Wrap this action button — single host or nested hosts (first = innermost). */
  readonly wrapper?: RenderWrappers;
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

/** Skeleton placeholder shape hint for a field type. */
export type SkeletonVariant =
  | "text"
  | "textarea"
  | "select"
  | "toggle"
  | "checkbox"
  | "radio"
  | "date"
  | "file"
  | "range"
  | "color"
  | "heading"
  | "separator"
  | "paragraph"
  | "unknown";

/** Per-field skeleton override. */
export interface SkeletonFieldOptions {
  readonly variant?: SkeletonVariant;
  /** Textarea / paragraph line count. */
  readonly lines?: number;
}

/** Form-level loading UX (skeleton overlay, step transitions). */
export interface LoadingSchema {
  /** Show skeleton on submit until response (default `true`). */
  readonly onSubmit?: boolean;
  /** Show skeleton when navigating wizard steps (default `true`). */
  readonly onStepChange?: boolean;
  /** Min duration ms to avoid flash (default 150). */
  readonly minDuration?: number;
  /** Step transition: `"slide"` | `"fade"` | `"none"` (default `"slide"`). */
  readonly stepTransition?: "slide" | "fade" | "none";
}

/** Shown after a successful submit when declared on the form schema. */
export interface SuccessScreenSchema {
  readonly heading?: Resolvable<string>;
  /** Supports `{{key}}` placeholders filled from the submit response. */
  readonly message?: Resolvable<string>;
  /** Extra lines (each supports `{{key}}` from the response). */
  readonly details?: readonly Resolvable<string>[];
  readonly actions?: readonly FormAction[];
}

/** Draft persistence UX — pairs with `persistKey` in {@link FormOptions}. */
export interface PersistSchema {
  /**
   * `"auto"` — save to storage on every change (default).
   * `"consent"` — ask the user before writing; values restore on refresh only after they agree.
   */
  readonly mode?: "auto" | "consent";
  /** Show a resume-draft banner when a saved draft is restored (default `true`). */
  readonly showResumeBanner?: boolean;
  /** Shown when `mode` is `"consent"` and the user has entered data but not yet agreed to save. */
  readonly consentMessage?: Resolvable<string>;
  readonly consentLabel?: Resolvable<string>;
  readonly declineLabel?: Resolvable<string>;
  readonly resumeMessage?: Resolvable<string>;
  readonly resumeLabel?: Resolvable<string>;
  readonly discardLabel?: Resolvable<string>;
}

/** The root form schema. */
export interface FormSchema {
  readonly id: string;
  readonly version: string;
  readonly title?: Resolvable<string> | FormTitleSchema;
  readonly providers?: Record<string, ProviderDecl>;
  readonly fields: readonly FieldSchema[];
  readonly submit?: SubmitSchema;
  /** Post-submit success screen (built-in template; override via renderer options in `@formwright/dom`). */
  readonly success?: SuccessScreenSchema;
  /** Resume-draft banner copy when `persistKey` restores values. */
  readonly persist?: PersistSchema;
  /** Locales for `localized` fields — each captures a value per locale. */
  readonly locales?: readonly string[];
  /** Locales rendered right-to-left (defaults to the common RTL set: ar, he, fa, ur, …). */
  readonly rtlLocales?: readonly string[];
  /** Loading UX: submit skeleton overlay, step transitions. */
  readonly loading?: LoadingSchema;
  /** Action buttons rendered at the bottom of the form (defaults to a single Submit). */
  readonly actions?: readonly FormAction[];
  /** How action buttons are aligned: `"start"` (default), `"end"`, or `"between"`. */
  readonly actionsAlign?: "start" | "end" | "between";
}
