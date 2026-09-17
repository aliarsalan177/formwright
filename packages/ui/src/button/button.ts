import type { Scope } from "@formwright/ui-core";
import type { PropMap } from "../core/element.js";
import { FwFormElement } from "../core/form-element.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const styles = /* css */ `
:host { display: inline-block; vertical-align: middle; }
:host([block]) { display: block; }

.base {
  --_bg: var(--_accent); --_fg: var(--_accent-contrast); --_bd: transparent;
  --_bg-hover: var(--_accent-hover);
  --_bg-active: color-mix(in srgb, var(--_accent) 76%, var(--_text));
  --_focus: var(--_ring);
  position: relative; box-sizing: border-box;
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  width: 100%; height: var(--_height); padding: 0 1rem; margin: 0;
  font: inherit; font-size: var(--_text-size); font-weight: 500; line-height: 1;
  white-space: nowrap; text-decoration: none; cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent;
  border: 1px solid var(--_bd); border-radius: var(--_radius);
  background: var(--_bg); color: var(--_fg);
  transition: background-color var(--_duration), border-color var(--_duration), color var(--_duration), box-shadow var(--_duration);
}
:host([size="sm"]) .base { padding: 0 0.75rem; gap: 0.375rem; }
:host([size="lg"]) .base { padding: 0 1.25rem; }
.base:hover { background: var(--_bg-hover); }
.base:active { background: var(--_bg-active); }
.base:focus-visible { outline: none; box-shadow: var(--_focus); }

:host([variant="secondary"]) .base {
  --_bg: var(--_surface); --_fg: var(--_text); --_bd: var(--_border);
  --_bg-hover: var(--_surface-2);
  --_bg-active: color-mix(in srgb, var(--_text) 10%, var(--_surface));
}
:host([variant="secondary"]) .base:hover { border-color: color-mix(in srgb, var(--_text) 22%, var(--_border)); }
:host([variant="ghost"]) .base {
  --_bg: transparent; --_fg: var(--_text);
  --_bg-hover: var(--_surface-2);
  --_bg-active: color-mix(in srgb, var(--_text) 10%, var(--_surface));
}
:host([variant="danger"]) .base {
  --_bg: var(--_danger); --_fg: var(--_danger-contrast);
  --_bg-hover: color-mix(in srgb, var(--_danger) 86%, var(--_text));
  --_bg-active: color-mix(in srgb, var(--_danger) 76%, var(--_text));
  --_focus: 0 0 0 3px color-mix(in srgb, var(--_danger) 30%, transparent);
}

