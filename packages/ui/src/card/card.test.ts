import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import type { FwCard } from "./card.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount(html: string): FwCard {
  document.body.innerHTML = html;
  return document.querySelector("fw-card")!;
}

const part = (el: FwCard, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part~=${name}]`)!;
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("fw-card", () => {
  it("renders every area that has content and hides the rest", () => {
    const el = mount(`<fw-card><h3 slot="header">Gold</h3>Body text</fw-card>`);
    expect(part(el, "header").hidden).toBe(false);
    expect(part(el, "body").querySelector("slot:not([name])")).not.toBeNull();
    expect(part(el, "media").hidden).toBe(true);
    expect(part(el, "footer").hidden).toBe(true);
    expect(part(el, "actions").hidden).toBe(true);
  });

  it("shows areas as content arrives", async () => {
    const el = mount(`<fw-card>Body</fw-card>`);
    const footer = document.createElement("span");
    footer.slot = "footer";
    footer.textContent = "PKR 12,000";
    el.append(footer);
    await tick();
    expect(part(el, "footer").hidden).toBe(false);
  });

  it("keeps variant and padding in step with their attributes", () => {
    const el = mount(`<fw-card variant="elevated">x</fw-card>`);
    expect(el.variant).toBe("elevated");
    expect(el.padding).toBe("md");
    el.variant = "ghost";
    expect(el.getAttribute("variant")).toBe("ghost");
    el.padding = "none";
    expect(el.getAttribute("padding")).toBe("none");
  });

  it("is not a link without href", () => {
    const el = mount(`<fw-card>x</fw-card>`);
    expect(part(el, "main").tagName).toBe("DIV");
    expect(el.hasAttribute("data-linked")).toBe(false);
  });

  it("becomes a real link around header and body, keeping actions outside", () => {
    const el = mount(
      `<fw-card href="/members/42"><b slot="header">Ali</b>Expires soon<button slot="actions">Renew</button></fw-card>`,
    );
    const link = part(el, "main") as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/members/42");
    expect(link.contains(part(el, "header"))).toBe(true);
    expect(link.contains(part(el, "body"))).toBe(true);
    expect(link.contains(part(el, "actions"))).toBe(false);
    expect(link.contains(part(el, "footer"))).toBe(false);
    expect(el.hasAttribute("data-linked")).toBe(true);

    el.href = null;
    expect(part(el, "main").tagName).toBe("DIV");
    expect(part(el, "main").contains(part(el, "header"))).toBe(true);
  });

  it("lets a button in actions handle its own click without following the link", () => {
    const el = mount(`<fw-card href="/x">Body<button slot="actions">Renew</button></fw-card>`);
    const linkClick = vi.fn();
    part(el, "main").addEventListener("click", linkClick);
    const onRenew = vi.fn();
    const button = el.querySelector("button")!;
    button.addEventListener("click", onRenew);
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    expect(onRenew).toHaveBeenCalledTimes(1);
    expect(linkClick).not.toHaveBeenCalled();
  });

  it("protects a new tab from window.opener by default", () => {
    const el = mount(`<fw-card href="https://example.com" target="_blank">x</fw-card>`);
    const link = part(el, "main") as HTMLAnchorElement;
    expect(link.target).toBe("_blank");
    expect(link.rel).toBe("noopener noreferrer");
  });

  it("focuses the link", () => {
    const el = mount(`<fw-card href="/x">x</fw-card>`);
    el.focus();
    expect(el.shadowRoot!.activeElement).toBe(part(el, "main"));
  });

  it("leaves nothing behind when removed", async () => {
    leaks = trackLeaks();
    const el = mount(`<fw-card href="/x">Body</fw-card>`);
    el.href = null;
    const actions = document.createElement("button");
    actions.slot = "actions";
    el.append(actions);
    await tick();
    el.href = "/y";
    el.remove();
    leaks.assertClean("fw-card leaked");
  });
});
