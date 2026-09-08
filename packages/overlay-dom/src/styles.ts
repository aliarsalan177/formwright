/**
 * Default look, injected once per page.
 *
 * Everything a consumer is likely to restyle is a custom property, so a
 * host theme overrides tokens rather than fighting selectors. Pass
 * `styles: false` to mount() and none of this is injected.
 *
 * Transitions are declared here rather than in script so a page that
 * sets `prefers-reduced-motion` gets a still overlay for free.
 */
export const OVERLAY_STYLES = `
.ow-root {
  /* The scrim, in parts, so a host theme or a single overlay can change
     one of them without restating the rest. */
  --ow-backdrop-color: #000000;
  --ow-backdrop-opacity: 0.45;
  --ow-backdrop-blur: 0px;
  --ow-panel: #ffffff;
  --ow-text: #18181b;
  --ow-muted: #52525b;
  --ow-border: #e4e4e7;
  --ow-radius: 14px;
  --ow-shadow: 0 10px 40px rgb(0 0 0 / 0.18);
  --ow-duration: 220ms;
  --ow-ease: cubic-bezier(0.32, 0.72, 0, 1);
  --ow-accent: #18181b;
  --ow-accent-text: #ffffff;
  --ow-danger: #dc2626;
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  pointer-events: none;
  font-family: inherit;
  color: var(--ow-text);
}
.ow-layer { position: fixed; inset: 0; pointer-events: none; }
.ow-layer[data-open="true"] { pointer-events: auto; }

.ow-backdrop {
  position: absolute;
  inset: 0;
  background: var(--ow-backdrop-color);
  opacity: 0;
  transition:
    opacity var(--ow-duration) var(--ow-ease),
    backdrop-filter var(--ow-duration) var(--ow-ease);
}
.ow-layer[data-open="true"] > .ow-backdrop {
  opacity: var(--ow-backdrop-opacity);
  /* Only pay for the blur when one was asked for — compositing a
     backdrop-filter is expensive on low-end phones. */
  backdrop-filter: blur(var(--ow-backdrop-blur));
  -webkit-backdrop-filter: blur(var(--ow-backdrop-blur));
}

.ow-panel {
  position: absolute;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  background: var(--ow-panel);
  box-shadow: var(--ow-shadow);
  outline: none;
  transition:
    transform var(--ow-duration) var(--ow-ease),
    opacity var(--ow-duration) var(--ow-ease);
}

/* Modal — centred, scaled in. */
.ow-panel[data-kind="modal"] {
  top: 50%;
  left: 50%;
  width: calc(100% - 2rem);
  border-radius: var(--ow-radius);
  transform: translate(-50%, -50%) scale(0.96);
  opacity: 0;
}
.ow-layer[data-open="true"] > .ow-panel[data-kind="modal"] {
  transform: translate(-50%, -50%) scale(1);
  opacity: 1;
}
.ow-panel[data-size="sm"] { max-width: 24rem; }
.ow-panel[data-size="md"] { max-width: 32rem; }
.ow-panel[data-size="lg"] { max-width: 42rem; }
.ow-panel[data-size="xl"] { max-width: 56rem; }
.ow-panel[data-size="full"] { max-width: none; inset: 1rem; transform: none; }
.ow-layer[data-open="true"] > .ow-panel[data-size="full"] { transform: none; }

/* Drawer and sheet — slide from an edge. The closed transform is the
   panel's own size so it always starts fully off-screen. */
.ow-panel[data-edge="right"],
.ow-panel[data-edge="left"] { top: 0; bottom: 0; width: min(100%, 28rem); max-height: none; }
.ow-panel[data-edge="right"] { right: 0; transform: translate3d(100%, 0, 0); }
.ow-panel[data-edge="left"] { left: 0; transform: translate3d(-100%, 0, 0); }
.ow-panel[data-edge="top"],
.ow-panel[data-edge="bottom"] { left: 0; right: 0; width: auto; }
.ow-panel[data-edge="top"] { top: 0; transform: translate3d(0, -100%, 0); border-radius: 0 0 var(--ow-radius) var(--ow-radius); }
.ow-panel[data-edge="bottom"] { bottom: 0; transform: translate3d(0, 100%, 0); border-radius: var(--ow-radius) var(--ow-radius) 0 0; }
.ow-layer[data-open="true"] > .ow-panel[data-edge] { transform: translate3d(0, 0, 0); }

/* A sheet resting at a snap point is sized to it. */
.ow-panel[data-kind="sheet"] { height: var(--ow-snap, auto); }

.ow-grip {
  flex: none;
  align-self: center;
  width: 2.25rem;
  height: 0.25rem;
  margin: 0.5rem 0 0.25rem;
  border-radius: 999px;
  background: var(--ow-border);
  cursor: grab;
  touch-action: none;
}
.ow-grip:active { cursor: grabbing; }

.ow-head { flex: none; padding: 1rem 1.25rem 0.5rem; }
/* Out of sight, still in the accessibility tree. display:none would
   take it out of both. */
.ow-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
.ow-title { margin: 0; font-size: 1rem; font-weight: 600; }
.ow-desc { margin: 0.25rem 0 0; font-size: 0.875rem; color: var(--ow-muted); }
.ow-body { flex: 1 1 auto; overflow-y: auto; padding: 0.5rem 1.25rem 1rem; font-size: 0.875rem; }
.ow-body > * + * { margin-top: 0.625rem; }
.ow-text { margin: 0; line-height: 1.55; }
.ow-text[data-tone="muted"] { color: var(--ow-muted); }
.ow-text[data-tone="danger"] { color: var(--ow-danger); }
.ow-text[data-tone="success"] { color: #16a34a; }
.ow-list { margin: 0; padding-left: 1.15rem; line-height: 1.55; }
.ow-rule { border: 0; border-top: 1px solid var(--ow-border); margin: 0.75rem 0; }
.ow-fields { display: grid; gap: 0.35rem; margin: 0; }
.ow-field { display: flex; justify-content: space-between; gap: 1rem; }
.ow-field dt { color: var(--ow-muted); }
.ow-field dd { margin: 0; font-variant-numeric: tabular-nums; }

/* Pinned: the body scrolls, this does not. flex-wrap so host content
   and the button row stack on a narrow panel rather than squeezing. */
.ow-foot {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem 1.25rem;
}
.ow-foot-content { flex: 1 1 100%; }
.ow-action {
  border: 1px solid var(--ow-border);
  border-radius: 8px;
  background: var(--ow-panel);
  padding: 0.5rem 0.9rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ow-text);
  cursor: pointer;
}
.ow-action:hover:not(:disabled) { background: #f4f4f5; }
.ow-action:disabled { opacity: 0.5; cursor: default; }
.ow-action[data-role="confirm"] { background: var(--ow-accent); border-color: var(--ow-accent); color: var(--ow-accent-text); }
.ow-action[data-role="danger"] { background: var(--ow-danger); border-color: var(--ow-danger); color: #ffffff; }

@media (prefers-color-scheme: dark) {
  .ow-root {
    --ow-panel: #18181b;
    --ow-text: #fafafa;
    --ow-muted: #a1a1aa;
    --ow-border: #3f3f46;
    --ow-accent: #fafafa;
    --ow-accent-text: #18181b;
  }
  .ow-action:hover:not(:disabled) { background: #27272a; }
}

@media (prefers-reduced-motion: reduce) {
  .ow-backdrop, .ow-panel { transition-duration: 1ms; }
}
`;

const STYLE_ID = "formwright-overlay-styles";

export function injectStyles(styles: string | boolean | undefined): void {
  if (styles === false) return;
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = typeof styles === "string" ? styles : OVERLAY_STYLES;
  document.head.appendChild(el);
}
