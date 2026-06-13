/**
 * Tiny DOM helpers + reactive bindings. Each binding is an {@link effect} that
 * writes to exactly one node/attribute, so a value change updates only that
 * node — no virtual DOM, no re-render of siblings or parents.
 */
import { effect, type Dispose } from "@formwright/core";

/** Collects disposers so a subtree can be torn down in one call. */
export class Scope {
  private readonly disposers: Dispose[] = [];

  add(dispose: Dispose): void {
    this.disposers.push(dispose);
  }

  /** Run a reactive binding and register its disposer. */
  bind(fn: () => void): void {
    this.add(effect(fn));
  }

  dispose(): void {
    for (let i = this.disposers.length - 1; i >= 0; i--) this.disposers[i]!();
    this.disposers.length = 0;
  }
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: Node[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const child of children) el.appendChild(child);
  return el;
}

/** Reactively bind a node's text content to a string-producing function. */
export function bindText(scope: Scope, node: Node, fn: () => string): void {
  scope.bind(() => {
    node.textContent = fn();
  });
}

/**
 * Reactively hide/show an element. Sets both the `hidden` attribute (semantics,
 * a11y) and inline `display` — the latter guards against app CSS that puts a
 * `display` rule on the wrapper, which would otherwise out-specify `[hidden]`
 * and leave a conditional field visible when it should be hidden.
 */
export function bindHidden(scope: Scope, el: HTMLElement, isHidden: () => boolean): void {
  scope.bind(() => {
    const hidden = isHidden();
    el.hidden = hidden;
    el.style.display = hidden ? "none" : "";
  });
}

/** Reactively toggle `disabled` on a control. */
export function bindDisabled(
  scope: Scope,
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement,
  isDisabled: () => boolean,
): void {
  scope.bind(() => {
    el.disabled = isDisabled();
  });
}

/** Reactively toggle a class. */
export function bindClass(
  scope: Scope,
  el: HTMLElement,
  className: string,
  isOn: () => boolean,
): void {
  scope.bind(() => {
    el.classList.toggle(className, isOn());
  });
}

/** Add a DOM event listener and register its removal with the scope. */
export function on<K extends keyof HTMLElementEventMap>(
  scope: Scope,
  el: HTMLElement,
  type: K,
  handler: (ev: HTMLElementEventMap[K]) => void,
): void {
  el.addEventListener(type, handler as EventListener);
  scope.add(() => el.removeEventListener(type, handler as EventListener));
}
