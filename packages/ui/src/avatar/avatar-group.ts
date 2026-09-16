import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";

const styles = /* css */ `
:host {
  --_size: 2.5rem;
  --_overlap: calc(var(--_size) * -0.25);
  --fw-avatar-ring: 0 0 0 2px var(--_surface);
  display: inline-flex; vertical-align: middle;
}
:host([size="xs"]) { --_size: 1.5rem; }
:host([size="sm"]) { --_size: 2rem; }
:host([size="lg"]) { --_size: 3rem; }
:host([size="xl"]) { --_size: 4rem; }

.base { display: inline-flex; align-items: center; flex-direction: row; }
::slotted(*:not(:first-child)) { margin-inline-start: var(--_overlap); }

.overflow {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: var(--_size); height: var(--_size);
  margin-inline-start: var(--_overlap);
  border-radius: 50%;
  background: var(--_surface-2); color: var(--_text);
  font-size: calc(var(--_size) * 0.36); font-weight: 600; line-height: 1;
  box-shadow: var(--fw-avatar-ring);
  user-select: none;
}
:host([shape="square"]) .overflow { border-radius: var(--_radius); }
`;

const OVERFLOW_MARK = "data-fw-overflow";

/**
 * `<fw-avatar-group>` — a stack of overlapping avatars, collapsing the
 * rest into a "+N".
 *
 * ```html
 * <fw-avatar-group label="Trainers on shift" max="3" size="sm">
 *   <fw-avatar name="Ali Arsalan"></fw-avatar>
 *   <fw-avatar name="Sara Khan"></fw-avatar>
 *   <fw-avatar name="Omar Farooq"></fw-avatar>
 *   <fw-avatar name="Hina Aslam"></fw-avatar>
 * </fw-avatar-group>
 * ```
 *
 * `max` shows the first N avatars and hides the rest behind a "+M"
 * counter. A `size` or `shape` set on the group is applied to every avatar
 * in it, so the stack stays even; leave them off to size avatars one by
 * one. The group is a `role="group"` named by `label`.
 *
 * Slots: default (`<fw-avatar>` elements).
 * Parts: `base`, `overflow`.
 */
export class FwAvatarGroup extends FwElement {
  static override props: PropMap = {
    max: { type: "number" },
    label: { type: "string" },
    size: { type: "string", reflect: true },
    shape: { type: "string", reflect: true },
  };
  static override styles = styles;

  declare max: number | null;
  declare label: string | null;
  declare size: string | null;
  declare shape: string | null;

  #slot!: HTMLSlotElement;
  #overflow!: HTMLSpanElement;
  readonly #children = signal(0);

  protected render(root: ShadowRoot): void {
    const base = document.createElement("div");
    base.className = "base";
    base.setAttribute("part", "base");

    this.#slot = document.createElement("slot");

    this.#overflow = document.createElement("span");
    this.#overflow.className = "overflow";
    this.#overflow.setAttribute("part", "overflow");
    this.#overflow.setAttribute("role", "img");
    this.#overflow.hidden = true;

    base.append(this.#slot, this.#overflow);
    root.append(base);
  }

  protected override connected(scope: Scope): void {
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");

    scope.bind(() => {
      const label = this.prop<string | null>("label").get();
      if (label) this.setAttribute("aria-label", label);
      else this.removeAttribute("aria-label");
    });

    scope.bind(() => {
      this.#children.get();
      const max = this.prop<number | null>("max").get();
      const size = this.prop<string | null>("size").get();
      const shape = this.prop<string | null>("shape").get();

      const avatars = this.#avatars();
      const limit = max !== null && max >= 0 ? Math.floor(max) : Number.POSITIVE_INFINITY;
      avatars.forEach((avatar, i) => {
        if (size && avatar.getAttribute("size") !== size) avatar.setAttribute("size", size);
        if (shape && avatar.getAttribute("shape") !== shape) avatar.setAttribute("shape", shape);
        if (i >= limit) {
          if (!avatar.hidden) {
            avatar.hidden = true;
            avatar.setAttribute(OVERFLOW_MARK, "");
          }
        } else if (avatar.hasAttribute(OVERFLOW_MARK)) {
          avatar.removeAttribute(OVERFLOW_MARK);
          avatar.hidden = false;
        }
      });

      const rest = Number.isFinite(limit) ? Math.max(0, avatars.length - limit) : 0;
      this.#overflow.hidden = rest === 0;
      this.#overflow.textContent = `+${rest}`;
      this.#overflow.setAttribute("aria-label", `${rest} more`);
    });

    const onSlotChange = () => this.#children.set(this.#children.peek() + 1);
    this.#slot.addEventListener("slotchange", onSlotChange);
    scope.add(() => this.#slot.removeEventListener("slotchange", onSlotChange));
  }

  /** The avatars in the group, in order. */
  #avatars(): HTMLElement[] {
    return (
      this.#slot
        .assignedElements()
        .filter((el): el is HTMLElement => el instanceof HTMLElement)
        // Something the app hid itself is not ours to count or reveal.
        .filter((el) => el.hasAttribute(OVERFLOW_MARK) || !el.hidden)
    );
  }
}
