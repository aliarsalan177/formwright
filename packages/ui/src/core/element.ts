import { signal, type WriteSignal } from "@formwright/reactive";
import { Scope } from "@formwright/ui-core";
import { baseStyles } from "./styles.js";

/**
 * The base every `<fw-*>` element extends.
 *
 * It exists to make three things impossible to get wrong in each of
 * dozens of components:
 *
 * 1. **Properties.** Declared once in `static props`, each becomes an
 *    attribute, a JS property and a signal at the same time. Setting any
 *    of them updates the other two, and bindings that read the signal
 *    update exactly the node they write — no re-render.
 *
 * 2. **Lifetime.** The shadow DOM is built once. Everything that listens,
 *    observes or subscribes goes in `connected(scope)`, and that scope is
 *    disposed on disconnect. Nothing an element sets up outlives its
 *    place in the document, and moving an element simply tears down and
 *    rebinds.
 *
 * 3. **Styles.** Adopted once per class as a shared stylesheet where the
 *    browser supports it, so a table of fifty inputs parses one sheet, not
 *    fifty copies.
 */

export type PropType = "string" | "number" | "boolean" | "json";

export interface PropDef {
  type: PropType;
  /** Attribute name, or false for property-only. Default: the prop name in kebab-case. */
  attribute?: string | false;
  /** Write property changes back to the attribute. Needed for `:host([attr])` styling. */
  reflect?: boolean;
  default?: unknown;
}

export type PropMap = Record<string, PropDef>;

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function attributeName(key: string, def: PropDef): string | null {
  if (def.attribute === false) return null;
  return def.attribute ?? kebab(key);
}

function fromAttribute(value: string | null, def: PropDef): unknown {
  switch (def.type) {
    case "boolean":
      return value !== null;
    case "number": {
      if (value === null || value.trim() === "") return def.default ?? null;
      const n = Number(value);
      return Number.isNaN(n) ? (def.default ?? null) : n;
    }
    case "json":
      if (value === null) return def.default ?? null;
      try {
        return JSON.parse(value);
      } catch {
        return def.default ?? null;
      }
    default:
      return value ?? def.default ?? null;
  }
}

function toAttribute(value: unknown, def: PropDef): string | null {
  if (def.type === "boolean") return value ? "" : null;
  if (value === null || value === undefined) return null;
  return def.type === "json" ? JSON.stringify(value) : String(value);
}

/** One stylesheet per element class, shared by every instance. */
const sheets = new WeakMap<object, CSSStyleSheet>();

type ElementClass = typeof FwElement;

export abstract class FwElement extends HTMLElement {
  static props: PropMap = {};
  static styles = "";
  static shadowOptions: ShadowRootInit = { mode: "open" };

  static get observedAttributes(): string[] {
    return Object.entries(this.props)
      .map(([key, def]) => attributeName(key, def))
      .filter((name): name is string => name !== null);
  }

  /** The element's shadow root. */
  protected readonly root: ShadowRoot;
  /** Everything bound for the current connection. Replaced on each connect. */
  protected scope = new Scope();

  readonly #signals = new Map<string, WriteSignal<unknown>>();
  #rendered = false;
  #reflecting = false;

  constructor() {
    super();
    const ctor = this.constructor as ElementClass;
    this.root = this.shadowRoot ?? this.attachShadow(ctor.shadowOptions);

    // A framework may have set a property before this class was defined.
    // That lands as an own property that would shadow the accessor
    // forever; move it through the accessor instead.
    for (const key of Object.keys(ctor.props)) {
      if (Object.prototype.hasOwnProperty.call(this, key)) {
        const value = (this as unknown as Record<string, unknown>)[key];
        delete (this as unknown as Record<string, unknown>)[key];
        (this as unknown as Record<string, unknown>)[key] = value;
      }
    }
  }

  connectedCallback(): void {
    if (!this.#rendered) {
      this.#adoptStyles();
      this.render(this.root);
      this.#rendered = true;
    }
    this.scope = new Scope();
    this.connected(this.scope);
  }

