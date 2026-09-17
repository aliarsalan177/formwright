import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { nextId, type PropMap } from "../core/element.js";
import { buildField, fieldStyles, slotHasContent, type FieldParts } from "../core/field.js";
import { FwFormElement } from "../core/form-element.js";

export type OtpType = "numeric" | "alphanumeric";

const styles =
  fieldStyles +
  /* css */ `
/* The group is a row of boxes, not one bordered control. */
.control, .control:focus-within, :host([invalid]) .control,
:host([invalid]) .control:focus-within, :host([disabled]) .control {
  min-height: 0; padding: 0; gap: 0.5rem; flex-wrap: wrap;
  border: 0; background: transparent; box-shadow: none; opacity: 1;
}
.box {
  width: calc(var(--_height) + 0.125rem); height: calc(var(--_height) + 0.5rem);
  padding: 0; text-align: center; caret-color: var(--_accent);
  font: inherit; font-size: calc(var(--_text-size) * 1.375); font-weight: 600;
  font-variant-numeric: tabular-nums; color: var(--_text);
  background: var(--_surface); border: 1px solid var(--_border); border-radius: var(--_radius);
  outline: none;
  transition: border-color var(--_duration), box-shadow var(--_duration), background-color var(--_duration);
}
.box:hover:not(:focus):not(:disabled) { border-color: color-mix(in srgb, var(--_border) 60%, var(--_text)); }
.box:focus { border-color: var(--_accent); box-shadow: var(--_ring); }
:host([invalid]) .box, :host([invalid]) .box:hover { border-color: var(--_danger); }
:host([invalid]) .box:focus { box-shadow: 0 0 0 3px color-mix(in srgb, var(--_danger) 30%, transparent); }
.box::selection { background: var(--_accent-soft); }
.box:disabled { opacity: 0.6; cursor: not-allowed; background: var(--_surface-2); }
`;

const ALLOWED: Record<OtpType, RegExp> = {
  numeric: /\p{Nd}/u,
  alphanumeric: /[\p{L}\p{N}]/u,
};

/**
 * `<fw-otp-input>` — a one-time code, one character per box.
 *
 * ```html
 * <fw-otp-input label="Verification code" name="code" required></fw-otp-input>
 * <fw-otp-input label="Backup code" length="8" type="alphanumeric" mask></fw-otp-input>
 * <script>
 *   otp.addEventListener("fw-complete", (e) => verify(e.detail.value));
 * </script>
 * ```
 *
 * Typing moves to the next box, Backspace clears and moves back, the arrow
 * keys, Home and End move between boxes, and pasting — or the browser
 * filling in a code from an SMS, which the first box's
 * `autocomplete="one-time-code"` invites — fills from the current box on.
 * The boxes are one tab stop. `mask` hides the characters as dots.
 *
 * The boxes form a group named by the label; each is announced as
 * "Digit N of M" ("Character N of M" for `type="alphanumeric"`). `value` is
 * the joined code, and is what the form submits. A partly filled code is
 * `tooShort`.
 *
 * Events: `input` as the code changes; `change` and `fw-complete`
 * (`{ value }`) when every box is filled; `change` also on leaving the field
 * with a changed code.
 * Slots: `label`, `help`.
 * Parts: `field`, `label`, `control` (the group), `box`, `help`, `error`.
 */
