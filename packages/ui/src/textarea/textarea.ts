import { signal } from "@formwright/reactive";
import { observeResize, type Scope } from "@formwright/ui-core";
import { nextId, type PropMap } from "../core/element.js";
import { buildField, fieldStyles, slotHasContent, type FieldParts } from "../core/field.js";
import { FwFormElement } from "../core/form-element.js";

const styles =
  fieldStyles +
  /* css */ `
.control { align-items: stretch; padding: 0; }
.textarea {
  flex: 1; min-width: 0; min-height: var(--_height); margin: 0;
  padding: 0.5rem 0.75rem; border: 0; outline: none; background: transparent;
  border-radius: inherit;
  font: inherit; font-size: var(--_text-size); line-height: 1.5; color: inherit;
  resize: vertical;
}
.textarea::placeholder { color: var(--_muted); opacity: 1; }
.textarea:disabled { cursor: not-allowed; }
:host([resize="none"]) .textarea, :host([autoresize]) .textarea { resize: none; }

.footer { display: flex; align-items: baseline; gap: 0.75rem; }
.footer .help { flex: 1; min-width: 0; }
.counter {
  margin-inline-start: auto; flex: none;
  font-size: 0.8125rem; color: var(--_muted); font-variant-numeric: tabular-nums;
}
.counter.over { color: var(--_danger); }
`;

/**
 * `<fw-textarea>` — multi-line text with its label, help and error built in.
 *
 * ```html
 * <fw-textarea label="Notes" name="notes" rows="4"></fw-textarea>
 * <fw-textarea label="Bio" maxlength="200" counter help="Shown on the profile"></fw-textarea>
 * <fw-textarea label="Message" autoresize max-rows="8"></fw-textarea>
 * <fw-textarea label="Address" resize="none" error="Required for delivery"></fw-textarea>
 * ```
 *
 * The same frame as `<fw-input>`, so the two line up in a form. `autoresize`
 * grows the box with its content, from `rows` up to `max-rows`, after which
 * it scrolls. `counter` shows "12 / 200" when `maxlength` is set, and
 * announces it politely.
 *
 * Events: `input` as the user types, `change` when they commit.
 * Slots: `label`, `help`.
 * Parts: `field`, `label`, `control`, `textarea`, `help`, `counter`, `error`.
 */