  disconnectedCallback(): void {
    this.scope.dispose();
    this.disconnected();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (this.#reflecting) return;
    const ctor = this.constructor as ElementClass;
    for (const [key, def] of Object.entries(ctor.props)) {
      if (attributeName(key, def) === name) {
        this.prop(key).set(fromAttribute(value, def));
        return;
      }
    }
  }

  /** Build the shadow DOM. Called once, on first connect. */
  protected abstract render(root: ShadowRoot): void;

  /** Bind, listen and observe. Everything added to `scope` is undone on disconnect. */
  protected connected(_scope: Scope): void {}

  protected disconnected(): void {}

  /** The signal behind a declared prop. Reading it inside a binding subscribes. */
  protected prop<T>(key: string): WriteSignal<T> {
    let s = this.#signals.get(key);
    if (!s) {
      const def = (this.constructor as ElementClass).props[key];
      if (!def) throw new Error(`<${this.localName}> has no prop "${key}"`);
      const name = attributeName(key, def);
      const initial =
        name !== null && this.hasAttribute(name)
          ? fromAttribute(this.getAttribute(name), def)
          : def.type === "boolean"
            ? (def.default ?? false)
            : (def.default ?? null);
      s = signal<unknown>(initial);
      this.#signals.set(key, s);
    }
    return s as WriteSignal<T>;
  }

  /** Set a prop from inside the element, reflecting if it is declared to. */
  protected setProp(key: string, value: unknown): void {
    (this as unknown as Record<string, unknown>)[key] = value;
  }

  /** Dispatch an event that crosses the shadow boundary, like a native control's. */
  protected emit<D = undefined>(
    type: string,
    detail?: D,
    init: { cancelable?: boolean } = {},
  ): boolean {
    const event =
      detail === undefined
        ? new Event(type, { bubbles: true, composed: true, cancelable: init.cancelable ?? false })
        : new CustomEvent(type, {
            detail,
            bubbles: true,
            composed: true,
            cancelable: init.cancelable ?? false,
          });
    return this.dispatchEvent(event);
  }

  /** @internal — called by the property accessors installed in define(). */
  _writeProp(key: string, value: unknown): void {
    const def = (this.constructor as ElementClass).props[key];
    if (!def) return;
    const normalised = def.type === "boolean" ? Boolean(value) : value;
    this.prop(key).set(normalised);
    const name = attributeName(key, def);
    if (def.reflect && name !== null) {
      const attr = toAttribute(normalised, def);
      this.#reflecting = true;
      try {
        if (attr === null) this.removeAttribute(name);
        else if (this.getAttribute(name) !== attr) this.setAttribute(name, attr);
      } finally {
        this.#reflecting = false;
      }
    }
  }

  #adoptStyles(): void {
    const ctor = this.constructor as ElementClass;
    const css = baseStyles + ctor.styles;
    const root = this.root as ShadowRoot & { adoptedStyleSheets?: CSSStyleSheet[] };
    const canAdopt =
      "adoptedStyleSheets" in root &&
      typeof CSSStyleSheet !== "undefined" &&
      "replaceSync" in CSSStyleSheet.prototype;
    if (canAdopt) {
      let sheet = sheets.get(ctor);
      if (!sheet) {
        sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        sheets.set(ctor, sheet);
      }
      root.adoptedStyleSheets = [...(root.adoptedStyleSheets ?? []), sheet];
    } else {
      const style = document.createElement("style");
      style.textContent = css;
      root.prepend(style);
    }
  }
}

/**
 * Register an element under a tag and give it property accessors.
 *
 * Idempotent: importing two entry points that both pull in a shared
 * element — `fw-option` is used by more than one — does not throw
 * "already defined". A different class under a taken name is left alone
 * rather than breaking the page.
 */
export function define(tag: string, ctor: ElementClass): void {
  const proto = ctor.prototype as unknown as Record<string, unknown>;
  for (const key of Object.keys(ctor.props)) {
    if (Object.prototype.hasOwnProperty.call(proto, key)) continue;
    Object.defineProperty(proto, key, {
      configurable: true,
      enumerable: true,
      get(this: FwElement) {
        return (this as unknown as { prop(k: string): WriteSignal<unknown> }).prop(key).get();
      },
      set(this: FwElement, value: unknown) {
        this._writeProp(key, value);
      },
    });
  }
  if (typeof customElements === "undefined") return;
  if (!customElements.get(tag)) {
    customElements.define(tag, ctor as unknown as CustomElementConstructor);
  }
}

let uid = 0;
/** An id unique within the page, for wiring labels and descriptions. */
export function nextId(prefix: string): string {
  uid += 1;
  return `${prefix}-${uid}`;
}