export class FwOtpInput extends FwFormElement {
  static override props: PropMap = {
    ...FwFormElement.props,
    value: { type: "string", default: "" },
    length: { type: "number", default: 6 },
    type: { type: "string", default: "numeric" },
    mask: { type: "boolean" },
    label: { type: "string" },
    help: { type: "string" },
    error: { type: "string" },
    size: { type: "string", reflect: true, default: "md" },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open", delegatesFocus: true };

  declare value: string;
  declare length: number;
  declare type: OtpType;
  declare mask: boolean;
  declare label: string | null;
  declare help: string | null;
  declare error: string | null;
  declare size: "sm" | "md" | "lg";
  declare disabled: boolean;
  declare required: boolean;
  declare name: string | null;

  #parts!: FieldParts;
  #group!: HTMLElement;
  #boxes: HTMLInputElement[] = [];
  #helpText!: HTMLSpanElement;
  #defaultValue = "";
  /** One entry per box; empty strings are empty boxes. */
  #chars: string[] = [];
  /** The value `change` was last emitted for. */
  #committed = "";
  readonly #slots = signal(0);

  protected render(root: ShadowRoot): void {
    const id = nextId("fw-otp-input");
    this.#parts = buildField(id);
    const parts = this.#parts;
    parts.label.id = `${id}-label`;
    // A label names one control; a group of boxes is named by aria-labelledby.
    parts.label.removeAttribute("for");

    this.#group = parts.control;
    this.#group.id = id;
    this.#group.setAttribute("role", "group");
    this.#group.setAttribute("aria-labelledby", parts.label.id);

    this.#helpText = document.createElement("span");
    parts.help.querySelector("slot")!.append(this.#helpText);

    root.append(parts.field);
    this.#defaultValue = this.getAttribute("value") ?? "";
    this.#committed = this.prop<string | null>("value").peek() ?? "";
  }

  protected override connected(scope: Scope): void {
    const parts = this.#parts;
    const group = this.#group;

    // Length, type and mask → the boxes.
    scope.bind(() => {
      const length = this.#length();
      const numeric = this.prop<string | null>("type").get() !== "alphanumeric";
      const mask = this.prop<boolean>("mask").get();
      while (this.#boxes.length < length) {
        const box = document.createElement("input");
        box.className = "box";
        box.setAttribute("part", "box");
        box.setAttribute("autocapitalize", "off");
        box.setAttribute("autocorrect", "off");
        box.spellcheck = false;
        group.append(box);
        this.#boxes.push(box);
      }
      while (this.#boxes.length > length) this.#boxes.pop()!.remove();
      this.#boxes.forEach((box, i) => {
        box.type = mask ? "password" : "text";
        box.setAttribute("inputmode", numeric ? "numeric" : "text");
        box.setAttribute("autocomplete", i === 0 ? "one-time-code" : "off");
        box.setAttribute("aria-label", `${numeric ? "Digit" : "Character"} ${i + 1} of ${length}`);
      });
      this.#paint();
    });

    // Value → the characters in the boxes and the form.
    scope.bind(() => {
      const value = this.prop<string | null>("value").get() ?? "";
      const length = this.#length();
      if (value !== this.#chars.join("") || this.#chars.length !== length) {
        const chars = [...value].slice(0, length);
        this.#chars = Array.from({ length }, (_, i) => chars[i] ?? "");
        if (value.length > 0 && [...value].length > length) this.value = chars.join("");
      }
      this.#paint();
      this.#syncFormState();
    });

    scope.bind(() => {
      const disabled = this.isDisabled.get();
      this.#length();
      for (const box of this.#boxes) box.disabled = disabled;
    });

    scope.bind(() => {
      this.#slots.get();
      const label = this.prop<string | null>("label").get();
      parts.labelText.textContent = label ?? "";
      parts.label.hidden = !label && !slotHasContent(this.root, "label");
      const required = this.prop<boolean>("required").get();
      parts.required.hidden = !required;

      const help = this.prop<string | null>("help").get();
      this.#helpText.textContent = help ?? "";
      const hasHelp = Boolean(help) || slotHasContent(this.root, "help");
      parts.help.hidden = !hasHelp;

      const error = this.prop<string | null>("error").get();
      parts.error.textContent = error ?? "";
      parts.error.hidden = !error;
      this.toggleAttribute("invalid", Boolean(error));
      const describedBy = [hasHelp ? parts.help.id : null, error ? parts.error.id : null]
        .filter(Boolean)
        .join(" ");
      if (describedBy) group.setAttribute("aria-describedby", describedBy);
      else group.removeAttribute("aria-describedby");
      this.#length();
      for (const box of this.#boxes) {
        box.setAttribute("aria-invalid", String(Boolean(error)));
        box.setAttribute("aria-required", String(required));
      }
      this.#syncFormState();
    });

    const indexOf = (event: Event) => this.#boxes.indexOf(event.target as HTMLInputElement);

    const onInput = (event: Event) => {
      const i = indexOf(event);
      if (i === -1) return;
      // The host emits its own `input`, only when the code actually changed.
      event.stopPropagation();
      const box = this.#boxes[i]!;
      const old = this.#chars[i] ?? "";
      let text = box.value;
      // Typed beside an existing character rather than over it.
      if (old && [...text].length === 2 && text.includes(old)) {
        text = text.startsWith(old) ? text.slice(old.length) : text.slice(0, -old.length);
      }
      const incoming = this.#filter(text);
      if (incoming.length === 0) {
        if (box.value === "") this.#edit(i, [""], i);
        else this.#paint();
        return;
      }
      this.#fill(i, incoming);
    };

    const onKey = (event: KeyboardEvent) => {
      const i = indexOf(event);
      if (i === -1 || event.altKey || event.ctrlKey || event.metaKey) return;
      const last = this.#boxes.length - 1;
      const rtl = getComputedStyle(this).direction === "rtl";
      switch (event.key) {
        case "Backspace": {
          event.preventDefault();
          if (this.#chars[i]) this.#edit(i, [""], Math.max(i - 1, 0));
          else if (i > 0) this.#edit(i - 1, [""], i - 1);
          return;
        }
        case "Delete":
          event.preventDefault();
          this.#edit(i, [""], i);
          return;
        case "ArrowLeft":
        case "ArrowRight": {
          event.preventDefault();
          const forward = (event.key === "ArrowRight") !== rtl;
          this.#focusBox(forward ? Math.min(i + 1, last) : Math.max(i - 1, 0));
          return;
        }
        case "Home":
          event.preventDefault();
          this.#focusBox(0);
          return;
        case "End":
          event.preventDefault();
          this.#focusBox(last);
          return;
      }
    };

    const onPaste = (event: ClipboardEvent) => {
      const i = indexOf(event);
      if (i === -1) return;
      event.preventDefault();
      const text =
        event.clipboardData?.getData("text/plain") || event.clipboardData?.getData("text") || "";
      const incoming = this.#filter(text);
      if (incoming.length > 0) this.#fill(i, incoming);
    };

    const onFocusIn = (event: FocusEvent) => {
      const i = indexOf(event);
      if (i === -1) return;
      // Selected, so typing replaces rather than appends.
      this.#boxes[i]!.select();
    };

    const onFocusOut = (event: FocusEvent) => {
      if (this.#boxes.includes(event.relatedTarget as HTMLInputElement)) return;
      this.#emitChange();
    };

    const onLabelClick = () => this.focus();
    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);

    group.addEventListener("input", onInput);
    group.addEventListener("keydown", onKey);
    group.addEventListener("paste", onPaste);
    group.addEventListener("focusin", onFocusIn);
    group.addEventListener("focusout", onFocusOut);
    parts.label.addEventListener("click", onLabelClick);
    this.root.addEventListener("slotchange", onSlotChange);
    scope.add(() => {
      group.removeEventListener("input", onInput);
      group.removeEventListener("keydown", onKey);
      group.removeEventListener("paste", onPaste);
      group.removeEventListener("focusin", onFocusIn);
      group.removeEventListener("focusout", onFocusOut);
      parts.label.removeEventListener("click", onLabelClick);
      this.root.removeEventListener("slotchange", onSlotChange);
    });
  }

  #length(): number {
    const n = this.prop<number | null>("length").get() ?? 6;
    return Number.isFinite(n) && n >= 1 ? Math.min(Math.trunc(n), 64) : 6;
  }

  #filter(text: string): string[] {
    const allowed =
      ALLOWED[
        this.prop<string | null>("type").peek() === "alphanumeric" ? "alphanumeric" : "numeric"
      ];
    return [...text].filter((c) => allowed.test(c));
  }

  /** Put characters in from box `start` on, and move to the box after them. */
  #fill(start: number, incoming: readonly string[]): void {
    const room = this.#boxes.length - start;
    const used = incoming.slice(0, room);
    this.#edit(start, used, Math.min(start + used.length, this.#boxes.length - 1));
  }

