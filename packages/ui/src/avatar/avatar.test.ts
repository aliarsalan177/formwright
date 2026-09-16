import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trackLeaks, type LeakTracker } from "@formwright/ui-core/testing";
import "./index.js";
import { hueOf, initialsOf, type FwAvatar } from "./avatar.js";
import type { FwAvatarGroup } from "./avatar-group.js";

let leaks: LeakTracker | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  leaks?.restore();
  leaks = null;
});

function mount<T extends Element>(html: string, selector: string): T {
  document.body.innerHTML = html;
  return document.querySelector<T>(selector)!;
}

const part = (el: Element, name: string) =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part~=${name}]`)!;
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("initialsOf / hueOf", () => {
  it("takes the first letters of the first and last word", () => {
    expect(initialsOf("ali arsalan")).toBe("AA");
    expect(initialsOf("  Sara  Binte  Khan ")).toBe("SK");
    expect(initialsOf("Omar")).toBe("O");
    expect(initialsOf("")).toBe("");
    expect(initialsOf("😀 smile")).toBe("😀S");
  });

  it("derives the same hue for the same name", () => {
    expect(hueOf("Ali Arsalan")).toBe(hueOf("ali arsalan "));
    expect(hueOf("Ali Arsalan")).not.toBe(hueOf("Sara Khan"));
    expect(hueOf("x")).toBeGreaterThanOrEqual(0);
    expect(hueOf("x")).toBeLessThan(360);
  });
});

describe("fw-avatar", () => {
  it("shows initials on a colour derived from the name when there is no src", () => {
    const el = mount<FwAvatar>(`<fw-avatar name="Ali Arsalan"></fw-avatar>`, "fw-avatar");
    expect(part(el, "initials").textContent).toBe("AA");
    expect(part(el, "initials").hidden).toBe(false);
    expect(part(el, "image").hidden).toBe(true);
    expect(part(el, "base").style.getPropertyValue("--_hue")).toBe(String(hueOf("Ali Arsalan")));
  });

  it("is one image named by alt, or by name", () => {
    const el = mount<FwAvatar>(`<fw-avatar name="Ali Arsalan"></fw-avatar>`, "fw-avatar");
    const base = part(el, "base");
    expect(base.getAttribute("role")).toBe("img");
    expect(base.getAttribute("aria-label")).toBe("Ali Arsalan");
    expect(part(el, "initials").getAttribute("aria-hidden")).toBe("true");
    el.alt = "Head trainer";
    expect(base.getAttribute("aria-label")).toBe("Head trainer");
  });

  it("is decorative with neither name nor alt, showing a person icon", () => {
    const el = mount<FwAvatar>(`<fw-avatar></fw-avatar>`, "fw-avatar");
    const base = part(el, "base");
    expect(base.hasAttribute("role")).toBe(false);
    expect(base.getAttribute("aria-hidden")).toBe("true");
    expect(el.shadowRoot!.querySelector<HTMLElement>(".fallback")!.hidden).toBe(false);
  });

  it("shows the image, and falls back to initials when it fails", () => {
    const el = mount<FwAvatar>(
      `<fw-avatar src="/a.jpg" name="Sara Khan"></fw-avatar>`,
      "fw-avatar",
    );
    const image = part(el, "image") as HTMLImageElement;
    expect(image.hidden).toBe(false);
    expect(image.getAttribute("src")).toBe("/a.jpg");
    expect(image.alt).toBe("");

    image.dispatchEvent(new Event("error"));
    expect(image.hidden).toBe(true);
    expect(part(el, "initials").textContent).toBe("SK");

    // A new src gets a fresh attempt.
    el.src = "/b.jpg";
    expect(image.hidden).toBe(false);
    expect(image.getAttribute("src")).toBe("/b.jpg");
    image.dispatchEvent(new Event("load"));
    expect(image.hidden).toBe(false);
  });

  it("reflects size, shape and status", () => {
    const el = mount<FwAvatar>(`<fw-avatar size="lg"></fw-avatar>`, "fw-avatar");
    expect(el.size).toBe("lg");
    expect(el.shape).toBe("circle");
    el.shape = "square";
    expect(el.getAttribute("shape")).toBe("square");
    el.status = "busy";
    expect(el.getAttribute("status")).toBe("busy");
  });

  it("shows a status dot with text for screen readers", () => {
    const el = mount<FwAvatar>(`<fw-avatar name="A" status="online"></fw-avatar>`, "fw-avatar");
    const dot = part(el, "status");
    const text = el.shadowRoot!.querySelector<HTMLElement>(".sr-only")!;
    expect(dot.hidden).toBe(false);
    expect(dot.getAttribute("aria-hidden")).toBe("true");
    expect(text.textContent).toBe("Online");
    el.status = null;
    expect(dot.hidden).toBe(true);
    expect(text.hidden).toBe(true);
  });

  it("leaves nothing behind when removed", () => {
    leaks = trackLeaks();
    const el = mount<FwAvatar>(`<fw-avatar src="/a.jpg" name="A B"></fw-avatar>`, "fw-avatar");
    part(el, "image").dispatchEvent(new Event("error"));
    el.status = "away";
    el.remove();
    leaks.assertClean("fw-avatar leaked");
  });
});

describe("fw-avatar-group", () => {
  const group = (n: number, attrs = "") =>
    mount<FwAvatarGroup>(
      `<fw-avatar-group ${attrs}>${Array.from({ length: n }, (_, i) => `<fw-avatar name="P ${i}"></fw-avatar>`).join("")}</fw-avatar-group>`,
      "fw-avatar-group",
    );
  const avatars = () => Array.from(document.querySelectorAll<FwAvatar>("fw-avatar"));

  it("is a named group", () => {
    const el = group(2, `label="Trainers"`);
    expect(el.getAttribute("role")).toBe("group");
    expect(el.getAttribute("aria-label")).toBe("Trainers");
  });

  it("shows the first max avatars and a +N counter", () => {
    const el = group(5, `max="3"`);
    expect(avatars().map((a) => a.hidden)).toEqual([false, false, false, true, true]);
    const overflow = part(el, "overflow");
    expect(overflow.hidden).toBe(false);
    expect(overflow.textContent).toBe("+2");
    expect(overflow.getAttribute("aria-label")).toBe("2 more");
  });

  it("reveals avatars again when max grows or is removed", () => {
    const el = group(4, `max="2"`);
    el.max = 3;
    expect(avatars().filter((a) => a.hidden)).toHaveLength(1);
    el.removeAttribute("max");
    expect(avatars().some((a) => a.hidden)).toBe(false);
    expect(part(el, "overflow").hidden).toBe(true);
  });

  it("does not reveal an avatar the app hid itself", () => {
    const el = group(3, `max="1"`);
    avatars()[2]!.removeAttribute("data-fw-overflow");
    el.max = null;
    expect(avatars()[2]!.hidden).toBe(true);
  });

  it("recounts when avatars are added", async () => {
    const el = group(2, `max="2"`);
    expect(part(el, "overflow").hidden).toBe(true);
    const extra = document.createElement("fw-avatar");
    el.append(extra);
    await tick();
    expect(extra.hidden).toBe(true);
    expect(part(el, "overflow").textContent).toBe("+1");
  });

  it("applies its size and shape to every avatar", () => {
    const el = group(2, `size="sm"`);
    expect(avatars().every((a) => a.getAttribute("size") === "sm")).toBe(true);
    el.shape = "square";
    expect(avatars().every((a) => a.getAttribute("shape") === "square")).toBe(true);
  });

  it("leaves nothing behind when removed", async () => {
    leaks = trackLeaks();
    const el = group(4, `max="2"`);
    el.append(document.createElement("fw-avatar"));
    await tick();
    el.max = 1;
    el.remove();
    leaks.assertClean("fw-avatar-group leaked");
  });
});
