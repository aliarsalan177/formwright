import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { nextId, type PropMap } from "../core/element.js";
import { slotHasContent } from "../core/field.js";
import { FwFormElement } from "../core/form-element.js";

const styles = /* css */ `
:host {
  display: inline-block; vertical-align: middle;
  --_box: 1rem; --_line: 1.25rem;
  /* Small controls need a firmer edge than a text field to read at a glance. */
  --_box-border: color-mix(in srgb, var(--_muted) 30%, var(--_border));
}
:host([size="sm"]) { --_box: 0.875rem; --_line: 1.125rem; }
:host([size="lg"]) { --_box: 1.25rem; --_line: 1.5rem; }

.base { display: inline-flex; flex-direction: column; gap: 0.125rem; }
.row {
  position: relative; display: inline-flex; align-items: flex-start; gap: 0.5rem;
  font-size: var(--_text-size); line-height: var(--_line); cursor: pointer; user-select: none;
}
.native {
  position: absolute; inset-block-start: 0; inset-inline-start: 0;
  width: var(--_box); height: var(--_box); margin: 0; margin-block-start: calc((var(--_line) - var(--_box)) / 2);
  opacity: 0; cursor: inherit;
}
.box {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: var(--_box); height: var(--_box); margin-block-start: calc((var(--_line) - var(--_box)) / 2);
  border: 1px solid var(--_box-border);
  border-radius: min(calc(var(--_radius-sm) * 0.75), calc(var(--_box) * 0.3));
  background: var(--_surface); color: var(--_accent-contrast);
  transition: background-color var(--_duration), border-color var(--_duration), box-shadow var(--_duration);
  pointer-events: none;
}
.box svg { width: 85%; height: 85%; }
.check, .dash { display: none; }
.native:checked + .box, .native:indeterminate + .box { background: var(--_accent); border-color: var(--_accent); }
.native:checked:not(:indeterminate) + .box .check { display: block; }
.native:indeterminate + .box .dash { display: block; }
.row:hover .native:not(:disabled):not(:checked):not(:indeterminate) + .box {
  border-color: color-mix(in srgb, var(--_accent) 70%, var(--_box-border));
}
.row:hover .native:not(:disabled):checked + .box,
.row:hover .native:not(:disabled):indeterminate + .box { background: var(--_accent-hover); border-color: var(--_accent-hover); }
.native:focus-visible + .box { box-shadow: var(--_ring); }
.label { color: var(--_text); }

:host([invalid]) .native:not(:checked):not(:indeterminate) + .box { border-color: var(--_danger); }
:host([invalid]) .native:focus-visible + .box { box-shadow: 0 0 0 3px color-mix(in srgb, var(--_danger) 30%, transparent); }
.base.disabled .row { cursor: not-allowed; opacity: 0.55; }

.help, .error {
  font-size: 0.8125rem; line-height: 1.125rem;
  padding-inline-start: calc(var(--_box) + 0.5rem);
}
.help { color: var(--_muted); }
.error { color: var(--_danger); }
`;

const CHECK = `<svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
const DASH = `<svg class="dash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>`;

/**
 * `<fw-checkbox>` — a yes/no choice, or one of several.
 *
 * ```html
 * <fw-checkbox name="terms" required>I accept the terms</fw-checkbox>
 * <fw-checkbox name="plan" value="gold" checked>Gold</fw-checkbox>
 * <fw-checkbox indeterminate>Select all</fw-checkbox>
 * <fw-checkbox help="We never share it" error="Please confirm">Email me</fw-checkbox>
 * ```
 *
 * A real `<input type="checkbox">` sits under the drawn box, so the role,
 * checked and mixed states, Space to toggle and form semantics are the
 * browser's own. Clicking anywhere on the label toggles it. Submits `value`
 * (default "on") only while checked; `required` blocks submission until it
 * is. A user toggle clears `indeterminate`, as it does natively.
 *
 * Events: `input` and `change` when the user toggles.
 * Slots: default (label), `help`.
 * Parts: `base`, `input`, `control`, `label`, `help`, `error`.
 */
