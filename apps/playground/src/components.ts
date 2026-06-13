/**
 * A tiny star-rating Web Component — exactly the shape StencilJS (or Lit, or any
 * framework that compiles to custom elements) produces. It exposes a `value`
 * property and emits a `rating-change` event, so a Formwright field can bind to
 * it with ZERO code, straight from the schema:
 *
 *   { id: "score", type: "number",
 *     widget: { tag: "fw-rating", event: "rating-change", valueProp: "value" } }
 */
export class FwRating extends HTMLElement {
  private _value = 0;

  static get observedAttributes(): string[] {
    return ["value"];
  }

  get value(): number {
    return this._value;
  }
  set value(v: number) {
    this._value = Number(v) || 0;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    this.value = Number(this.getAttribute("value")) || 0;
  }

  private render(): void {
    this.replaceChildren();
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("button");
      star.type = "button";
      star.className = "fw-star";
      star.textContent = i <= this._value ? "★" : "☆";
      star.addEventListener("click", () => {
        this._value = i;
        this.render();
        this.dispatchEvent(
          new CustomEvent("rating-change", { detail: { value: i }, bubbles: true }),
        );
      });
      this.appendChild(star);
    }
  }
}

/** Register the demo custom elements (idempotent). */
export function defineComponents(): void {
  if (!customElements.get("fw-rating")) customElements.define("fw-rating", FwRating);
}
