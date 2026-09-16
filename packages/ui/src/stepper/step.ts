import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";
import { srOnly } from "../core/styles.js";

export type StepStatus = "auto" | "complete" | "error";
export type StepState = "complete" | "current" | "upcoming" | "error";

const styles =
  srOnly +
  /* css */ `
:host {
  --_indicator: 2rem;
  display: flex; flex: 1; min-width: 0; position: relative;
}
:host(:last-of-type) { flex: none; }
:host([orientation="vertical"]) { flex: none; flex-direction: column; }

.base { display: flex; align-items: flex-start; gap: 0.5rem; flex: 1; min-width: 0; }
:host([orientation="vertical"]) .base { flex-direction: column; gap: 0; }

.trigger {
  display: flex; align-items: flex-start; gap: 0.625rem; flex: none; max-width: 100%;
  margin: 0; padding: 0.25rem; font: inherit; text-align: start; color: inherit;
  background: transparent; border: 0; border-radius: var(--_radius);
}
button.trigger { cursor: pointer; }
button.trigger:hover .label { color: var(--_accent); }
button.trigger:focus-visible { outline: none; box-shadow: var(--_ring); }
:host([disabled]) .trigger { opacity: 0.55; }

.indicator {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: var(--_indicator); height: var(--_indicator); border-radius: 50%;
  font-size: 0.8125rem; font-weight: 600; font-variant-numeric: tabular-nums;
  color: var(--_muted); background: var(--_surface); border: 2px solid var(--_border);
  transition: background-color var(--_duration), border-color var(--_duration), color var(--_duration);
}
:host([state="current"]) .indicator { color: var(--_accent); border-color: var(--_accent); }
:host([state="complete"]) .indicator { color: var(--_accent-contrast); background: var(--_accent); border-color: var(--_accent); }
:host([state="error"]) .indicator { color: #fff; background: var(--_danger); border-color: var(--_danger); }
.check, .error-icon { display: none; }
:host([state="complete"]) .check, :host([state="error"]) .error-icon { display: block; }
:host([state="complete"]) .number, :host([state="error"]) .number { display: none; }

.text { display: flex; flex-direction: column; gap: 0.125rem; min-width: 0; padding-block: 0.3125rem; }
.label { font-size: var(--_text-size); font-weight: 500; line-height: 1.25; color: var(--_text); }
:host([state="upcoming"]) .label { color: var(--_muted); }
:host([state="error"]) .label { color: var(--_danger); }
.description { font-size: 0.8125rem; line-height: 1.25; color: var(--_muted); }

.connector {
  flex: 1; align-self: flex-start; min-width: 1rem; height: 2px;
  margin-block-start: calc(0.25rem + var(--_indicator) / 2 - 1px); margin-inline-end: 0.5rem;
  background: var(--_border); border-radius: 1px;
  transition: background-color var(--_duration);
}
:host([state="complete"]) .connector { background: var(--_accent); }
:host(:last-of-type) .connector { display: none; }
:host([orientation="vertical"]) .connector {
  flex: none; width: 2px; height: auto; min-width: 0; min-height: 1.5rem;
  margin-block: 0.25rem; margin-inline: calc(0.25rem + var(--_indicator) / 2 - 1px) 0;
}
`;