  /** Write characters from `start`, focus `focusIndex`, and tell listeners. */
  #edit(start: number, chars: readonly string[], focusIndex: number): void {
    if (this.isDisabled.peek()) return;
    const before = this.#chars.join("");
    const wasComplete = this.#isComplete();
    chars.forEach((c, k) => {
      if (start + k < this.#chars.length) this.#chars[start + k] = c;
    });
    const after = this.#chars.join("");
    // Write the prop directly: the value binding sees chars already match.
    this.value = after;
    this.#paint();
    this.#syncFormState();
    this.#focusBox(focusIndex);
    if (after === before) return;
    this.emit("input");
    if (this.#isComplete() && !wasComplete) {
      this.#emitChange();
      this.emit("fw-complete", { value: after });
    }
  }

  #isComplete(): boolean {
    return this.#chars.length > 0 && this.#chars.every((c) => c !== "");
  }

  /** Box values and the single tab stop: the first empty box, or the last. */
  #paint(): void {
    const firstEmpty = this.#chars.findIndex((c) => c === "");
    const stop = firstEmpty === -1 ? this.#boxes.length - 1 : firstEmpty;
    this.#boxes.forEach((box, i) => {
      const c = this.#chars[i] ?? "";
      if (box.value !== c) box.value = c;
      box.tabIndex = i === stop ? 0 : -1;
    });
  }

  #focusBox(index: number): void {
    const box = this.#boxes[index];
    if (!box) return;
    box.focus();
    box.select();
  }

  #emitChange(): void {
    const value = this.prop<string | null>("value").peek() ?? "";
    if (value === this.#committed) return;
    this.#committed = value;
    this.emit("change");
  }

  #syncFormState(): void {
    const value = this.prop<string | null>("value").peek() ?? "";
    this.setFormValue(value === "" ? null : value);
    const filled = this.#chars.filter((c) => c !== "").length;
    const length = this.#boxes.length;
    const anchor = this.#boxes[this.#chars.findIndex((c) => c === "")] ?? this.#boxes[0];
    const error = this.prop<string | null>("error").peek();
    if (error) {
      this.setValidity({ customError: true }, error, anchor);
    } else if (filled === 0) {
      if (this.prop<boolean>("required").peek()) {
        this.setValidity({ valueMissing: true }, "Please enter the code.", anchor);
      } else {
        this.setValidity({});
      }
    } else if (filled < length) {
      this.setValidity({ tooShort: true }, `Please enter all ${length} characters.`, anchor);
    } else {
      this.setValidity({});
    }
  }

  protected resetValue(): void {
    this.value = this.#defaultValue;
    this.#committed = this.#defaultValue;
  }

  protected override restoreValue(state: string): void {
    this.value = state;
    this.#committed = state;
  }

  /** Focus the first empty box, or the last box when all are filled. */
  override focus(options?: FocusOptions): void {
    const firstEmpty = this.#chars.findIndex((c) => c === "");
    const box = this.#boxes[firstEmpty === -1 ? this.#boxes.length - 1 : firstEmpty];
    box?.focus(options);
  }

  override blur(): void {
    for (const box of this.#boxes) box.blur();
  }
}
