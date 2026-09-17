import type { Scope } from "@formwright/ui-core";
import { FwElement, nextId, type PropMap } from "../core/element.js";

const styles = /* css */ `
:host {
  display: block; border-block-end: 1px solid var(--_border);
  /* Opening decelerates into place; closing accelerates away and is a
     little quicker, which is what reads as smooth rather than laggy. */
  --_open-duration: var(--fw-disclosure-duration, 280ms);
  --_close-duration: calc(var(--_open-duration) * 0.8);
  --_open-ease: cubic-bezier(0.2, 0, 0, 1);
  --_close-ease: cubic-bezier(0.4, 0, 1, 1);
}

.header {
  display: flex; align-items: center; gap: 0.75rem; width: 100%;
  padding: 0.875rem 0.25rem; margin: 0;
  font: inherit; font-size: var(--_text-size); font-weight: 500; text-align: start;
  color: var(--_text); background: transparent; border: 0; border-radius: var(--_radius-sm);
  cursor: pointer;
  transition: background-color var(--_duration), box-shadow var(--_duration);
}
.header:hover { background: var(--_surface-2); }
.header:focus-visible { outline: none; box-shadow: var(--_ring); }
.header:disabled { cursor: not-allowed; opacity: 0.55; }
.heading { margin: 0; }
.label { flex: 1; min-width: 0; }
.icon {
  display: inline-flex; flex: none; color: var(--_muted);
  transition: transform var(--_close-duration) var(--_close-ease);
}
:host([open]) .icon { transition: transform var(--_open-duration) var(--_open-ease); }
:host([open]) .icon { transform: rotate(180deg); }

/* Height animates by moving a one-row grid between 0fr and 1fr, so the
   content's natural height never has to be measured. Visibility follows
   at the end of a close, taking the content out of the accessibility
   tree and the Tab order once it can no longer be seen. */
.region {
  display: grid; grid-template-rows: 0fr; visibility: hidden;
  transition:
    grid-template-rows var(--_close-duration) var(--_close-ease),
    visibility 0s linear var(--_close-duration);
}
:host([open]) .region {
  grid-template-rows: 1fr; visibility: visible;
  transition: grid-template-rows var(--_open-duration) var(--_open-ease), visibility 0s;
}
.clip { min-height: 0; overflow: hidden; }
/* The content fades and settles as the height opens, instead of being
   uncovered at full strength, and fades out quickly as it closes. */
.content {
  padding: 0 0.25rem 1rem; font-size: var(--_text-size);
  opacity: 0; transform: translateY(-0.375rem);
  transition:
    opacity calc(var(--_close-duration) * 0.6) var(--_close-ease),
    transform var(--_close-duration) var(--_close-ease);
}
:host([open]) .content {
  opacity: 1; transform: none;
  transition:
    opacity var(--_open-duration) var(--_open-ease) calc(var(--_open-duration) * 0.15),
    transform var(--_open-duration) var(--_open-ease);
}
@media (prefers-reduced-motion: reduce) {
  .region, :host([open]) .region, .icon, :host([open]) .icon, .content, :host([open]) .content {
    transition: none;
  }
}
`;

const CHEVRON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;

/**
 * `<fw-accordion-item>` — one section of an `<fw-accordion>`: a header
 * button that shows and hides the content below it.
 *
 * ```html
 * <fw-accordion-item heading="Membership" open>
 *   Monthly, quarterly and yearly plans.
 * </fw-accordion-item>
 * <fw-accordion-item>
 *   <span slot="heading">Opening <b>hours</b></span>
 *   Six to eleven, every day.
 * </fw-accordion-item>
 * ```
 *
 * The header is a real `<button>` with `aria-expanded` and
 * `aria-controls`, inside an element with `role="heading"`; the content
 * is a `role="region"` labelled by the button. Both live in this item's
 * own shadow root, so the ids that connect them never cross a boundary.
 * The content's height animates open and closed while it fades in and
 * settles, and does not under `prefers-reduced-motion`. Set the timing
 * with `--fw-disclosure-duration` (default 280ms; closing is 80% of it).
 * Works on its own, too, outside an accordion.
 *
 * `heading-level` is normally set for you by `<fw-accordion>`.
 *
 * Events: `fw-show` when it opens, `fw-hide` when it closes.
 * Slots: default (content), `heading`.
 * Parts: `heading`, `header`, `label`, `icon`, `region`, `content`.
 */
