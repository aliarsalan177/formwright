import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { nextId, type PropMap } from "../core/element.js";
import { buildField, fieldStyles, slotHasContent, type FieldParts } from "../core/field.js";
import { FwFormElement } from "../core/form-element.js";
import { srOnly } from "../core/styles.js";

const styles =
  fieldStyles +
  srOnly +
  /* css */ `
.control { flex-wrap: wrap; padding-block: 0.25rem; row-gap: 0.25rem; cursor: text; }
/* Not display: contents, which drops the list role in some browsers. */
.tags { display: flex; flex-wrap: wrap; gap: 0.25rem; min-width: 0; max-width: 100%; }
.tag {
  display: inline-flex; align-items: center; gap: 0.125rem; max-width: 100%;
  padding: 0.125rem 0.125rem 0.125rem 0.5rem; border-radius: var(--_radius-sm);
  background: var(--_surface-2); font-size: calc(var(--_text-size) - 0.0625rem); line-height: 1.25rem;
}
.tag-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tag-remove {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 1.25rem; height: 1.25rem; padding: 0; border: 0; border-radius: var(--_radius-sm);
  background: transparent; color: var(--_muted); cursor: pointer;
}
.tag-remove:hover { color: var(--_text); background: color-mix(in srgb, var(--_muted) 20%, transparent); }
.input {
  flex: 1; min-width: 6rem; height: calc(var(--_height) - 0.5rem - 2px);
  padding: 0; border: 0; outline: none; background: transparent;
  font: inherit; font-size: var(--_text-size); color: inherit;
}
.input::placeholder { color: var(--_muted); opacity: 1; }
.input:disabled { cursor: not-allowed; }
`;

const REMOVE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

const EMPTY: readonly string[] = Object.freeze([]);

/** `["a","b"]`, a JSON array string, `"a,b"`, or nothing → a frozen list. */
function toList(input: unknown): readonly string[] {
  let items: unknown[];
  if (Array.isArray(input)) {
    items = input;
  } else if (typeof input === "string") {
    const text = input.trim();
    if (text === "") return EMPTY;
    items = text.split(",");
    if (text.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(text);
        if (Array.isArray(parsed)) items = parsed;
      } catch {
        // Not JSON; the comma split stands.
      }
    }
  } else {
    return EMPTY;
  }
  const out: string[] = [];
  for (const item of items) {
    if (item === null || item === undefined) continue;
    const value = String(item).trim();
    if (value !== "") out.push(value);
  }
  return Object.freeze(out);
}

const escapeForClass = (c: string) => c.replace(/[\\\]^-]/g, "\\$&");

/** A problem with text the user tried to add. It stays in the box until fixed. */
interface Rejection {
  message: string;
  flag: "patternMismatch" | "rangeOverflow" | "customError";
}

export interface TagEventDetail {
  value: string;
}

/**
 * `<fw-tags-input>` — free-text tokens: emails, skills, keywords.
 *
 * ```html
 * <fw-tags-input label="Skills" name="skills" value="yoga,pilates" placeholder="Add a skill"></fw-tags-input>
 *
 * <fw-tags-input
 *   label="Invite by email"
 *   name="emails"
 *   separators=", ;"
 *   pattern="[^@\s]+@[^@\s]+"
 *   max="10"
 *   required
 * ></fw-tags-input>
 * ```
 *
 * Enter, or any character in `separators` (default `,`), turns the text into
 * a tag. Pasting splits on the separators and on new lines. Backspace in an
 * empty box removes the last tag. Duplicates are refused, ignoring case,
 * unless `allow-duplicates`. Text that does not match `pattern`, would
 * exceed `max` or is a duplicate stays in the box and the field shows why.
 *
 * `value` is a `string[]` property; the attribute takes a comma-separated
 * list or a JSON array. The form submits one `name` entry per tag. The value
 * array is frozen: assign a new array rather than mutating it.
 *
 * Events: `fw-tag-add` and `fw-tag-remove` (cancelable, `{ value }`) before a
 * tag is added or removed; `input` and `change` after.
 * Slots: `label`, `help`, `prefix`, `suffix`.
 * Parts: `field`, `label`, `control`, `tags`, `tag`, `tag-remove`, `input`, `help`, `error`.
 */
