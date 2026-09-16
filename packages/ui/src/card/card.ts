import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";
import { slotHasContent } from "../core/field.js";

export type CardVariant = "outline" | "elevated" | "ghost";
export type CardPadding = "none" | "sm" | "md" | "lg";

const styles = /* css */ `
:host { --_pad: 1rem; display: block; }
:host([padding="none"]) { --_pad: 0; }
:host([padding="sm"]) { --_pad: 0.75rem; }
:host([padding="lg"]) { --_pad: 1.5rem; }

.base {
  position: relative; display: flex; flex-direction: column; height: 100%;
  background: var(--_surface); color: var(--_text);
  border: 1px solid var(--_border); border-radius: var(--_radius);
  transition: box-shadow var(--_duration), border-color var(--_duration);
}
:host([variant="elevated"]) .base { border-color: transparent; box-shadow: var(--_shadow); }
:host([variant="ghost"]) .base { border-color: transparent; background: transparent; }

/* Clipped here rather than on .base, so the linked card's focus ring,
   drawn just outside the card, is not clipped with it. */
.media { display: block; overflow: hidden; border-start-start-radius: inherit; border-start-end-radius: inherit; }
::slotted([slot="media"]) { display: block; width: 100%; max-width: 100%; }

.main {
  display: flex; flex: 1; flex-direction: column; gap: 0.5rem;
  padding: var(--_pad); color: inherit; text-decoration: none;
}
.header { font-weight: 600; font-size: 1rem; line-height: 1.4; }
::slotted([slot="header"]) { margin: 0; font: inherit; color: inherit; }
.body { font-size: var(--_text-size); line-height: 1.5; }

.footer, .actions {
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;
  padding-block: 0 var(--_pad); padding-inline: var(--_pad);
}
.footer { font-size: 0.8125rem; color: var(--_muted); }

/* A linked card: the <a> wraps header and body, and its ::after stretches
   over the whole card, so anywhere is clickable. Footer and actions sit
   above that overlay, so buttons in them get their own clicks. */
a.main { cursor: pointer; }
a.main::after { content: ""; position: absolute; inset: 0; border-radius: inherit; }
a.main:focus-visible { outline: none; }
a.main:focus-visible::after { box-shadow: var(--_ring); }
:host([data-linked]) .base:hover { border-color: color-mix(in srgb, var(--_accent) 45%, var(--_border)); }
:host([data-linked][variant="elevated"]) .base:hover { border-color: transparent; }
.footer, .actions { position: relative; z-index: 1; }
`;

/**
 * `<fw-card>` — a surface grouping related content, optionally a link.
 *
 * ```html
 * <fw-card>
 *   <img slot="media" src="/plans/gold.jpg" alt="">
 *   <h3 slot="header">Gold plan</h3>
 *   Unlimited classes and a personal trainer.
 *   <span slot="footer">PKR 12,000 / month</span>
 *   <fw-button slot="actions" size="sm">Choose</fw-button>
 * </fw-card>
 *
 * <fw-card href="/members/42" variant="elevated" padding="sm">
 *   <strong slot="header">Ali Arsalan</strong>
 *   Membership expires in 3 days.
 *   <fw-button slot="actions" size="sm" variant="secondary">Renew</fw-button>
 * </fw-card>
 * ```
 *
 * With `href`, the header and body become a real `<a>` — middle click,
 * open in new tab and the status-bar URL all work — and the whole card is
 * clickable, with the focus ring drawn around the card. Footer and actions
 * stay outside the link, so buttons in them work and are not nested inside
 * an anchor. The link's accessible name is its header and body text; keep
 * those short.
 *
 * Slots: `media`, `header`, default (body), `footer`, `actions`.
 * Parts: `base`, `media`, `main` (the `<a>` when linked), `header`, `body`,
 * `footer`, `actions`.
 */
export class FwCard extends FwElement {
  static override props: PropMap = {
    variant: { type: "string", reflect: true, default: "outline" },
    padding: { type: "string", reflect: true, default: "md" },
    href: { type: "string" },
    target: { type: "string" },
    rel: { type: "string" },
  };
  static override styles = styles;

  declare variant: CardVariant;
  declare padding: CardPadding;
  declare href: string | null;
  declare target: string | null;
  declare rel: string | null;

  #main!: HTMLDivElement | HTMLAnchorElement;
  #media!: HTMLDivElement;
  #header!: HTMLDivElement;
  #footer!: HTMLDivElement;
  #actions!: HTMLDivElement;
  readonly #slots = signal(0);

  protected render(root: ShadowRoot): void {
    const area = (name: string, slotName: string | null) => {
      const el = document.createElement("div");
      el.className = name;
      el.setAttribute("part", name);
      const slot = document.createElement("slot");
      if (slotName) slot.name = slotName;
      el.append(slot);
      return el;
    };

    const base = document.createElement("div");
    base.className = "base";
    base.setAttribute("part", "base");

    this.#media = area("media", "media");
    this.#header = area("header", "header");
    const body = area("body", null);
    this.#footer = area("footer", "footer");
    this.#actions = area("actions", "actions");

    this.#main = document.createElement("div");
    this.#main.className = "main";
    this.#main.setAttribute("part", "main");
    this.#main.append(this.#header, body);

    base.append(this.#media, this.#main, this.#footer, this.#actions);
    root.append(base);
  }

  protected override connected(scope: Scope): void {
    scope.bind(() => {
      const href = this.prop<string | null>("href").get();
      const target = this.prop<string | null>("target").get();
      const rel = this.prop<string | null>("rel").get();

      // Swapped in place, carrying the header and body across, so the
      // element is a link exactly when the card is one.
      const wantLink = Boolean(href);
      if (wantLink !== this.#main instanceof HTMLAnchorElement) {
        const next = document.createElement(wantLink ? "a" : "div");
        next.className = "main";
        next.setAttribute("part", "main");
        next.append(...this.#main.childNodes);
        this.#main.replaceWith(next);
        this.#main = next;
      }
      this.toggleAttribute("data-linked", wantLink);

      const main = this.#main;
      if (main instanceof HTMLAnchorElement && href) {
        main.href = href;
        if (target) main.target = target;
        else main.removeAttribute("target");
        const safeRel = rel ?? (target === "_blank" ? "noopener noreferrer" : null);
        if (safeRel) main.rel = safeRel;
        else main.removeAttribute("rel");
      }
    });

    scope.bind(() => {
      this.#slots.get();
      this.#media.hidden = !slotHasContent(this.root, "media");
      this.#header.hidden = !slotHasContent(this.root, "header");
      this.#footer.hidden = !slotHasContent(this.root, "footer");
      this.#actions.hidden = !slotHasContent(this.root, "actions");
    });

    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);
    this.root.addEventListener("slotchange", onSlotChange);
    scope.add(() => this.root.removeEventListener("slotchange", onSlotChange));
  }

  /** Focus the card's link, when it has one. */
  override focus(options?: FocusOptions): void {
    if (this.#main instanceof HTMLAnchorElement) this.#main.focus(options);
    else super.focus(options);
  }
}