export class FwAccordionItem extends FwElement {
  static override props: PropMap = {
    heading: { type: "string" },
    open: { type: "boolean", reflect: true },
    disabled: { type: "boolean", reflect: true },
    headingLevel: { type: "number", default: 3 },
  };
  static override styles = styles;

  declare heading: string | null;
  declare open: boolean;
  declare disabled: boolean;
  declare headingLevel: number;

  #headingEl!: HTMLElement;
  #header!: HTMLButtonElement;
  #headingText!: HTMLSpanElement;
  #region!: HTMLElement;
  /** What the last binding run saw, so only real changes emit events. */
  #wasOpen = false;

  protected render(root: ShadowRoot): void {
    const id = nextId("fw-accordion-item");

    this.#headingEl = document.createElement("div");
    this.#headingEl.className = "heading";
    this.#headingEl.setAttribute("part", "heading");
    this.#headingEl.setAttribute("role", "heading");

    const header = document.createElement("button");
    header.type = "button";
    header.id = `${id}-header`;
    header.className = "header";
    header.setAttribute("part", "header");
    header.setAttribute("aria-controls", `${id}-region`);

    const label = document.createElement("span");
    label.className = "label";
    label.setAttribute("part", "label");
    const headingSlot = document.createElement("slot");
    headingSlot.name = "heading";
    this.#headingText = document.createElement("span");
    headingSlot.append(this.#headingText);
    label.append(headingSlot);

    const icon = document.createElement("span");
    icon.className = "icon";
    icon.setAttribute("part", "icon");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = CHEVRON;

    header.append(label, icon);
    this.#headingEl.append(header);
    this.#header = header;

    const region = document.createElement("div");
    region.id = `${id}-region`;
    region.className = "region";
    region.setAttribute("part", "region");
    region.setAttribute("role", "region");
    region.setAttribute("aria-labelledby", header.id);
    const clip = document.createElement("div");
    clip.className = "clip";
    const content = document.createElement("div");
    content.className = "content";
    content.setAttribute("part", "content");
    content.append(document.createElement("slot"));
    clip.append(content);
    region.append(clip);
    this.#region = region;

    root.append(this.#headingEl, region);
    this.#wasOpen = this.hasAttribute("open");
  }

  protected override connected(scope: Scope): void {
    scope.bind(() => {
      this.#headingText.textContent = this.prop<string | null>("heading").get() ?? "";
    });

    scope.bind(() => {
      const level = Math.min(
        6,
        Math.max(1, Math.round(this.prop<number>("headingLevel").get() || 3)),
      );
      this.#headingEl.setAttribute("aria-level", String(level));
    });

    scope.bind(() => {
      this.#header.disabled = this.prop<boolean>("disabled").get();
    });

    scope.bind(() => {
      const open = this.prop<boolean>("open").get();
      this.#header.setAttribute("aria-expanded", String(open));
      // Not focusable or interactive while closed, from the moment it
      // starts closing rather than when the animation ends.
      this.#region.toggleAttribute("inert", !open);
      if (open === this.#wasOpen) return;
      this.#wasOpen = open;
      this.emit(open ? "fw-show" : "fw-hide");
    });

    const onClick = () => {
      if (this.prop<boolean>("disabled").peek()) return;
      this.open = !this.prop<boolean>("open").peek();
    };
    this.#header.addEventListener("click", onClick);
    scope.add(() => this.#header.removeEventListener("click", onClick));
  }

  /** Open the item. */
  show(): void {
    this.open = true;
  }

  /** Close the item. */
  hide(): void {
    this.open = false;
  }

  /** Move focus to the header button. */
  override focus(options?: FocusOptions): void {
    this.#header?.focus(options);
  }
}
