import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";

export type SkeletonShape = "text" | "rect" | "circle";

const styles = /* css */ `
:host { display: block; }
:host([shape="circle"]) { display: inline-block; vertical-align: middle; }

.base { display: flex; flex-direction: column; gap: 0.5em; width: var(--_width, 100%); }
:host([shape="circle"]) .base { width: auto; }

.line, .block {
  display: block; border-radius: var(--_radius-sm);
  background-color: var(--_surface-2);
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--_surface) 60%, transparent) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  background-repeat: no-repeat;
  animation: fw-shimmer 1.4s ease-in-out infinite;
}
.line { height: var(--_height-line, 0.875em); }
.line.short { width: 60%; }

.block { width: 100%; height: var(--_block-height, 6rem); border-radius: var(--_radius); }
:host([shape="circle"]) .block {
  width: var(--_width, 2.5rem); height: var(--_block-height, var(--_width, 2.5rem));
  border-radius: 50%;
}

@keyframes fw-shimmer {
  from { background-position: 150% 0; }
  to { background-position: -50% 0; }
}
/* Reduced motion: no sweep, and no highlight frozen mid-way — a flat block. */
@media (prefers-reduced-motion: reduce) {
  .line, .block { animation: none; background-image: none; }
}
`;

/** A bare number is pixels; anything else is used as a CSS length. */
function toLength(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return /^\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}px` : trimmed;
}

/**
 * `<fw-skeleton>` — a placeholder in the shape of content that is loading.
 *
 * ```html
 * <div aria-busy="true" aria-label="Loading member">
 *   <fw-skeleton shape="circle" width="48"></fw-skeleton>
 *   <fw-skeleton lines="3"></fw-skeleton>
 *   <fw-skeleton shape="rect" height="10rem"></fw-skeleton>
 * </div>
 * ```
 *
 * Purely visual: the host is `aria-hidden="true"`, so a screen reader does
 * not read out a list of empty boxes. Tell assistive technology about the
 * wait on the container being filled — `aria-busy="true"` on it while
 * loading, removed when the real content lands — or pair it with an
 * `<fw-spinner>` label.
 *
 * `text` renders `lines` bars with the last one shorter; `rect` and
 * `circle` render one block. `width` and `height` take CSS lengths; a bare
 * number is pixels. The shimmer stops under `prefers-reduced-motion`.
 *
 * Parts: `base`, `line` (each text bar), `block` (rect and circle).
 */
export class FwSkeleton extends FwElement {
  static override props: PropMap = {
    shape: { type: "string", reflect: true, default: "text" },
    lines: { type: "number", default: 1 },
    width: { type: "string" },
    height: { type: "string" },
  };
  static override styles = styles;

  declare shape: SkeletonShape;
  declare lines: number;
  declare width: string | null;
  declare height: string | null;

  #base!: HTMLDivElement;

  protected render(root: ShadowRoot): void {
    this.#base = document.createElement("div");
    this.#base.className = "base";
    this.#base.setAttribute("part", "base");
    root.append(this.#base);
  }

  protected override connected(scope: Scope): void {
    this.setAttribute("aria-hidden", "true");

    scope.bind(() => {
      const shape = this.prop<string | null>("shape").get() ?? "text";
      const raw = this.prop<number | null>("lines").get();
      const lines = shape === "text" ? Math.max(1, Math.floor(raw ?? 1) || 1) : 1;
      const partName = shape === "text" ? "line" : "block";

      // Rebuilt only when the shape or count changes. The pieces are inert
      // boxes with nothing bound to them, so replacing them is free.
      const current = this.#base.children;
      const same =
        current.length === lines &&
        Array.from(current).every((c) => c.getAttribute("part") === partName);
      if (!same) {
        const pieces: HTMLElement[] = [];
        for (let i = 0; i < lines; i++) {
          const piece = document.createElement("span");
          piece.className = partName;
          piece.setAttribute("part", partName);
          if (shape === "text" && lines > 1 && i === lines - 1) piece.classList.add("short");
          pieces.push(piece);
        }
        this.#base.replaceChildren(...pieces);
      }
    });

    scope.bind(() => {
      const shape = this.prop<string | null>("shape").get() ?? "text";
      const width = toLength(this.prop<string | null>("width").get());
      const height = toLength(this.prop<string | null>("height").get());
      const style = this.#base.style;
      if (width) style.setProperty("--_width", width);
      else style.removeProperty("--_width");
      // A text bar's height is its line height; a block's is its height.
      if (height && shape === "text") {
        style.setProperty("--_height-line", height);
        style.removeProperty("--_block-height");
      } else if (height) {
        style.setProperty("--_block-height", height);
        style.removeProperty("--_height-line");
      } else {
        style.removeProperty("--_height-line");
        style.removeProperty("--_block-height");
      }
    });
  }
}
