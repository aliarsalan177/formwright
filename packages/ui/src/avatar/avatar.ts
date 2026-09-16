import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";
import { srOnly } from "../core/styles.js";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarShape = "circle" | "square";
export type AvatarStatus = "online" | "away" | "busy" | "offline";

const styles =
  srOnly +
  /* css */ `
:host {
  --_size: 2.5rem;
  display: inline-block; position: relative; flex: none; vertical-align: middle;
  width: var(--_size); height: var(--_size);
}
:host([size="xs"]) { --_size: 1.5rem; }
:host([size="sm"]) { --_size: 2rem; }
:host([size="lg"]) { --_size: 3rem; }
:host([size="xl"]) { --_size: 4rem; }

.base {
  position: relative; display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%; overflow: hidden;
  border-radius: 50%;
  background: var(--fw-avatar-background, var(--_surface-2)); color: var(--_muted);
  font-size: calc(var(--_size) * 0.4); font-weight: 600; line-height: 1;
  user-select: none;
  box-shadow: var(--fw-avatar-ring, none);
}
:host([shape="square"]) .base { border-radius: var(--_radius); }
.base[data-hue] {
  background: var(--fw-avatar-background, hsl(var(--_hue) 45% 42%));
  color: var(--fw-avatar-color, #fff);
}

.initials { text-transform: uppercase; }
.fallback { display: flex; width: 60%; height: 60%; }
.fallback svg { width: 100%; height: 100%; }

.image {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover;
}

.status {
  position: absolute; inset-block-end: 0; inset-inline-end: 0;
  width: max(0.5rem, calc(var(--_size) * 0.28)); height: max(0.5rem, calc(var(--_size) * 0.28));
  border-radius: 50%; background: var(--_muted);
  box-shadow: 0 0 0 2px var(--_surface);
}
:host([shape="square"]) .status { inset-block-end: -2px; inset-inline-end: -2px; }
:host([status="online"]) .status { background: var(--_success); }
:host([status="away"]) .status { background: var(--_warning); }
:host([status="busy"]) .status { background: var(--_danger); }
`;

const ICON_PERSON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.4 0-8 2.5-8 5.5V21h16v-1.5c0-3-3.6-5.5-8-5.5Z"/></svg>`;

const STATUS_TEXT: Record<string, string> = {
  online: "Online",
  away: "Away",
  busy: "Busy",
  offline: "Offline",
};

/** Up to two initials: first and last word, whole characters not code units. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  if (!first) return "";
  const head = Array.from(first)[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1]! : "";
  const tail = last ? (Array.from(last)[0] ?? "") : "";
  return (head + tail).toUpperCase();
}

/** A stable hue for a name, so the same member always gets the same colour. */
export function hueOf(name: string): number {
  let hash = 0;
  for (const char of name.trim().toLowerCase()) {
    hash = (hash * 31 + char.codePointAt(0)!) | 0;
  }
  return Math.abs(hash) % 360;
}

/**
 * `<fw-avatar>` — a person's picture, falling back to their initials.
 *
 * ```html
 * <fw-avatar src="/photos/ali.jpg" name="Ali Arsalan"></fw-avatar>
 * <fw-avatar name="Sara Khan" size="lg" status="online"></fw-avatar>
 * <fw-avatar shape="square" size="sm"></fw-avatar>   <!-- generic person icon -->
 * ```
 *
 * Without a `src`, or when the image fails to load, it shows the initials
 * of `name` on a background colour derived from the name — the same name
 * always gets the same colour. Override it with `--fw-avatar-background`
 * and `--fw-avatar-color`.
 *
 * The avatar is announced as one image named by `alt`, or `name` when
 * there is no `alt`. With neither it is decorative. `status` adds a dot and
 * a visually hidden word ("Online") for screen readers.
 *
 * Parts: `base`, `image`, `initials`, `status`.
 */
export class FwAvatar extends FwElement {
  static override props: PropMap = {
    src: { type: "string" },
    alt: { type: "string" },
    name: { type: "string" },
    size: { type: "string", reflect: true, default: "md" },
    shape: { type: "string", reflect: true, default: "circle" },
    status: { type: "string", reflect: true },
  };
  static override styles = styles;