.base[aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
/* Loading keeps full colour, so the spinner does not read as disabled. */
:host([loading]:not([disabled])) .base[aria-disabled="true"] { opacity: 0.8; }

.spinner {
  flex: none; width: 1em; height: 1em; border-radius: 50%;
  border: 2px solid currentColor; border-inline-end-color: transparent;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

::slotted([slot="prefix"]), ::slotted([slot="suffix"]) {
  display: inline-flex; align-items: center; flex: none;
}
`;

/**
 * `<fw-button>` — a button, a link that looks like one, or a form's
 * submit button.
 *
 * ```html
 * <fw-button>Save</fw-button>
 * <fw-button variant="secondary" size="sm">Cancel</fw-button>
 * <fw-button variant="danger" loading>Deleting…</fw-button>
 * <fw-button href="/members">Members</fw-button>
 * <form><fw-button type="submit">Register</fw-button></form>
 * <fw-button><svg slot="prefix" …></svg>New member</fw-button>
 * ```
 *
 * Variants are an attribute, not separate components. `loading` disables
 * it and shows a spinner, so a double click cannot submit twice. Set
 * `href` and it renders a real `<a>`, keeping open-in-new-tab, middle click
 * and the status-bar URL.
 *
 * Parts: `base`, `label`, `spinner`.
 */
export class FwButton extends FwFormElement {
  static override props: PropMap = {
    ...FwFormElement.props,
    variant: { type: "string", reflect: true, default: "primary" },
    size: { type: "string", reflect: true, default: "md" },
    type: { type: "string", default: "button" },
    loading: { type: "boolean", reflect: true },
    block: { type: "boolean", reflect: true },
    href: { type: "string" },
    target: { type: "string" },
    rel: { type: "string" },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open", delegatesFocus: true };

  declare variant: ButtonVariant;
  declare size: ButtonSize;
  declare type: "button" | "submit" | "reset";
  declare loading: boolean;
  declare block: boolean;
  declare href: string | null;
  declare target: string | null;
  declare rel: string | null;
  declare disabled: boolean;

  #base!: HTMLButtonElement | HTMLAnchorElement;
  #spinner!: HTMLElement;

  protected render(root: ShadowRoot): void {
    const button = document.createElement("button");
    button.className = "base";
    button.setAttribute("part", "base");
    button.type = "button";

    this.#spinner = document.createElement("span");
    this.#spinner.className = "spinner";
    this.#spinner.setAttribute("part", "spinner");
    this.#spinner.setAttribute("aria-hidden", "true");
    this.#spinner.hidden = true;

    const prefix = document.createElement("slot");
    prefix.name = "prefix";
    const label = document.createElement("span");
    label.className = "label";
    label.setAttribute("part", "label");
    label.append(document.createElement("slot"));
    const suffix = document.createElement("slot");
    suffix.name = "suffix";

    button.append(this.#spinner, prefix, label, suffix);
    root.append(button);
    this.#base = button;
  }

  protected override connected(scope: Scope): void {
    // One binding rather than one per concern: swapping the tag and then
    // styling it must happen in that order, and separate effects give no
    // such guarantee.
    scope.bind(() => {
      const href = this.prop<string | null>("href").get();
      const target = this.prop<string | null>("target").get();
      const rel = this.prop<string | null>("rel").get();
      const loading = this.prop<boolean>("loading").get();
      const disabled = this.isDisabled.get();

      // A link when there is an href, a button otherwise — swapped in
      // place, carrying the slots across, so the tag matches what it does.
      const wantLink = Boolean(href);
      if (wantLink !== this.#base instanceof HTMLAnchorElement) {
        const next = document.createElement(wantLink ? "a" : "button");
        next.className = "base";
        next.setAttribute("part", "base");
        if (next instanceof HTMLButtonElement) next.type = "button";
        next.append(...this.#base.childNodes);
        this.#base.replaceWith(next);
        this.#base = next;
      }

      const base = this.#base;
      const inactive = disabled || loading;
      if (base instanceof HTMLAnchorElement) {
        if (href) base.href = href;
        if (target) base.target = target;
        else base.removeAttribute("target");
        // A tab opened from a gym's admin must not be able to navigate the
        // admin page back through window.opener.
        const safeRel = rel ?? (target === "_blank" ? "noopener noreferrer" : null);
        if (safeRel) base.rel = safeRel;
        else base.removeAttribute("rel");
        base.tabIndex = inactive ? -1 : 0;
      } else {
        base.disabled = disabled;
      }
      // aria-disabled rather than disabled while loading, so focus stays on
      // the button through the wait instead of dropping to <body>.
      base.setAttribute("aria-disabled", String(inactive));
      if (loading) base.setAttribute("aria-busy", "true");
      else base.removeAttribute("aria-busy");
      this.#spinner.hidden = !loading;
    });

    const onClick = (event: MouseEvent) => {
      if (this.isDisabled.get() || this.prop<boolean>("loading").get()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      // The inner <button> lives in the shadow root and cannot submit the
      // light-DOM form it visually sits in. The host is form-associated, so
      // it can.
      const form = this.form;
      if (!form) return;
      const type = this.prop<string>("type").get();
      if (type === "submit") form.requestSubmit();
      else if (type === "reset") form.reset();
    };
    this.addEventListener("click", onClick);
    scope.add(() => this.removeEventListener("click", onClick));
  }

  protected resetValue(): void {}

  /** Move focus to the button. */
  override focus(options?: FocusOptions): void {
    this.#base?.focus(options);
  }

  override click(): void {
    this.#base?.click();
  }
}