const CHECK = `<svg class="check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
const ERROR = `<svg class="error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 7v6M12 17h.01"/></svg>`;

const STATE_TEXT: Record<StepState, string> = {
  complete: "Completed",
  current: "Current",
  upcoming: "Not started",
  error: "Error",
};

/**
 * `<fw-step>` — one step of an `<fw-stepper>`.
 *
 * ```html
 * <fw-step label="Details" description="Name and contact"></fw-step>
 * <fw-step status="error"><span slot="label">Payment</span></fw-step>
 * <fw-step label="Confirm" disabled></fw-step>
 * ```
 *
 * `status="auto"` (the default) lets the stepper decide from position:
 * steps before the current one are complete, after it upcoming. Set
 * `complete` or `error` to override. Shows the step number, a check once
 * complete, or an error mark; the state is also spoken as text, since the
 * icons are decorative.
 *
 * `index`, `state`, `current`, `interactive` and `orientation` are set by
 * `<fw-stepper>`. An interactive step renders as a `<button>`; otherwise
 * as plain content.
 *
 * Slots: `label`, `description`.
 * Parts: `base`, `trigger`, `indicator`, `number`, `label`, `description`, `connector`.
 */
export class FwStep extends FwElement {
  static override props: PropMap = {
    label: { type: "string" },
    description: { type: "string" },
    status: { type: "string", reflect: true, default: "auto" },
    disabled: { type: "boolean", reflect: true },
    /** Set by `<fw-stepper>`. */
    index: { type: "number", default: 0 },
    /** Set by `<fw-stepper>`. */
    state: { type: "string", reflect: true, default: "upcoming" },
    /** Set by `<fw-stepper>`. */
    current: { type: "boolean", reflect: true },
    /** Set by `<fw-stepper>`. */
    interactive: { type: "boolean", reflect: true },
    /** Set by `<fw-stepper>`. */
    orientation: { type: "string", reflect: true, default: "horizontal" },
  };
  static override styles = styles;

  declare label: string | null;
  declare description: string | null;
  declare status: StepStatus;
  declare disabled: boolean;
  declare index: number;
  declare state: StepState;
  declare current: boolean;
  declare interactive: boolean;
  declare orientation: "horizontal" | "vertical";

  #trigger!: HTMLButtonElement | HTMLDivElement;
  #number!: HTMLSpanElement;
  #labelText!: HTMLSpanElement;
  #descriptionText!: HTMLSpanElement;
  #descriptionSlot!: HTMLSlotElement;
  #description!: HTMLSpanElement;
  #stateText!: HTMLSpanElement;

  protected render(root: ShadowRoot): void {
    const base = document.createElement("div");
    base.className = "base";
    base.setAttribute("part", "base");

    const trigger = document.createElement("div");
    trigger.className = "trigger";
    trigger.setAttribute("part", "trigger");

    const indicator = document.createElement("span");
    indicator.className = "indicator";
    indicator.setAttribute("part", "indicator");
    indicator.setAttribute("aria-hidden", "true");
    this.#number = document.createElement("span");
    this.#number.className = "number";
    this.#number.setAttribute("part", "number");
    indicator.append(this.#number);
    indicator.insertAdjacentHTML("beforeend", CHECK + ERROR);

    const text = document.createElement("span");
    text.className = "text";
    const label = document.createElement("span");
    label.className = "label";
    label.setAttribute("part", "label");
    const labelSlot = document.createElement("slot");
    labelSlot.name = "label";
    this.#labelText = document.createElement("span");
    labelSlot.append(this.#labelText);
    label.append(labelSlot);

    this.#stateText = document.createElement("span");
    this.#stateText.className = "sr-only";

    this.#description = document.createElement("span");
    this.#description.className = "description";
    this.#description.setAttribute("part", "description");
    this.#descriptionSlot = document.createElement("slot");
    this.#descriptionSlot.name = "description";
    this.#descriptionText = document.createElement("span");
    this.#descriptionSlot.append(this.#descriptionText);
    this.#description.append(this.#descriptionSlot);

    text.append(label, this.#stateText, this.#description);
    trigger.append(indicator, text);
    this.#trigger = trigger;

    const connector = document.createElement("span");
    connector.className = "connector";
    connector.setAttribute("part", "connector");
    connector.setAttribute("aria-hidden", "true");

    base.append(trigger, connector);
    root.append(base);
  }

  protected override connected(scope: Scope): void {
    this.setAttribute("role", "listitem");

    // A button when it can be clicked, plain content when it cannot —
    // swapped in place, carrying the content across.
    scope.bind(() => {
      const interactive = this.prop<boolean>("interactive").get();
      if (interactive !== this.#trigger instanceof HTMLButtonElement) {
        const next = document.createElement(interactive ? "button" : "div");
        if (next instanceof HTMLButtonElement) next.type = "button";
        next.className = "trigger";
        next.setAttribute("part", "trigger");
        next.append(...this.#trigger.childNodes);
        this.#trigger.replaceWith(next);
        this.#trigger = next;
      }
    });

    scope.bind(() => {
      const state = this.prop<StepState>("state").get();
      // Re-run after the trigger is swapped, so the new one is marked too.
      this.prop<boolean>("interactive").get();
      const trigger = this.#trigger;
      if (this.prop<boolean>("current").get()) {
        trigger.setAttribute("aria-current", "step");
      } else {
        trigger.removeAttribute("aria-current");
      }
      this.#stateText.textContent = `, ${STATE_TEXT[state] ?? STATE_TEXT.upcoming}`;
    });

    scope.bind(() => {
      this.#number.textContent = String((this.prop<number>("index").get() ?? 0) + 1);
    });

    scope.bind(() => {
      this.#labelText.textContent = this.prop<string | null>("label").get() ?? "";
    });

    const syncDescription = () => {
      const text = this.prop<string | null>("description").get() ?? "";
      this.#descriptionText.textContent = text;
      const slotted = this.#descriptionSlot
        .assignedNodes()
        .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? "").trim() !== "");
      this.#description.hidden = !text && !slotted;
    };
    scope.bind(syncDescription);
    this.#descriptionSlot.addEventListener("slotchange", syncDescription);
    scope.add(() => this.#descriptionSlot.removeEventListener("slotchange", syncDescription));
  }

  /** Move focus to the step, when it can be clicked. */
  override focus(options?: FocusOptions): void {
    this.#trigger?.focus(options);
  }
}