  declare src: string | null;
  declare alt: string | null;
  declare name: string | null;
  declare size: AvatarSize;
  declare shape: AvatarShape;
  declare status: AvatarStatus | null;

  #base!: HTMLSpanElement;
  #image!: HTMLImageElement;
  #initials!: HTMLSpanElement;
  #fallback!: HTMLSpanElement;
  #status!: HTMLSpanElement;
  #statusText!: HTMLSpanElement;
  /** The src that failed, so a new src gets a fresh attempt. */
  readonly #failed = signal<string | null>(null);

  protected render(root: ShadowRoot): void {
    this.#base = document.createElement("span");
    this.#base.className = "base";
    this.#base.setAttribute("part", "base");

    this.#initials = document.createElement("span");
    this.#initials.className = "initials";
    this.#initials.setAttribute("part", "initials");
    this.#initials.setAttribute("aria-hidden", "true");

    this.#fallback = document.createElement("span");
    this.#fallback.className = "fallback";
    this.#fallback.setAttribute("aria-hidden", "true");
    this.#fallback.innerHTML = ICON_PERSON;

    this.#image = document.createElement("img");
    this.#image.className = "image";
    this.#image.setAttribute("part", "image");
    this.#image.alt = "";
    this.#image.decoding = "async";
    this.#image.hidden = true;

    this.#base.append(this.#initials, this.#fallback, this.#image);

    this.#status = document.createElement("span");
    this.#status.className = "status";
    this.#status.setAttribute("part", "status");
    this.#status.setAttribute("aria-hidden", "true");
    this.#status.hidden = true;

    this.#statusText = document.createElement("span");
    this.#statusText.className = "sr-only";
    this.#statusText.hidden = true;

    root.append(this.#base, this.#status, this.#statusText);
  }

  protected override connected(scope: Scope): void {
    const base = this.#base;
    const image = this.#image;

    scope.bind(() => {
      const src = this.prop<string | null>("src").get();
      const failed = this.#failed.get();
      const name = (this.prop<string | null>("name").get() ?? "").trim();
      const alt = this.prop<string | null>("alt").get();

      const showImage = Boolean(src) && failed !== src;
      if (src) {
        if (image.getAttribute("src") !== src) image.src = src;
      } else {
        image.removeAttribute("src");
      }
      image.hidden = !showImage;

      // Initials sit underneath the image, so they show while it loads and
      // stay when it fails, with no flash of an empty circle.
      const initials = name ? initialsOf(name) : "";
      this.#initials.textContent = initials;
      this.#initials.hidden = !initials;
      this.#fallback.hidden = Boolean(initials);
      if (initials) {
        base.dataset.hue = "";
        base.style.setProperty("--_hue", String(hueOf(name)));
      } else {
        delete base.dataset.hue;
        base.style.removeProperty("--_hue");
      }

      // One image to assistive technology, whatever is showing inside it.
      const label = alt ?? (name || null);
      if (label) {
        base.setAttribute("role", "img");
        base.setAttribute("aria-label", label);
        base.removeAttribute("aria-hidden");
      } else {
        base.removeAttribute("role");
        base.removeAttribute("aria-label");
        base.setAttribute("aria-hidden", "true");
      }
    });

    scope.bind(() => {
      const status = this.prop<string | null>("status").get();
      const text = status ? (STATUS_TEXT[status] ?? status) : "";
      this.#status.hidden = !text;
      this.#statusText.hidden = !text;
      this.#statusText.textContent = text;
    });

    const onError = () => this.#failed.set(this.prop<string | null>("src").peek());
    const onLoad = () => {
      if (this.#failed.peek() === this.prop<string | null>("src").peek()) this.#failed.set(null);
    };
    image.addEventListener("error", onError);
    image.addEventListener("load", onLoad);
    scope.add(() => {
      image.removeEventListener("error", onError);
      image.removeEventListener("load", onLoad);
    });
  }
}
