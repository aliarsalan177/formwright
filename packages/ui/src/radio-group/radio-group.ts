import { signal } from "@formwright/reactive";
import { createCollection, type Collection, type Scope } from "@formwright/ui-core";
import { nextId, type PropMap } from "../core/element.js";
import { slotHasContent } from "../core/field.js";
import { FwFormElement } from "../core/form-element.js";
import type { FwRadio } from "./radio.js";

const styles = /* css */ `
:host { display: block; }
.field { display: flex; flex-direction: column; gap: 0.5rem; }
.label { font-size: var(--_text-size); font-weight: 500; line-height: 1.25rem; color: var(--_text); }
.label .required { color: var(--_danger); margin-inline-start: 0.125rem; font-weight: 600; }
.group { display: flex; flex-direction: column; gap: 0.5rem; }
:host([orientation="horizontal"]) .group { flex-direction: row; flex-wrap: wrap; column-gap: 1.25rem; row-gap: 0.5rem; }
:host([invalid]) .group ::slotted(*) { --_radio-border: var(--_danger); }
.group.disabled ::slotted(*) { opacity: 0.55; cursor: not-allowed; pointer-events: none; }
.help, .error { font-size: 0.8125rem; line-height: 1.125rem; }
.help { color: var(--_muted); }
.error { color: var(--_danger); }
/* Help and error sit closer to each other than to the options. */
.help:not([hidden]) + .error { margin-block-start: -0.25rem; }
`;

/**
 * `<fw-radio-group>` — pick exactly one of a few visible options.
 *
 * ```html
 * <fw-radio-group label="Billing" name="billing" value="monthly" required>
 *   <fw-radio value="monthly">Monthly</fw-radio>
 *   <fw-radio value="yearly">Yearly</fw-radio>
 *   <fw-radio value="lifetime" disabled>Lifetime</fw-radio>
 * </fw-radio-group>
 * <fw-radio-group label="Size" orientation="horizontal">…</fw-radio-group>
 * ```
 *
 * The group, not each radio, is the form control: it submits one value
 * under `name`, is required as a whole, and resets and disables together.
 *
 * Keyboard follows the WAI-ARIA radio group pattern. Tab enters the group
 * on the checked radio (or the first enabled one) and leaves it in one
 * press; the arrow keys move and select, stepping over disabled radios and
 * wrapping at the ends; Space selects the focused radio.
 *
 * The `role="radiogroup"` element is in the shadow root, but the radios are
 * slotted into it, so in the flattened tree screen readers see them as its
 * children and read the group label with them.
 *
 * Events: `input` and `change` when the user picks.
 * Slots: default (radios), `label`, `help`.
 * Parts: `field`, `label`, `group`, `help`, `error`.
 */
export class FwRadioGroup extends FwFormElement {
  static override props: PropMap = {
    ...FwFormElement.props,
    value: { type: "string", default: "" },
    label: { type: "string" },
    help: { type: "string" },
    error: { type: "string" },
    orientation: { type: "string", reflect: true, default: "vertical" },
  };
  static override styles = styles;

  declare value: string;
  declare label: string | null;
  declare help: string | null;
  declare error: string | null;
  declare orientation: "vertical" | "horizontal";
  declare disabled: boolean;
  declare required: boolean;
  declare name: string | null;

  #label!: HTMLElement;
  #labelText!: HTMLSpanElement;
  #required!: HTMLSpanElement;
  #group!: HTMLElement;
  #help!: HTMLElement;
  #helpText!: HTMLSpanElement;
  #error!: HTMLElement;
  #defaultValue = "";
  #collection: Collection | null = null;
  /** Bumped when radios are added, removed, re-valued or disabled. */
  readonly #radiosVersion = signal(0);
  readonly #slots = signal(0);

  /** The radios, in document order. */
  get radios(): FwRadio[] {
    return [...this.querySelectorAll<FwRadio>("fw-radio")];
  }

  protected render(root: ShadowRoot): void {
    const id = nextId("fw-radio-group");

    const field = document.createElement("div");
    field.className = "field";
    field.setAttribute("part", "field");

    this.#label = document.createElement("div");
    this.#label.className = "label";
    this.#label.setAttribute("part", "label");
    this.#label.id = `${id}-label`;
    const labelSlot = document.createElement("slot");
    labelSlot.name = "label";
    this.#labelText = document.createElement("span");
    labelSlot.append(this.#labelText);
    this.#required = document.createElement("span");
    this.#required.className = "required";
    this.#required.setAttribute("aria-hidden", "true");
    this.#required.textContent = "*";
    this.#label.append(labelSlot, this.#required);

    this.#group = document.createElement("div");
    this.#group.className = "group";
    this.#group.setAttribute("part", "group");
    this.#group.setAttribute("role", "radiogroup");
    this.#group.setAttribute("aria-labelledby", this.#label.id);
    this.#group.append(document.createElement("slot"));

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

    field.append(this.#label, this.#group, this.#help, this.#error);
    root.append(field);

    // A `checked` radio in the markup stands in for a missing group value.
    if (!this.hasAttribute("value")) {
      const preset = this.querySelector("fw-radio[checked]");
      if (preset) this.prop<string>("value").set(preset.getAttribute("value") ?? "");
    }
    this.#defaultValue = this.prop<string | null>("value").peek() ?? "";
  }

  protected override connected(scope: Scope): void {
    this.#collection = createCollection({
      items: () => this.radios,
      orientation: "both",
      typeahead: false,
      isDisabled: (item) => item.hasAttribute("disabled"),
      dir: () => (this.closest("[dir]")?.getAttribute("dir") === "rtl" ? "rtl" : "ltr"),
    });
    scope.add(() => {
      this.#collection?.dispose();
      this.#collection = null;
    });

    const bump = () => this.#radiosVersion.set(this.#radiosVersion.peek() + 1);
    if (typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(bump);
      observer.observe(this, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["value", "disabled"],
      });
      scope.add(() => observer.disconnect());
    }

