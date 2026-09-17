import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { nextId, type PropMap } from "../core/element.js";
import { slotHasContent } from "../core/field.js";
import { FwFormElement } from "../core/form-element.js";

const styles = /* css */ `
:host {
  display: inline-block; vertical-align: middle;
  --_track-w: 2.25rem; --_track-h: 1.25rem; --_gap: 2px; --_line: 1.25rem;
  --_track-border: color-mix(in srgb, var(--_muted) 30%, var(--_border));
}
:host([size="sm"]) { --_track-w: 1.75rem; --_track-h: 1rem; --_line: 1.125rem; }
:host([size="lg"]) { --_track-w: 2.75rem; --_track-h: 1.5rem; --_line: 1.5rem; }

.base { display: inline-flex; flex-direction: column; gap: 0.125rem; }
.row {
  position: relative; display: inline-flex; align-items: center; gap: 0.625rem;
  font-size: var(--_text-size); line-height: var(--_line); cursor: pointer; user-select: none;
}
:host([label-position="start"]) .row { flex-direction: row-reverse; justify-content: flex-end; }
.native {
  position: absolute; inset-block-start: 50%; inset-inline-start: 0;
  width: var(--_track-w); height: var(--_track-h); margin: 0;
  transform: translateY(-50%); opacity: 0; cursor: inherit;
}
:host([label-position="start"]) .native { inset-inline-start: auto; inset-inline-end: 0; }
/* Off: an outlined track with a muted thumb, which reads in light and dark
   alike. On: filled with the accent and a contrasting thumb. */
.track {
  position: relative; display: inline-block; flex: none;
  width: var(--_track-w); height: var(--_track-h);
  border-radius: 999px; background: var(--_surface-2);
  box-shadow: inset 0 0 0 1px var(--_track-border);
  transition: background-color var(--_duration), box-shadow var(--_duration);
  pointer-events: none;
}
.thumb {
  position: absolute; inset-block-start: var(--_gap); inset-inline-start: var(--_gap);
  width: calc(var(--_track-h) - 2 * var(--_gap)); height: calc(var(--_track-h) - 2 * var(--_gap));
  border-radius: 50%; background: var(--_muted);
  transition: inset-inline-start var(--_duration), background-color var(--_duration), box-shadow var(--_duration);
}
.native:checked ~ .track { background: var(--_accent); box-shadow: inset 0 0 0 1px var(--_accent); }
.native:checked ~ .track .thumb {
  inset-inline-start: calc(var(--_track-w) - var(--_track-h) + var(--_gap));
  background: var(--_accent-contrast);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--_backdrop) 50%, transparent);
}
.row:hover .native:not(:disabled):not(:checked) ~ .track {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--_text) 30%, var(--_track-border));
}
.row:hover .native:not(:disabled):not(:checked) ~ .track .thumb { background: color-mix(in srgb, var(--_text) 30%, var(--_muted)); }
.row:hover .native:not(:disabled):checked ~ .track { background: var(--_accent-hover); box-shadow: inset 0 0 0 1px var(--_accent-hover); }
.native:focus-visible ~ .track { box-shadow: inset 0 0 0 1px var(--_track-border), var(--_ring); }
.native:focus-visible:checked ~ .track { box-shadow: inset 0 0 0 1px var(--_accent), var(--_ring); }
.label { color: var(--_text); }
.base.disabled .row { cursor: not-allowed; opacity: 0.55; }

.help {
  font-size: 0.8125rem; line-height: 1.125rem; color: var(--_muted);
  padding-inline-start: calc(var(--_track-w) + 0.625rem);
}
:host([label-position="start"]) .help { padding-inline-start: 0; }
`;

/**
 * `<fw-switch>` — an on/off setting that takes effect immediately.
 *
 * ```html
 * <fw-switch name="notifications" checked>Notifications</fw-switch>
 * <fw-switch label-position="start" size="sm">Dark mode</fw-switch>
 * <fw-switch name="terms" value="yes" required help="Needed to continue">Accept</fw-switch>
 * ```
 *
 * A real `<input type="checkbox" role="switch">` sits under the track, so
 * screen readers announce "switch, on/off", Space toggles it, and it takes
 * part in forms natively. Clicking the label toggles it too. Submits `value`
 * (default "on") only while on.
 *
 * Events: `input` and `change` when the user toggles.
 * Slots: default (label), `help`.
 * Parts: `base`, `input`, `control`, `thumb`, `label`, `help`.
 */
export class FwSwitch extends FwFormElement {
  static override props: PropMap = {
    ...FwFormElement.props,
    checked: { type: "boolean", reflect: true },
    value: { type: "string", default: "on" },
    size: { type: "string", reflect: true, default: "md" },
    help: { type: "string" },
    labelPosition: { type: "string", reflect: true, default: "end" },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open", delegatesFocus: true };

  declare checked: boolean;
  declare value: string;
  declare size: "sm" | "md" | "lg";
  declare help: string | null;
  declare labelPosition: "start" | "end";
  declare disabled: boolean;
  declare required: boolean;
  declare name: string | null;

  #base!: HTMLElement;
  #input!: HTMLInputElement;
  #label!: HTMLElement;
  #help!: HTMLElement;
  #helpText!: HTMLSpanElement;
  #defaultChecked = false;
  readonly #slots = signal(0);

  protected render(root: ShadowRoot): void {
    const id = nextId("fw-switch");

    this.#base = document.createElement("div");
    this.#base.className = "base";
    this.#base.setAttribute("part", "base");

    const row = document.createElement("label");
    row.className = "row";

    this.#input = document.createElement("input");
    this.#input.type = "checkbox";
    this.#input.id = id;
    this.#input.className = "native";
    this.#input.setAttribute("role", "switch");
    this.#input.setAttribute("part", "input");

    const track = document.createElement("span");
    track.className = "track";
    track.setAttribute("part", "control");
    track.setAttribute("aria-hidden", "true");
    const thumb = document.createElement("span");
    thumb.className = "thumb";
    thumb.setAttribute("part", "thumb");
    track.append(thumb);

    this.#label = document.createElement("span");
    this.#label.className = "label";
    this.#label.setAttribute("part", "label");
    this.#label.append(document.createElement("slot"));

    row.append(this.#input, track, this.#label);

    this.#help = document.createElement("div");
    this.#help.className = "help";
    this.#help.setAttribute("part", "help");
    this.#help.id = `${id}-help`;
    const helpSlot = document.createElement("slot");
    helpSlot.name = "help";
    this.#helpText = document.createElement("span");
    helpSlot.append(this.#helpText);
    this.#help.append(helpSlot);

    this.#base.append(row, this.#help);
    root.append(this.#base);

    this.#defaultChecked = this.hasAttribute("checked");
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
      const checked = this.prop<boolean>("checked").get();
      input.checked = checked;
      // Explicit, since not every screen reader maps a checkbox's
      // checkedness onto role="switch".
      input.setAttribute("aria-checked", String(checked));
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
      if (hasHelp) input.setAttribute("aria-describedby", this.#help.id);
      else input.removeAttribute("aria-describedby");
    });

    const onInput = (event: Event) => {
      this.checked = input.checked;
      // Browsers compose a native `input`, so it already reaches the host.
      if (!event.composed) this.emit("input");
    };
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
    if (this.prop<boolean>("required").peek() && !checked) {
      this.setValidity(
        { valueMissing: true },
        this.#input.validationMessage || "Please turn this on to proceed.",
        this.#input,
      );
    } else {
      this.setValidity({});
    }
  }

  protected resetValue(): void {
    this.checked = this.#defaultChecked;
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
