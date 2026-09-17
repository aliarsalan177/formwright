import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";
import { slotHasContent } from "../core/field.js";

export type AlertTone = "info" | "success" | "warning" | "danger";

const styles = /* css */ `
:host {
  /* The tone recipe shared with fw-badge, fw-tag and fw-progress. */
  --_tone: var(--_info);
  --_tone-text: color-mix(in srgb, var(--_tone) 72%, var(--_text));
  --_tone-soft: color-mix(in srgb, var(--_tone) 10%, var(--_surface));
  --_tone-line: color-mix(in srgb, var(--_tone) 28%, var(--_surface));
  display: block;
}
:host([tone="success"]) { --_tone: var(--_success); }
:host([tone="warning"]) { --_tone: var(--_warning); }
:host([tone="danger"]) { --_tone: var(--_danger); }

.base {
  display: flex; align-items: flex-start; gap: 0.75rem;
  padding-block: 0.875rem; padding-inline: 1rem;
  font-size: var(--_text-size); line-height: 1.5;
  background: var(--_tone-soft);
  color: var(--_text);
  border: 1px solid var(--_tone-line);
  /* A "full" radius theme rounds controls into pills; a multi-line
     panel keeps a large but finite corner. */
  border-radius: min(var(--_radius), 1rem);
}

.icon {
  display: inline-flex; flex: none; align-items: center;
  height: 1.5em; color: var(--_tone-text);
}
.icon-default { display: contents; }
.icon svg, ::slotted([slot="icon"]) { width: 1.125rem; height: 1.125rem; }
::slotted([slot="icon"]) { display: inline-flex; }

.content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.125rem; }
.heading { font-weight: 600; color: var(--_text); }
::slotted([slot="heading"]) { margin: 0; font: inherit; color: inherit; }
.message { color: color-mix(in srgb, var(--_text) 80%, var(--_surface)); overflow-wrap: anywhere; }
.actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-block-start: 0.625rem; }

.close {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 1.75rem; height: 1.75rem; margin-block: -0.125rem; margin-inline-end: -0.375rem;
  padding: 0; border: 0; border-radius: var(--_radius-sm); background: transparent;
  color: var(--_muted); cursor: pointer; font: inherit;
  transition: background-color var(--_duration), color var(--_duration);
}
.close:hover { background: color-mix(in srgb, var(--_tone) 16%, var(--_surface)); color: var(--_text); }
.close:active { background: color-mix(in srgb, var(--_tone) 24%, var(--_surface)); }
.close:focus-visible { outline: none; box-shadow: var(--_ring); color: var(--_text); }
`;

const svg = (path: string) =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

const ICONS: Record<AlertTone, string> = {
  info: svg(`<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>`),
  success: svg(`<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5L16 9.5"/>`),
  warning: svg(
    `<path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>`,
  ),
  danger: svg(`<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>`),
};

const ICON_CLOSE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

/**
 * `<fw-alert>` — a message about something that happened or needs
 * attention, inline in the page.
 *
 * ```html
 * <fw-alert heading="Membership renewed">Valid until 30 June.</fw-alert>
 * <fw-alert tone="warning" dismissible>
 *   <strong slot="heading">Fingerprint reader offline</strong>
 *   Check-ins are being recorded manually.
 *   <fw-button slot="actions" size="sm" variant="secondary">Reconnect</fw-button>
 * </fw-alert>
 * <fw-alert tone="danger"><svg slot="icon" …></svg>Payment failed.</fw-alert>
 * ```
 *
 * `warning` and `danger` are `role="alert"`, interrupting a screen reader
 * when inserted; `info` and `success` are `role="status"`, read politely.
 * Each tone has a default icon; slot your own into `icon`.
 *
 * `dismissible` adds a close button. Clicking it fires a cancelable
 * `fw-dismiss`; unless prevented, the alert hides itself.
 *
 * Events: `fw-dismiss` (cancelable).
 * Slots: `icon`, `heading`, default (message), `actions`.
 * Parts: `base`, `icon`, `content`, `heading`, `message`, `actions`, `close`.
 */