    // Value → which radio is checked, which one Tab lands on, and what the
    // form submits. Written as attributes so it holds for radios that have
    // not been upgraded yet.
    scope.bind(() => {
      this.#radiosVersion.get();
      const value = this.prop<string | null>("value").get() ?? "";
      const disabled = this.isDisabled.get();
      const radios = this.radios;
      let tabbable: FwRadio | null = null;
      for (const radio of radios) {
        const on = value !== "" && radio.getAttribute("value") === value;
        radio.toggleAttribute("checked", on);
        if (on && !radio.hasAttribute("disabled")) tabbable = radio;
      }
      tabbable ??= radios.find((r) => !r.hasAttribute("disabled")) ?? null;
      for (const radio of radios) {
        radio.tabIndex = !disabled && radio === tabbable ? 0 : -1;
      }
      this.#syncFormState(value);
    });

    scope.bind(() => {
      const disabled = this.isDisabled.get();
      this.#group.classList.toggle("disabled", disabled);
      if (disabled) this.#group.setAttribute("aria-disabled", "true");
      else this.#group.removeAttribute("aria-disabled");
      this.#group.setAttribute("aria-orientation", this.prop<string>("orientation").get());
    });

    scope.bind(() => {
      this.#slots.get();
      const label = this.prop<string | null>("label").get();
      this.#labelText.textContent = label ?? "";
      this.#label.hidden = !label && !slotHasContent(this.root, "label");
      const required = this.prop<boolean>("required").get();
      this.#required.hidden = !required;
      this.#group.setAttribute("aria-required", String(required));

      const help = this.prop<string | null>("help").get();
      this.#helpText.textContent = help ?? "";
      const hasHelp = Boolean(help) || slotHasContent(this.root, "help");
      this.#help.hidden = !hasHelp;

      const error = this.prop<string | null>("error").get();
      this.#error.textContent = error ?? "";
      this.#error.hidden = !error;
      this.#group.setAttribute("aria-invalid", String(Boolean(error)));
      this.toggleAttribute("invalid", Boolean(error));

      const describedBy = [hasHelp ? this.#help.id : null, error ? this.#error.id : null]
        .filter(Boolean)
        .join(" ");
      if (describedBy) this.#group.setAttribute("aria-describedby", describedBy);
      else this.#group.removeAttribute("aria-describedby");
      this.#syncFormState(this.prop<string | null>("value").peek() ?? "");
    });

    const radioOf = (event: Event): FwRadio | null => {
      const radio = (event.target as Element | null)?.closest?.("fw-radio") as FwRadio | null;
      return radio && this.contains(radio) ? radio : null;
    };

    const onKey = (event: KeyboardEvent) => {
      if (this.isDisabled.get()) return;
      const radio = radioOf(event);
      if (!radio) return;
      if (event.key === " ") {
        event.preventDefault();
        this.#choose(radio);
        return;
      }
      if (!event.key.startsWith("Arrow")) return;
      const collection = this.#collection!;
      collection.setActive(radio);
      if (!collection.handleKey(event)) return;
      event.preventDefault();
      const next = collection.active() as FwRadio | null;
      if (next) this.#choose(next);
    };

    const onClick = (event: MouseEvent) => {
      if (this.isDisabled.get()) return;
      const radio = radioOf(event);
      if (radio) this.#choose(radio);
    };

    const onLabelClick = () => this.focus();
    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);

    this.addEventListener("keydown", onKey);
    this.addEventListener("click", onClick);
    this.#label.addEventListener("click", onLabelClick);
    this.root.addEventListener("slotchange", onSlotChange);
    scope.add(() => {
      this.removeEventListener("keydown", onKey);
      this.removeEventListener("click", onClick);
      this.#label.removeEventListener("click", onLabelClick);
      this.root.removeEventListener("slotchange", onSlotChange);
    });
  }

  /** Select and focus a radio from a user action. */
  #choose(radio: FwRadio): void {
    if (radio.hasAttribute("disabled")) return;
    radio.focus();
    const value = radio.getAttribute("value") ?? "";
    if ((this.prop<string | null>("value").peek() ?? "") === value) return;
    this.value = value;
    this.emit("input");
    this.emit("change");
  }

  #syncFormState(value: string): void {
    this.setFormValue(value === "" ? null : value);
    const anchor = this.radios.find((r) => r.tabIndex === 0) ?? this.radios[0];
    const error = this.prop<string | null>("error").peek();
    if (error) {
      this.setValidity({ customError: true }, error, anchor);
    } else if (this.prop<boolean>("required").peek() && value === "") {
      this.setValidity({ valueMissing: true }, "Please select one of these options.", anchor);
    } else {
      this.setValidity({});
    }
  }

  protected resetValue(): void {
    this.value = this.#defaultValue;
  }

  protected override restoreValue(state: string): void {
    this.value = state;
  }

  /** Focus the checked radio, or the first enabled one. */
  override focus(options?: FocusOptions): void {
    const radios = this.radios;
    const target =
      radios.find((r) => r.tabIndex === 0) ?? radios.find((r) => !r.hasAttribute("disabled"));
    target?.focus(options);
  }
}
