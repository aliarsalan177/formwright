import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { nextId, type PropMap } from "../core/element.js";
import { buildField, fieldStyles, slotHasContent, type FieldParts } from "../core/field.js";
import { FwFormElement } from "../core/form-element.js";

export type InputType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "search"
  | "tel"
  | "url"
  | "date"
  | "time"
  | "datetime-local";

const styles =
  fieldStyles +
  /* css */ `
.input {
  flex: 1; min-width: 0; height: calc(var(--_height) - 2px);
  padding: 0; border: 0; outline: none; background: transparent;
  font: inherit; font-size: var(--_text-size); color: inherit;
}
.input::placeholder { color: var(--_muted); opacity: 1; }
.input:disabled { cursor: not-allowed; }
/* The browser's own clear and spin controls duplicate ours or fight the design. */
.input::-webkit-search-cancel-button { -webkit-appearance: none; }
`;

const ICON_CLEAR = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
const ICON_EYE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_EYE_OFF = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/></svg>`;

/**
 * `<fw-input>` — a text-like field with its label, help and error built in.
 *
 * ```html
 * <fw-input label="Name" name="name" required></fw-input>
 * <fw-input type="email" label="Email" help="Receipts are sent here"></fw-input>
 * <fw-input type="password" label="Password"></fw-input>   <!-- show/hide toggle -->
 * <fw-input type="search" placeholder="Search members" clearable></fw-input>
 * <fw-input label="Price" type="number" min="0">
 *   <span slot="prefix">PKR</span>
 * </fw-input>
 * <fw-input label="Phone" error="Already registered"></fw-input>
 * ```
 *
 * One component for every text type rather than a PasswordInput, an
 * EmailInput and so on. `error` puts it into the invalid state with that
 * message, blocks form submission, and is announced to screen readers.
 *
 * Events: `input` as the user types, `change` when they commit.
 * Slots: `label`, `help`, `prefix`, `suffix`.
 * Parts: `field`, `label`, `control`, `input`, `help`, `error`, `clear`, `reveal`.
 */
export class FwInput extends FwFormElement {
  static override props: PropMap = {
    ...FwFormElement.props,
    type: { type: "string", default: "text" },
    value: { type: "string", default: "" },
    placeholder: { type: "string" },
    label: { type: "string" },
    help: { type: "string" },
    error: { type: "string" },
    size: { type: "string", reflect: true, default: "md" },
    readOnly: { type: "boolean", attribute: "readonly", reflect: true },
    clearable: { type: "boolean" },
    autocomplete: { type: "string" },
    inputmode: { type: "string" },
    min: { type: "string" },
    max: { type: "string" },
    step: { type: "string" },
    minlength: { type: "number" },
    maxlength: { type: "number" },
    pattern: { type: "string" },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open", delegatesFocus: true };

  declare type: InputType;
  declare value: string;
  declare placeholder: string | null;
  declare label: string | null;
  declare help: string | null;
  declare error: string | null;
  declare size: "sm" | "md" | "lg";
  declare readOnly: boolean;
  declare clearable: boolean;
  declare disabled: boolean;
  declare required: boolean;
  declare name: string | null;

  #parts!: FieldParts;
  #input!: HTMLInputElement;
  #helpText!: HTMLSpanElement;
  #clear!: HTMLButtonElement;
  #reveal!: HTMLButtonElement;
  #defaultValue = "";
  readonly #revealed = signal(false);
  readonly #slots = signal(0);

  protected render(root: ShadowRoot): void {
    const id = nextId("fw-input");
    this.#parts = buildField(id);

    const prefix = document.createElement("slot");
    prefix.name = "prefix";

    this.#input = document.createElement("input");
    this.#input.id = id;
    this.#input.className = "input";
    this.#input.setAttribute("part", "input");

    this.#clear = document.createElement("button");
    this.#clear.type = "button";
    this.#clear.className = "icon-button";
    this.#clear.setAttribute("part", "clear");
    this.#clear.setAttribute("aria-label", "Clear");
    this.#clear.innerHTML = ICON_CLEAR;

    this.#reveal = document.createElement("button");
    this.#reveal.type = "button";
    this.#reveal.className = "icon-button";
    this.#reveal.setAttribute("part", "reveal");

    const suffix = document.createElement("slot");
    suffix.name = "suffix";

    this.#parts.control.append(prefix, this.#input, this.#clear, this.#reveal, suffix);

    // Text fallback for the `help` attribute, replaced by a `help` slot.
    this.#helpText = document.createElement("span");
    this.#parts.help.querySelector("slot")!.append(this.#helpText);

    root.append(this.#parts.field);
    this.#defaultValue = this.getAttribute("value") ?? "";
  }

  protected override connected(scope: Scope): void {
    const input = this.#input;
    const parts = this.#parts;

    scope.bind(() => {
      const type = this.prop<string>("type").get();
      const revealed = this.#revealed.get();
      input.type = type === "password" && revealed ? "text" : type;
      this.#reveal.hidden = type !== "password";
      this.#reveal.innerHTML = revealed ? ICON_EYE_OFF : ICON_EYE;
      this.#reveal.setAttribute("aria-label", revealed ? "Hide password" : "Show password");
      this.#reveal.setAttribute("aria-pressed", String(revealed));
    });

    scope.bind(() => {
      const value = this.prop<string | null>("value").get() ?? "";
      // Only write when different: rewriting an identical value moves the
      // caret to the end mid-typing.
      if (input.value !== value) input.value = value;
      this.#syncFormState();
    });

    scope.bind(() => {
      input.placeholder = this.prop<string | null>("placeholder").get() ?? "";
      input.readOnly = this.prop<boolean>("readOnly").get();
      input.disabled = this.isDisabled.get();
      input.required = this.prop<boolean>("required").get();
      setOrRemove(input, "autocomplete", this.prop<string | null>("autocomplete").get());
      setOrRemove(input, "inputmode", this.prop<string | null>("inputmode").get());
      setOrRemove(input, "min", this.prop<string | null>("min").get());
      setOrRemove(input, "max", this.prop<string | null>("max").get());
      setOrRemove(input, "step", this.prop<string | null>("step").get());
      setOrRemove(input, "pattern", this.prop<string | null>("pattern").get());
      const minlength = this.prop<number | null>("minlength").get();
      const maxlength = this.prop<number | null>("maxlength").get();
      setOrRemove(input, "minlength", minlength === null ? null : String(minlength));
      setOrRemove(input, "maxlength", maxlength === null ? null : String(maxlength));
      this.#syncFormState();
    });

    scope.bind(() => {
      this.#slots.get();
      const label = this.prop<string | null>("label").get();
      parts.labelText.textContent = label ?? "";
      parts.label.hidden = !label && !slotHasContent(this.root, "label");
      parts.required.hidden = !this.prop<boolean>("required").get();

      const help = this.prop<string | null>("help").get();
      this.#helpText.textContent = help ?? "";
      const hasHelp = Boolean(help) || slotHasContent(this.root, "help");
      parts.help.hidden = !hasHelp;

      const error = this.prop<string | null>("error").get();
      parts.error.textContent = error ?? "";
      parts.error.hidden = !error;
      input.setAttribute("aria-invalid", String(Boolean(error)));
      this.toggleAttribute("invalid", Boolean(error));

      const describedBy = [hasHelp ? parts.help.id : null, error ? parts.error.id : null]
        .filter(Boolean)
        .join(" ");
      setOrRemove(input, "aria-describedby", describedBy || null);
      this.#syncFormState();
    });

    scope.bind(() => {
      const value = this.prop<string | null>("value").get() ?? "";
      this.#clear.hidden =
        !this.prop<boolean>("clearable").get() ||
        value === "" ||
        this.isDisabled.get() ||
        this.prop<boolean>("readOnly").get();
    });

    const onInput = () => {
      this.prop<string>("value").set(input.value);
    };
    // `change` does not cross the shadow boundary on its own; `input` does.
    const onChange = () => this.emit("change");
    const onClear = () => {
      this.value = "";
      this.emit("input");
      this.emit("change");
      input.focus();
    };
    const onReveal = () => this.#revealed.set(!this.#revealed.peek());
    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);

    input.addEventListener("input", onInput);
    input.addEventListener("change", onChange);
    this.#clear.addEventListener("click", onClear);
    this.#reveal.addEventListener("click", onReveal);
    this.root.addEventListener("slotchange", onSlotChange);
    scope.add(() => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("change", onChange);
      this.#clear.removeEventListener("click", onClear);
      this.#reveal.removeEventListener("click", onReveal);
      this.root.removeEventListener("slotchange", onSlotChange);
    });
  }

  /** Submitted value and validity, mirrored from the real input. */
  #syncFormState(): void {
    const input = this.#input;
    this.setFormValue(input.value);
    const error = this.prop<string | null>("error").peek();
    if (error) {
      this.setValidity({ customError: true }, error, input);
      return;
    }
    const v = input.validity;
    this.setValidity(
      {
        valueMissing: v.valueMissing,
        typeMismatch: v.typeMismatch,
        patternMismatch: v.patternMismatch,
        tooLong: v.tooLong,
        tooShort: v.tooShort,
        rangeUnderflow: v.rangeUnderflow,
        rangeOverflow: v.rangeOverflow,
        stepMismatch: v.stepMismatch,
        badInput: v.badInput,
      },
      input.validationMessage,
      input,
    );
  }

  protected resetValue(): void {
    this.value = this.#defaultValue;
  }

  protected override restoreValue(state: string): void {
    this.value = state;
  }

  /** The value as a number, for `type="number"`; NaN when empty or invalid. */
  get valueAsNumber(): number {
    return this.#input ? this.#input.valueAsNumber : Number.NaN;
  }

  override focus(options?: FocusOptions): void {
    this.#input?.focus(options);
  }

  override blur(): void {
    this.#input?.blur();
  }

  select(): void {
    this.#input?.select();
  }

  setSelectionRange(start: number, end: number, direction?: "forward" | "backward" | "none"): void {
    this.#input?.setSelectionRange(start, end, direction);
  }
}

function setOrRemove(el: Element, name: string, value: string | null): void {
  if (value === null || value === "") el.removeAttribute(name);
  else el.setAttribute(name, value);
}
