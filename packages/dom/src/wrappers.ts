import type { RenderWrapper, RenderWrappers } from "@formwright/schema";

function wrapperAttrValue(value: string | number | boolean): string | null {
  if (value === false) return null;
  if (value === true) return "";
  return String(value);
}

function applyWrapperHost(host: HTMLElement, def: RenderWrapper): void {
  if (def.class) {
    for (const c of def.class.split(/\s+/)) if (c) host.classList.add(c);
  }
  if (def.attrs) {
    for (const [name, raw] of Object.entries(def.attrs)) {
      const value = wrapperAttrValue(raw);
      if (value === null) continue;
      host.setAttribute(name, value);
    }
  }
  if (def.props) {
    const el = host as HTMLElement & Record<string, unknown>;
    for (const [name, value] of Object.entries(def.props)) {
      el[name] = value;
    }
  }
}

/**
 * Wrap a node in one or more host elements.
 * The first wrapper in the array sits closest to the child (innermost).
 */
export function wrapNode(child: HTMLElement, wrapper: RenderWrappers | undefined): HTMLElement {
  if (!wrapper) return child;
  const layers = Array.isArray(wrapper) ? wrapper : [wrapper];
  let node = child;
  for (const layer of layers) {
    if (!layer.tag) continue;
    const host = document.createElement(layer.tag);
    applyWrapperHost(host, layer);
    host.appendChild(node);
    node = host;
  }
  return node;
}