export class FwAlert extends FwElement {
  static override props: PropMap = {
    tone: { type: "string", reflect: true, default: "info" },
    heading: { type: "string" },
    dismissible: { type: "boolean", reflect: true },
  };
  static override styles = styles;

  declare tone: AlertTone;
  declare heading: string | null;
  declare dismissible: boolean;

  #base!: HTMLDivElement;
  #iconFallback!: HTMLSpanElement;
  #heading!: HTMLDivElement;
  #headingText!: HTMLSpanElement;
  #message!: HTMLDivElement;
  #messageSlot!: HTMLSlotElement;
  #actions!: HTMLDivElement;
  #close!: HTMLButtonElement;
  readonly #slots = signal(0);

  protected render(root: ShadowRoot): void {
    this.#base = document.createElement("div");
    this.#base.className = "base";
    this.#base.setAttribute("part", "base");

    const icon = document.createElement("span");
    icon.className = "icon";
    icon.setAttribute("part", "icon");
    icon.setAttribute("aria-hidden", "true");
    const iconSlot = document.createElement("slot");
    iconSlot.name = "icon";
    this.#iconFallback = document.createElement("span");
    this.#iconFallback.className = "icon-default";
    iconSlot.append(this.#iconFallback);
    icon.append(iconSlot);

    const content = document.createElement("div");
    content.className = "content";
    content.setAttribute("part", "content");

    this.#heading = document.createElement("div");
    this.#heading.className = "heading";
    this.#heading.setAttribute("part", "heading");
    const headingSlot = document.createElement("slot");
    headingSlot.name = "heading";
    this.#headingText = document.createElement("span");
    headingSlot.append(this.#headingText);
    this.#heading.append(headingSlot);

    this.#message = document.createElement("div");
    this.#message.className = "message";
    this.#message.setAttribute("part", "message");
    this.#messageSlot = document.createElement("slot");
    this.#message.append(this.#messageSlot);

    this.#actions = document.createElement("div");
    this.#actions.className = "actions";
    this.#actions.setAttribute("part", "actions");
    const actionsSlot = document.createElement("slot");
    actionsSlot.name = "actions";
    this.#actions.append(actionsSlot);

    content.append(this.#heading, this.#message, this.#actions);

    this.#close = document.createElement("button");
    this.#close.type = "button";
    this.#close.className = "close";
    this.#close.setAttribute("part", "close");
    this.#close.setAttribute("aria-label", "Dismiss");
    this.#close.innerHTML = ICON_CLOSE;
    this.#close.hidden = true;

    this.#base.append(icon, content, this.#close);
    root.append(this.#base);
  }

  protected override connected(scope: Scope): void {
    scope.bind(() => {
      const tone = (this.prop<string | null>("tone").get() ?? "info") as AlertTone;
      const known: AlertTone = tone in ICONS ? tone : "info";
      this.#base.setAttribute(
        "role",
        known === "warning" || known === "danger" ? "alert" : "status",
      );
      this.#iconFallback.innerHTML = ICONS[known];
    });

    scope.bind(() => {
      this.#slots.get();
      const heading = this.prop<string | null>("heading").get();
      this.#headingText.textContent = heading ?? "";
      this.#heading.hidden = !heading && !slotHasContent(this.root, "heading");
      this.#actions.hidden = !slotHasContent(this.root, "actions");
      this.#message.hidden = !this.#messageSlot
        .assignedNodes()
        .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? "").trim() !== "");
    });

    scope.bind(() => {
      this.#close.hidden = !this.prop<boolean>("dismissible").get();
    });

    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);
    const onClose = () => {
      if (this.emit("fw-dismiss", undefined, { cancelable: true })) this.hidden = true;
    };
    this.root.addEventListener("slotchange", onSlotChange);
    this.#close.addEventListener("click", onClose);
    scope.add(() => {
      this.root.removeEventListener("slotchange", onSlotChange);
      this.#close.removeEventListener("click", onClose);
    });
  }
}