export class FwCheckbox extends FwFormElement {
  static override props: PropMap = {
    ...FwFormElement.props,
    checked: { type: "boolean", reflect: true },
    indeterminate: { type: "boolean", reflect: true },
    value: { type: "string", default: "on" },
    size: { type: "string", reflect: true, default: "md" },
    help: { type: "string" },
    error: { type: "string" },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open", delegatesFocus: true };

  declare checked: boolean;
  declare indeterminate: boolean;
  declare value: string;
  declare size: "sm" | "md" | "lg";
  declare help: string | null;
  declare error: string | null;
  declare disabled: boolean;
  declare required: boolean;
  declare name: string | null;

  #base!: HTMLElement;
  #label!: HTMLElement;
  #input!: HTMLInputElement;
  #help!: HTMLElement;
  #helpText!: HTMLSpanElement;
  #error!: HTMLElement;
  #defaultChecked = false;
  #defaultIndeterminate = false;
  readonly #slots = signal(0);

  protected render(root: ShadowRoot): void {
    const id = nextId("fw-checkbox");

    this.#base = document.createElement("div");
    this.#base.className = "base";
    this.#base.setAttribute("part", "base");

    // The label wraps the input, so a click anywhere on it toggles.
    const row = document.createElement("label");
    row.className = "row";

    this.#input = document.createElement("input");
    this.#input.type = "checkbox";
    this.#input.id = id;
    this.#input.className = "native";
    this.#input.setAttribute("part", "input");

    const box = document.createElement("span");
    box.className = "box";
    box.setAttribute("part", "control");
    box.setAttribute("aria-hidden", "true");
    box.innerHTML = CHECK + DASH;

    const label = document.createElement("span");
    label.className = "label";
    label.setAttribute("part", "label");
    label.append(document.createElement("slot"));
    this.#label = label;

    row.append(this.#input, box, label);

    this.#help = document.createElement("div");
    this.#help.className = "help";
    this.#help.setAttribute("part", "help");
    this.#help.id = `${id}-help`;
    const helpSlot = document.createElement("slot");
    helpSlot.name = "help";
    this.#helpText = document.createElement("span");
    helpSlot.append(this.#helpText);
    this.#help.append(helpSlot);

    this.#error = document.createElement("div");
    this.#error.className = "error";
    this.#error.setAttribute("part", "error");
    this.#error.id = `${id}-error`;
    this.#error.setAttribute("aria-live", "polite");

    this.#base.append(row, this.#help, this.#error);
    root.append(this.#base);

    this.#defaultChecked = this.hasAttribute("checked");
    this.#defaultIndeterminate = this.hasAttribute("indeterminate");
  }

  protected override connected(scope: Scope): void {
    const input = this.#input;

    // With no slotted label, the name comes from the host's aria-label,
    // which does not reach the inner input on its own.
    const syncName = () => {
      const name = this.getAttribute("aria-label");
      if (name) input.setAttribute("aria-label", name);
      else input.removeAttribute("aria-label");
    };
    syncName();
    if (typeof MutationObserver !== "undefined") {
      const nameObserver = new MutationObserver(syncName);
      nameObserver.observe(this, { attributes: true, attributeFilter: ["aria-label"] });
      scope.add(() => nameObserver.disconnect());
    }

    scope.bind(() => {
      input.checked = this.prop<boolean>("checked").get();
      input.indeterminate = this.prop<boolean>("indeterminate").get();
      this.prop<string | null>("value").get();
      this.#syncFormState();
    });

    scope.bind(() => {
      const disabled = this.isDisabled.get();
      input.disabled = disabled;
      this.#base.classList.toggle("disabled", disabled);
      input.required = this.prop<boolean>("required").get();
      this.#syncFormState();
    });

    scope.bind(() => {
      this.#slots.get();
      this.#label.hidden = !defaultSlotHasContent(this.root);
      const help = this.prop<string | null>("help").get();
      this.#helpText.textContent = help ?? "";
      const hasHelp = Boolean(help) || slotHasContent(this.root, "help");
      this.#help.hidden = !hasHelp;

      const error = this.prop<string | null>("error").get();
      this.#error.textContent = error ?? "";
      this.#error.hidden = !error;
      input.setAttribute("aria-invalid", String(Boolean(error)));
      this.toggleAttribute("invalid", Boolean(error));

      const describedBy = [hasHelp ? this.#help.id : null, error ? this.#error.id : null]
        .filter(Boolean)
        .join(" ");
      if (describedBy) input.setAttribute("aria-describedby", describedBy);
      else input.removeAttribute("aria-describedby");
      this.#syncFormState();
    });

    const onInput = (event: Event) => {
      this.checked = input.checked;
      this.indeterminate = false;
      // Browsers compose a native `input`, so it already reaches the host.
      if (!event.composed) this.emit("input");
    };
    // `change` is not composed; re-emit it from the host.
    const onChange = () => this.emit("change");
    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);

    input.addEventListener("input", onInput);
    input.addEventListener("change", onChange);
    this.root.addEventListener("slotchange", onSlotChange);
    scope.add(() => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("change", onChange);
      this.root.removeEventListener("slotchange", onSlotChange);
    });
  }

  #syncFormState(): void {
    const checked = this.prop<boolean>("checked").peek();
    const value = this.prop<string | null>("value").peek() ?? "on";
    this.setFormValue(checked ? value : null);
    const error = this.prop<string | null>("error").peek();
    if (error) {
      this.setValidity({ customError: true }, error, this.#input);
    } else if (this.prop<boolean>("required").peek() && !checked) {
      this.setValidity(
        { valueMissing: true },
        this.#input.validationMessage || "Please check this box to proceed.",
        this.#input,
      );
    } else {
      this.setValidity({});
    }
  }

  protected resetValue(): void {
    this.checked = this.#defaultChecked;
    this.indeterminate = this.#defaultIndeterminate;
  }

  protected override restoreValue(state: string): void {
    this.checked = state === (this.prop<string | null>("value").peek() ?? "on");
  }

  /** Toggle, as a user click would — firing `input` and `change`. */
  override click(): void {
    this.#input?.click();
  }

  override focus(options?: FocusOptions): void {
    this.#input?.focus(options);
  }

  override blur(): void {
    this.#input?.blur();
  }
}

function defaultSlotHasContent(root: ShadowRoot): boolean {
  const slot = root.querySelector<HTMLSlotElement>("slot:not([name])");
  return (
    slot
      ?.assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? "").trim() !== "") ?? false
  );
}
