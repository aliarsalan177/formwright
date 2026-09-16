import { computed, signal, type ReadSignal } from "@formwright/reactive";
import { FwElement, type PropMap } from "./element.js";

/**
 * A control that takes part in a native `<form>`.
 *
 * `<fw-select name="gender" required>` inside a `<form>` submits its value
 * under `gender`, blocks submission while empty, resets with the form, is
 * disabled by a disabled `<fieldset>`, and is found by
 * `form.elements.gender` — the same contract a native `<select>` has.
 * That is what makes these drop-in rather than "our own form system".
 *
 * Built on ElementInternals. Where a runtime lacks it (older browsers,
 * jsdom), the control still works as an input; it just does not submit
 * with a native form. Frameworks that read `.value` are unaffected.
 */
export abstract class FwFormElement extends FwElement {
  static formAssociated = true;

  static override props: PropMap = {
    name: { type: "string", reflect: true },
    disabled: { type: "boolean", reflect: true },
    required: { type: "boolean", reflect: true },
  };

  protected readonly internals: ElementInternals | null;
  readonly #fieldsetDisabled = signal(false);

  /** True when disabled by its own attribute or by an ancestor fieldset. */
  protected readonly isDisabled: ReadSignal<boolean> = computed(
    () => this.prop<boolean>("disabled").get() || this.#fieldsetDisabled.get(),
  );

  constructor() {
    super();
    this.internals = typeof this.attachInternals === "function" ? this.attachInternals() : null;
  }

  /** The form this control belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals?.form ?? null;
  }

  /** Labels pointing at this control via `<label for>`. */
  get labels(): NodeList | null {
    return this.internals?.labels ?? null;
  }

  get validity(): ValidityState | null {
    return this.internals?.validity ?? null;
  }

  get validationMessage(): string {
    return this.internals?.validationMessage ?? "";
  }

  checkValidity(): boolean {
    return this.internals?.checkValidity?.() ?? true;
  }

  reportValidity(): boolean {
    return this.internals?.reportValidity?.() ?? true;
  }

  /** What the form submits for this control. */
  protected setFormValue(value: string | FormData | null): void {
    this.internals?.setFormValue?.(value);
  }

  /**
   * Set validity. `anchor` is the element the browser points its
   * validation bubble at — the inner control, not the host box.
   */
  protected setValidity(flags: ValidityStateFlags, message = "", anchor?: HTMLElement): void {
    if (!this.internals?.setValidity) return;
    if (Object.values(flags).some(Boolean)) {
      this.internals.setValidity(flags, message || "Invalid value", anchor);
    } else {
      this.internals.setValidity({});
    }
  }

  formDisabledCallback(disabled: boolean): void {
    this.#fieldsetDisabled.set(disabled);
  }

  formResetCallback(): void {
    this.resetValue();
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === "string") this.restoreValue(state);
  }

  /** Put the control back to its initial value. */
  protected abstract resetValue(): void;

  /** Restore a value the browser saved, e.g. on back navigation. */
  protected restoreValue(_state: string): void {}
}