export class FwTextarea extends FwFormElement {
  static override props: PropMap = {
    ...FwFormElement.props,
    value: { type: "string", default: "" },
    placeholder: { type: "string" },
    label: { type: "string" },
    help: { type: "string" },
    error: { type: "string" },
    rows: { type: "number", default: 3 },
    autoresize: { type: "boolean", reflect: true },
    maxRows: { type: "number" },
    minlength: { type: "number" },
    maxlength: { type: "number" },
    counter: { type: "boolean" },
    readOnly: { type: "boolean", attribute: "readonly", reflect: true },
    size: { type: "string", reflect: true, default: "md" },
    resize: { type: "string", reflect: true, default: "vertical" },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open", delegatesFocus: true };

  declare value: string;
  declare placeholder: string | null;
  declare label: string | null;
  declare help: string | null;
  declare error: string | null;
  declare rows: number;
  declare autoresize: boolean;
  declare maxRows: number | null;
  declare minlength: number | null;
  declare maxlength: number | null;
  declare counter: boolean;
  declare readOnly: boolean;
  declare size: "sm" | "md" | "lg";
  declare resize: "none" | "vertical";
  declare disabled: boolean;
  declare required: boolean;
  declare name: string | null;

  #parts!: FieldParts;
  #textarea!: HTMLTextAreaElement;
  #helpText!: HTMLSpanElement;
  #counter!: HTMLElement;
  #defaultValue = "";
  readonly #slots = signal(0);

  protected render(root: ShadowRoot): void {
    const id = nextId("fw-textarea");
    this.#parts = buildField(id);

    this.#textarea = document.createElement("textarea");
    this.#textarea.id = id;
    this.#textarea.className = "textarea";
    this.#textarea.setAttribute("part", "textarea");
    this.#parts.control.append(this.#textarea);

    this.#helpText = document.createElement("span");
    this.#parts.help.querySelector("slot")!.append(this.#helpText);

    this.#counter = document.createElement("div");
    this.#counter.className = "counter";
    this.#counter.setAttribute("part", "counter");
    this.#counter.id = `${id}-counter`;
    this.#counter.setAttribute("aria-live", "polite");

    // Help on the start side, the count on the end side, on one row.
    const footer = document.createElement("div");
    footer.className = "footer";
    this.#parts.help.replaceWith(footer);
    footer.append(this.#parts.help, this.#counter);

    root.append(this.#parts.field);
    this.#defaultValue = this.getAttribute("value") ?? "";
  }

  protected override connected(scope: Scope): void {
    const textarea = this.#textarea;
    const parts = this.#parts;

    scope.bind(() => {
      const value = this.prop<string | null>("value").get() ?? "";
      if (textarea.value !== value) textarea.value = value;
      this.#syncFormState();
    });

    scope.bind(() => {
      textarea.placeholder = this.prop<string | null>("placeholder").get() ?? "";
      textarea.readOnly = this.prop<boolean>("readOnly").get();
      textarea.disabled = this.isDisabled.get();
      textarea.required = this.prop<boolean>("required").get();
      const rows = this.prop<number | null>("rows").get();
      textarea.rows = rows !== null && rows > 0 ? Math.floor(rows) : 3;
      const minlength = this.prop<number | null>("minlength").get();
      const maxlength = this.prop<number | null>("maxlength").get();
      setOrRemove(textarea, "minlength", minlength === null ? null : String(minlength));
      setOrRemove(textarea, "maxlength", maxlength === null ? null : String(maxlength));
      this.#syncFormState();
    });

    scope.bind(() => {
      const length = (this.prop<string | null>("value").get() ?? "").length;
      const maxlength = this.prop<number | null>("maxlength").get();
      const show = this.prop<boolean>("counter").get() && maxlength !== null;
      this.#counter.hidden = !show;
      this.#counter.textContent = show ? `${length} / ${maxlength}` : "";
      this.#counter.classList.toggle("over", show && length > maxlength);
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
      textarea.setAttribute("aria-invalid", String(Boolean(error)));
      this.toggleAttribute("invalid", Boolean(error));

      const describedBy = [hasHelp ? parts.help.id : null, error ? parts.error.id : null]
        .filter(Boolean)
        .join(" ");
      setOrRemove(textarea, "aria-describedby", describedBy || null);
      this.#syncFormState();
    });

    // Autoresize: refit whenever the content, the row limits or the width
    // (which changes where lines wrap) changes.
    scope.bind(() => {
      this.prop<string | null>("value").get();
      this.prop<number | null>("rows").get();
      this.prop<number | null>("maxRows").get();
      this.prop<string | null>("size").get();
      this.#fit(this.prop<boolean>("autoresize").get());
    });
    scope.add(observeResize(textarea, () => this.#fit(this.prop<boolean>("autoresize").peek())));

    const onInput = () => {
      this.prop<string>("value").set(textarea.value);
    };
    const onChange = () => this.emit("change");
    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);

    textarea.addEventListener("input", onInput);
    textarea.addEventListener("change", onChange);
    this.root.addEventListener("slotchange", onSlotChange);
    scope.add(() => {
      textarea.removeEventListener("input", onInput);
      textarea.removeEventListener("change", onChange);
      this.root.removeEventListener("slotchange", onSlotChange);
    });
  }

  /** Size the textarea to its content, capped at `max-rows`. */
  #fit(enabled: boolean): void {
    const textarea = this.#textarea;
    if (!enabled) {
      textarea.style.removeProperty("height");
      textarea.style.removeProperty("overflow-y");
      return;
    }
    // Collapse first, so scrollHeight measures the content rather than the
    // box it currently sits in; `rows` keeps it from collapsing below that.
    textarea.style.height = "auto";
    const cs = getComputedStyle(textarea);
    const px = (v: string) => {
      const n = Number.parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    const fontSize = px(cs.fontSize) || 14;
    const lineHeight = cs.lineHeight.endsWith("px") ? px(cs.lineHeight) : fontSize * 1.5;
    const chrome =
      px(cs.paddingTop) + px(cs.paddingBottom) + px(cs.borderTopWidth) + px(cs.borderBottomWidth);
    const maxRows = this.prop<number | null>("maxRows").peek();
    const cap = maxRows !== null && maxRows > 0 ? maxRows * lineHeight + chrome : Infinity;
    const content = textarea.scrollHeight;
    if (content <= 0) {
      // Not laid out (display: none, or no layout engine): leave it to `rows`.
      textarea.style.removeProperty("height");
      return;
    }
    textarea.style.height = `${Math.min(content, cap)}px`;
    textarea.style.overflowY = content > cap ? "auto" : "hidden";
  }

  #syncFormState(): void {
    const textarea = this.#textarea;
    this.setFormValue(textarea.value);
    const error = this.prop<string | null>("error").peek();
    if (error) {
      this.setValidity({ customError: true }, error, textarea);
      return;
    }
    const v = textarea.validity;
    this.setValidity(
      { valueMissing: v.valueMissing, tooLong: v.tooLong, tooShort: v.tooShort },
      textarea.validationMessage,
      textarea,
    );
  }

  protected resetValue(): void {
    this.value = this.#defaultValue;
  }

  protected override restoreValue(state: string): void {
    this.value = state;
  }

  override focus(options?: FocusOptions): void {
    this.#textarea?.focus(options);
  }

  override blur(): void {
    this.#textarea?.blur();
  }

  select(): void {
    this.#textarea?.select();
  }

  setSelectionRange(start: number, end: number, direction?: "forward" | "backward" | "none"): void {
    this.#textarea?.setSelectionRange(start, end, direction);
  }
}

function setOrRemove(el: Element, name: string, value: string | null): void {
  if (value === null || value === "") el.removeAttribute(name);
  else el.setAttribute(name, value);
}
