import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";
import type { FwStep } from "./step.js";

const styles = /* css */ `
:host { display: block; }
.list {
  display: flex; align-items: flex-start; gap: 0.5rem;
  margin: 0; padding: 0; list-style: none;
}
:host([orientation="vertical"]) .list { flex-direction: column; gap: 0.25rem; }
`;

/**
 * `<fw-stepper>` — progress through a sequence of steps, such as a
 * multi-page registration form.
 *
 * ```html
 * <fw-stepper value="1" label="Registration">
 *   <fw-step label="Details" description="Name and contact"></fw-step>
 *   <fw-step label="Plan"></fw-step>
 *   <fw-step label="Payment"></fw-step>
 *   <fw-step label="Confirm"></fw-step>
 * </fw-stepper>
 *
 * <fw-stepper value="2" orientation="vertical" linear="false">…</fw-stepper>
 * ```
 *
 * Renders an ordered list of numbered steps joined by connectors. Steps
 * before `value` (0-based) are complete and show a check; the step at
 * `value` is marked `aria-current="step"`; a step with `status="error"`
 * shows an error mark. The state of each step is also given as text for
 * screen readers.
 *
 * `linear` (default true) lets the user go back to completed steps and
 * stay on the current one, but not jump ahead; set `linear="false"` to make
 * every step clickable. Clickable steps are real buttons; the rest are
 * plain content and are not in the Tab order. Disabled steps are never
 * clickable.
 *
 * Events: `change` when the user picks a step (after `value` updates).
 * Slots: default (the `<fw-step>`s).
 * Parts: `list`.
 */
export class FwStepper extends FwElement {
  static override props: PropMap = {
    value: { type: "number", reflect: true, default: 0 },
    orientation: { type: "string", reflect: true, default: "horizontal" },
    // JSON so that `linear="false"` means false; a boolean attribute
    // could only ever be switched off by removing it, and it is on by
    // default.
    linear: { type: "json", default: true },
    label: { type: "string" },
  };
  static override styles = styles;

  declare value: number;
  declare orientation: "horizontal" | "vertical";
  declare linear: boolean;
  declare label: string | null;

  #list!: HTMLOListElement;
  /** Bumped when steps are added, removed, or change status or disabled. */
  readonly #version = signal(0);

  /** The steps, in document order. */
  get steps(): FwStep[] {
    return [...this.querySelectorAll<FwStep>(":scope > fw-step")];
  }

  protected render(root: ShadowRoot): void {
    this.#list = document.createElement("ol");
    this.#list.className = "list";
    this.#list.setAttribute("part", "list");
    this.#list.append(document.createElement("slot"));
    root.append(this.#list);
  }

  protected override connected(scope: Scope): void {
    const bump = () => this.#version.set(this.#version.peek() + 1);
    if (typeof MutationObserver !== "undefined") {
      // Only what the author controls: the attributes this element writes
      // onto steps are deliberately not observed, so syncing cannot loop.
      const observer = new MutationObserver(bump);
      observer.observe(this, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["status", "disabled"],
      });
      scope.add(() => observer.disconnect());
    }

    scope.bind(() => {
      const label = this.prop<string | null>("label").get();
      if (label) this.#list.setAttribute("aria-label", label);
      else this.#list.removeAttribute("aria-label");
    });

    scope.bind(() => {
      this.#version.get();
      const value = this.#current();
      const orientation =
        this.prop<string>("orientation").get() === "vertical" ? "vertical" : "horizontal";
      const linear = this.#linear();

      this.steps.forEach((step, i) => {
        const status = step.getAttribute("status");
        const disabled = step.hasAttribute("disabled");
        const state =
          status === "error"
            ? "error"
            : status === "complete" || i < value
              ? "complete"
              : i === value
                ? "current"
                : "upcoming";
        const interactive = !disabled && (!linear || i <= value || status === "complete");
        // Attributes rather than properties, so they land whether or not the
        // step has upgraded yet.
        step.setAttribute("index", String(i));
        step.setAttribute("state", state);
        step.setAttribute("orientation", orientation);
        step.toggleAttribute("current", i === value);
        step.toggleAttribute("interactive", interactive);
      });
    });

    const onClick = (event: MouseEvent) => {
      const onTrigger = event
        .composedPath()
        .some(
          (node) => node instanceof HTMLButtonElement && node.getAttribute("part") === "trigger",
        );
      if (!onTrigger) return;
      const step = (event.target as Element | null)?.closest?.("fw-step") as FwStep | null;
      if (!step || step.parentElement !== this || !step.hasAttribute("interactive")) return;
      const index = this.steps.indexOf(step);
      if (index === -1 || index === this.#current(false)) return;
      this.value = index;
      this.emit("change");
    };
    this.addEventListener("click", onClick);
    scope.add(() => this.removeEventListener("click", onClick));
  }

  #current(track = true): number {
    const signal = this.prop<number | null>("value");
    const raw = track ? signal.get() : signal.peek();
    return typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : 0;
  }

  #linear(): boolean {
    const raw = this.prop<unknown>("linear").get();
    return raw !== false && raw !== "false";
  }
}