export class FwTagsInput extends FwFormElement {
  static override props: PropMap = {
    ...FwFormElement.props,
    // Property-only: the attribute is a list, parsed below.
    value: { type: "json", attribute: false, default: EMPTY },
    placeholder: { type: "string" },
    label: { type: "string" },
    help: { type: "string" },
    error: { type: "string" },
    size: { type: "string", reflect: true, default: "md" },
    separators: { type: "string", default: "," },
    max: { type: "number" },
    allowDuplicates: { type: "boolean", attribute: "allow-duplicates" },
    pattern: { type: "string" },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open", delegatesFocus: true };

  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, "value"];
  }

  declare placeholder: string | null;
  declare label: string | null;
  declare help: string | null;
  declare error: string | null;
  declare size: "sm" | "md" | "lg";
  declare separators: string;
  declare max: number | null;
  declare allowDuplicates: boolean;
  declare pattern: string | null;
  declare disabled: boolean;
  declare required: boolean;
  declare name: string | null;

  #parts!: FieldParts;
  #tags!: HTMLElement;
  #input!: HTMLInputElement;
  #status!: HTMLElement;
  #helpText!: HTMLSpanElement;
  #defaultValue: readonly string[] = EMPTY;
  readonly #rejection = signal<Rejection | null>(null);
  readonly #slots = signal(0);

  /** The tags, in order. Frozen. */
  get value(): readonly string[] {
    return this.prop<readonly string[]>("value").get();
  }

  set value(next: readonly string[] | string | null) {
    const list = toList(next);
    const current = this.prop<readonly string[]>("value").peek();
    if (list.length === current.length && list.every((v, i) => v === current[i])) return;
    this.prop<readonly string[]>("value").set(list);
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === "value") this.value = value;
    else super.attributeChangedCallback(name, old, value);
  }

  /** The text typed but not yet a tag. */
  get inputValue(): string {
    return this.#input?.value ?? "";
  }

  protected render(root: ShadowRoot): void {
    const id = nextId("fw-tags-input");
    this.#parts = buildField(id);
    const parts = this.#parts;

    const prefix = document.createElement("slot");
    prefix.name = "prefix";

    this.#tags = document.createElement("div");
    this.#tags.className = "tags";
    this.#tags.setAttribute("part", "tags");
    this.#tags.setAttribute("role", "list");

    this.#input = document.createElement("input");
    this.#input.id = id;
    this.#input.type = "text";
    this.#input.className = "input";
    this.#input.setAttribute("part", "input");
    this.#input.setAttribute("autocomplete", "off");
    this.#input.setAttribute("enterkeyhint", "done");

    const suffix = document.createElement("slot");
    suffix.name = "suffix";

    parts.control.append(prefix, this.#tags, this.#input, suffix);

    // Announces additions and removals, which are otherwise silent.
    this.#status = document.createElement("div");
    this.#status.className = "sr-only";
    this.#status.setAttribute("role", "status");

    this.#helpText = document.createElement("span");
    parts.help.querySelector("slot")!.append(this.#helpText);

    root.append(parts.field, this.#status);
    this.#defaultValue = toList(this.getAttribute("value"));
  }

  protected override connected(scope: Scope): void {
    const parts = this.#parts;
    const input = this.#input;

    scope.bind(() => {
      const values = this.prop<readonly string[]>("value").get();
      const disabled = this.isDisabled.get();
      this.#renderTags(values, disabled);
      this.#tags.setAttribute(
        "aria-label",
        `${values.length} ${values.length === 1 ? "tag" : "tags"}`,
      );
      this.#tags.hidden = values.length === 0;
      this.#syncFormState();
    });

    scope.bind(() => {
      this.prop<string | null>("name").get();
      this.#syncFormState();
    });

    scope.bind(() => {
      input.placeholder = this.prop<string | null>("placeholder").get() ?? "";
      input.disabled = this.isDisabled.get();
    });

    scope.bind(() => {
      this.#slots.get();
      const label = this.prop<string | null>("label").get();
      parts.labelText.textContent = label ?? "";
      parts.label.hidden = !label && !slotHasContent(this.root, "label");
      const required = this.prop<boolean>("required").get();
      parts.required.hidden = !required;
      input.setAttribute("aria-required", String(required));

      const help = this.prop<string | null>("help").get();
      this.#helpText.textContent = help ?? "";
      const hasHelp = Boolean(help) || slotHasContent(this.root, "help");
      parts.help.hidden = !hasHelp;

      // The author's error wins; otherwise, why the typed text was refused.
      const message = this.prop<string | null>("error").get() || this.#rejection.get()?.message;
      parts.error.textContent = message ?? "";
      parts.error.hidden = !message;
      input.setAttribute("aria-invalid", String(Boolean(message)));
      this.toggleAttribute("invalid", Boolean(message));
      const describedBy = [hasHelp ? parts.help.id : null, message ? parts.error.id : null]
        .filter(Boolean)
        .join(" ");
      if (describedBy) input.setAttribute("aria-describedby", describedBy);
      else input.removeAttribute("aria-describedby");
      this.#syncFormState();
    });

    const onKey = (event: KeyboardEvent) => {
      if (this.isDisabled.get() || event.isComposing) return;
      if (event.key === "Enter") {
        if (input.value.trim() === "") return;
        event.preventDefault();
        this.#addText(input.value);
        return;
      }
      if (event.key.length === 1 && this.#separators().includes(event.key)) {
        event.preventDefault();
        if (input.value.trim() !== "") this.#addText(input.value);
        return;
      }
      if (
        event.key === "Backspace" &&
        input.value === "" &&
        (input.selectionStart ?? 0) === 0 &&
        (input.selectionEnd ?? 0) === 0
      ) {
        const values = this.prop<readonly string[]>("value").peek();
        if (values.length > 0) {
          event.preventDefault();
          this.#removeAt(values.length - 1);
        }
      }
    };

    const onInput = (event: Event) => {
      // Typing is not a value change; the host emits `input` when tags change.
      event.stopPropagation();
      if (this.#rejection.peek()) this.#rejection.set(null);
      // A separator that arrived without a keydown — a mobile keyboard, an
      // IME, autofill — still splits.
      const separators = this.#separators();
      const text = input.value;
      if ([...separators].some((s) => text.includes(s))) {
        const pieces = this.#split(text);
        const endsWithSeparator = separators.includes(text[text.length - 1] ?? "");
        const rest = endsWithSeparator ? "" : (pieces.pop() ?? "");
        input.value = "";
        this.#addMany(pieces, rest);
      }
    };

    const onPaste = (event: ClipboardEvent) => {
      if (this.isDisabled.get()) return;
      const text =
        event.clipboardData?.getData("text/plain") || event.clipboardData?.getData("text");
      if (!text) return;
      const hasBreak = /[\r\n]/.test(text) || [...this.#separators()].some((s) => text.includes(s));
      if (!hasBreak) return;
      event.preventDefault();
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const combined = input.value.slice(0, start) + text + input.value.slice(end);
      input.value = "";
      this.#rejection.set(null);
      this.#addMany(this.#split(combined), "");
    };

    const onRemoveClick = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest?.<HTMLElement>("[part~=tag-remove]");
      if (!button || this.isDisabled.get()) return;
      event.stopPropagation();
      const index = Number(button.dataset.index);
      if (Number.isInteger(index)) this.#removeAt(index);
      input.focus();
    };

    const onControlMouseDown = (event: MouseEvent) => {
      if (event.target === input) return;
      // Pressing a chip or its button keeps the caret in the text box.
      event.preventDefault();
      if (!this.isDisabled.get()) input.focus();
    };

    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);

    input.addEventListener("keydown", onKey);
    input.addEventListener("input", onInput);
    input.addEventListener("paste", onPaste);
    parts.control.addEventListener("click", onRemoveClick);
    parts.control.addEventListener("mousedown", onControlMouseDown);
    this.root.addEventListener("slotchange", onSlotChange);
    scope.add(() => {
      input.removeEventListener("keydown", onKey);
      input.removeEventListener("input", onInput);
      input.removeEventListener("paste", onPaste);
      parts.control.removeEventListener("click", onRemoveClick);
      parts.control.removeEventListener("mousedown", onControlMouseDown);
      this.root.removeEventListener("slotchange", onSlotChange);
    });
  }

  #separators(): string {
    const value = this.prop<string | null>("separators").peek();
    return value ?? ",";
  }

  #split(text: string): string[] {
    const separators = this.#separators();
    const chars = `\\r\\n${[...separators].map(escapeForClass).join("")}`;
    return text
      .split(new RegExp(`[${chars}]`, "u"))
      .map((s) => s.trim())
      .filter((s) => s !== "");
  }

  #renderTags(values: readonly string[], disabled: boolean): void {
    const items = values.map((value, index) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.setAttribute("part", "tag");
      tag.setAttribute("role", "listitem");
      const text = document.createElement("span");
      text.className = "tag-text";
      text.textContent = value;
      tag.append(text);
      if (!disabled) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "tag-remove";
        remove.tabIndex = -1;
        remove.dataset.index = String(index);
        remove.setAttribute("part", "tag-remove");
        remove.setAttribute("aria-label", `Remove ${value}`);
        remove.innerHTML = REMOVE;
        tag.append(remove);
      }
      return tag;
    });
    this.#tags.replaceChildren(...items);
  }

  /** Why `text` cannot be added to `values`, or null when it can. */
  #check(text: string, values: readonly string[]): Rejection | null {
    const pattern = this.prop<string | null>("pattern").peek();
    if (pattern) {
      let regex: RegExp | null = null;
      try {
        regex = new RegExp(`^(?:${pattern})$`, "v");
      } catch {
        try {
          regex = new RegExp(`^(?:${pattern})$`, "u");
        } catch {
          regex = null;
        }
      }
      if (regex && !regex.test(text)) {
        return { message: `“${text}” is not in the expected format.`, flag: "patternMismatch" };
      }
    }
    if (!this.prop<boolean>("allowDuplicates").peek()) {
      const lower = text.toLowerCase();
      if (values.some((v) => v.toLowerCase() === lower)) {
        return { message: `“${text}” has already been added.`, flag: "customError" };
      }
    }
    const max = this.prop<number | null>("max").peek();
    if (max !== null && max > 0 && values.length >= max) {
      return {
        message: `No more than ${max} ${max === 1 ? "tag" : "tags"} can be added.`,
        flag: "rangeOverflow",
      };
    }
    return null;
  }

  #addText(text: string): void {
    this.#input.value = "";
    this.#addMany(this.#split(text), "");
  }

  /**
   * Add each piece in turn. Anything refused goes back into the text box —
   * joined with the first separator — along with `rest`, the unfinished
   * text after the last separator.
   */
  #addMany(pieces: readonly string[], rest: string): void {
    const kept: string[] = [];
    let rejection: Rejection | null = null;
    let values = this.prop<readonly string[]>("value").peek();
    for (const piece of pieces) {
      const problem = this.#check(piece, values);
      if (problem) {
        rejection ??= problem;
        kept.push(piece);
        continue;
      }
      if (!this.emit<TagEventDetail>("fw-tag-add", { value: piece }, { cancelable: true })) {
        kept.push(piece);
        continue;
      }
      values = [...values, piece];
    }
    const joiner = this.#separators()[0] ?? ",";
    const leftover = [...kept, ...(rest ? [rest] : [])].join(`${joiner} `);
    this.#input.value = leftover;
    this.#rejection.set(rejection);
    const added = values.length - this.prop<readonly string[]>("value").peek().length;
    if (added > 0) {
      const newOnes = values.slice(values.length - added);
      this.#commit(values);
      this.#announce(`Added ${newOnes.join(", ")}`);
    }
  }

  #removeAt(index: number): void {
    const values = this.prop<readonly string[]>("value").peek();
    const tag = values[index];
    if (tag === undefined) return;
    if (!this.emit<TagEventDetail>("fw-tag-remove", { value: tag }, { cancelable: true })) return;
    this.#rejection.set(null);
    this.#commit(values.filter((_, i) => i !== index));
    this.#announce(`Removed ${tag}`);
  }

  #announce(message: string): void {
    this.#status.textContent = message;
  }

  #commit(next: readonly string[]): void {
    this.value = next;
    this.emit("input");
    this.emit("change");
  }

  #syncFormState(): void {
    const values = this.prop<readonly string[]>("value").peek();
    const name = this.prop<string | null>("name").peek();
    if (values.length === 0 || !name || typeof FormData === "undefined") {
      this.setFormValue(null);
    } else {
      const data = new FormData();
      for (const value of values) data.append(name, value);
      this.setFormValue(data);
    }
    const error = this.prop<string | null>("error").peek();
    const rejection = this.#rejection.peek();
    if (error) {
      this.setValidity({ customError: true }, error, this.#input);
    } else if (rejection) {
      this.setValidity({ [rejection.flag]: true }, rejection.message, this.#input);
    } else if (this.prop<boolean>("required").peek() && values.length === 0) {
      this.setValidity({ valueMissing: true }, "Please add at least one entry.", this.#input);
    } else {
      this.setValidity({});
    }
  }

  protected resetValue(): void {
    this.#rejection.set(null);
    if (this.#input) this.#input.value = "";
    this.value = this.#defaultValue;
  }

  protected override restoreValue(state: string): void {
    this.value = state;
  }

  override formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof FormData !== "undefined" && state instanceof FormData) {
      const name = this.prop<string | null>("name").peek();
      this.value = name ? state.getAll(name).map(String) : EMPTY;
      return;
    }
    super.formStateRestoreCallback(state);
  }

  override focus(options?: FocusOptions): void {
    this.#input?.focus(options);
  }

  override blur(): void {
    this.#input?.blur();
  }
}
