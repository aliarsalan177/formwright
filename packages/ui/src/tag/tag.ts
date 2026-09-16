import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";

export type TagTone = "neutral" | "accent" | "success" | "warning" | "danger";
export type TagSize = "sm" | "md";

const styles = /* css */ `
:host {
  --_tone: var(--_muted);
  --_tone-text: var(--_text);
  display: inline-flex; vertical-align: middle; max-width: 100%;
}
:host([tone="accent"]) { --_tone: var(--_accent); --_tone-text: var(--_accent); }
:host([tone="success"]) { --_tone: var(--_success); --_tone-text: var(--_success); }
:host([tone="warning"]) { --_tone: var(--_warning); --_tone-text: var(--_warning); }
:host([tone="danger"]) { --_tone: var(--_danger); --_tone-text: var(--_danger); }

.base {
  display: inline-flex; align-items: center; gap: 0.375rem; max-width: 100%;
  min-height: 1.75rem; padding-inline: 0.625rem;
  font-size: 0.8125rem; font-weight: 500; line-height: 1.2;
  border: 1px solid color-mix(in srgb, var(--_tone) 30%, transparent);
  border-radius: var(--_radius-sm);
  background: color-mix(in srgb, var(--_tone) 12%, transparent);
  color: color-mix(in srgb, var(--_tone-text) 85%, var(--_text));
}
:host([removable]) .base { padding-inline-end: 0.25rem; }
:host([size="sm"]) .base { min-height: 1.375rem; padding-inline: 0.5rem; gap: 0.25rem; font-size: 0.75rem; }
:host([size="sm"][removable]) .base { padding-inline-end: 0.125rem; }
:host([disabled]) .base { opacity: 0.55; cursor: not-allowed; }

.label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.remove {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 1.25rem; height: 1.25rem; padding: 0;
  border: 0; border-radius: var(--_radius-sm); background: transparent;
  color: inherit; opacity: 0.7; cursor: pointer; font: inherit;
  transition: background-color var(--_duration), opacity var(--_duration);
}
:host([size="sm"]) .remove { width: 1rem; height: 1rem; }
.remove:hover { opacity: 1; background: color-mix(in srgb, var(--_tone) 20%, transparent); }
.remove:focus-visible { outline: none; opacity: 1; box-shadow: var(--_ring); }
.remove:disabled { cursor: not-allowed; pointer-events: none; }

::slotted([slot="prefix"]) { display: inline-flex; flex: none; }
`;

const ICON_REMOVE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

/**
 * `<fw-tag>` — a label the user can act on: a selected filter, a chosen
 * member, a keyword.
 *
 * ```html
 * <fw-tag>Evening batch</fw-tag>
 * <fw-tag tone="accent" removable>Cardio</fw-tag>
 * <fw-tag size="sm" removable disabled>Locked</fw-tag>
 * <fw-tag><svg slot="prefix" …></svg>Trainer</fw-tag>
 * ```
 *
 * `removable` adds a real button named "Remove <text>". Clicking it fires
 * a cancelable `fw-remove`; unless a listener calls `preventDefault()`, the
 * tag hides itself. Apps that own the list — re-rendering from state —
 * should prevent it and remove the item from their data instead.
 *
 * Events: `fw-remove` (cancelable).
 * Slots: default (text), `prefix`.
 * Parts: `base`, `label`, `remove`.
 */
export class FwTag extends FwElement {
  static override props: PropMap = {
    tone: { type: "string", reflect: true, default: "neutral" },
    size: { type: "string", reflect: true, default: "md" },
    removable: { type: "boolean", reflect: true },
    disabled: { type: "boolean", reflect: true },
  };
  static override styles = styles;

  declare tone: TagTone;
  declare size: TagSize;
  declare removable: boolean;
  declare disabled: boolean;

  #remove!: HTMLButtonElement;
  readonly #text = signal("");

  protected render(root: ShadowRoot): void {
    const base = document.createElement("span");
    base.className = "base";
    base.setAttribute("part", "base");

    const prefix = document.createElement("slot");
    prefix.name = "prefix";

    const label = document.createElement("span");
    label.className = "label";
    label.setAttribute("part", "label");
    label.append(document.createElement("slot"));

    this.#remove = document.createElement("button");
    this.#remove.type = "button";
    this.#remove.className = "remove";
    this.#remove.setAttribute("part", "remove");
    this.#remove.innerHTML = ICON_REMOVE;
    this.#remove.hidden = true;

    base.append(prefix, label, this.#remove);
    root.append(base);
  }

  protected override connected(scope: Scope): void {
    const button = this.#remove;

    scope.bind(() => {
      button.hidden = !this.prop<boolean>("removable").get();
      button.disabled = this.prop<boolean>("disabled").get();
      if (this.prop<boolean>("disabled").get()) this.setAttribute("aria-disabled", "true");
      else this.removeAttribute("aria-disabled");
    });

    scope.bind(() => {
      const text = this.#text.get();
      button.setAttribute("aria-label", text ? `Remove ${text}` : "Remove");
    });

    // The button's name follows the tag's text, which can change without a
    // slotchange (editing a text node in place), so watch the light DOM.
    const readText = () => this.#text.set(this.#labelText());
    readText();
    if (typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(readText);
      observer.observe(this, { childList: true, characterData: true, subtree: true });
      scope.add(() => observer.disconnect());
    }

    const onRemove = () => {
      if (this.prop<boolean>("disabled").peek()) return;
      if (this.emit("fw-remove", undefined, { cancelable: true })) this.hidden = true;
    };
    button.addEventListener("click", onRemove);
    scope.add(() => button.removeEventListener("click", onRemove));
  }

  /** The tag's text, without the prefix icon. */
  #labelText(): string {
    let text = "";
    for (const node of Array.from(this.childNodes)) {
      if (node instanceof Element && node.getAttribute("slot")) continue;
      text += node.textContent ?? "";
    }
    return text.replace(/\s+/g, " ").trim();
  }
}
