import { Form, type FormSchema } from "@formwright/core";
import "@formwright/dom";
import type { StoryHost } from "../helpers/mount";

const SECTIONS = [
  {
    id: "header",
    title: "Header",
    schema: {
      id: "header",
      version: "1.0",
      title: "Header settings",
      fields: [
        { id: "logo", type: "text", label: "Logo text" },
        { id: "accent", type: "color", label: "Accent color" },
        { id: "showSearch", type: "toggle", label: "Show search", labelPosition: "start" as const },
      ],
    } satisfies FormSchema,
  },
  {
    id: "hero",
    title: "Hero",
    schema: {
      id: "hero",
      version: "1.0",
      title: "Hero banner",
      fields: [
        { id: "heading", type: "text", label: "Heading" },
        { id: "subheading", type: "textarea", label: "Subheading" },
        { id: "cta", type: "text", label: "Button label" },
      ],
    } satisfies FormSchema,
  },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/** Mini theme builder — section nav + live theme preview. */
export function mountThemeBuilderMini(): StoryHost {
  const settings: Record<SectionId, Record<string, unknown>> = {
    header: { logo: "Acme Store", accent: "#2563eb", showSearch: true },
    hero: { heading: "Summer collection", subheading: "New arrivals every week.", cta: "Shop now" },
  };

  let currentForm: Form | null = null;
  let active: SectionId = "header";

  const wrap = document.createElement("div") as StoryHost;
  wrap.className = "sb-builder-mini";

  const nav = document.createElement("div");
  nav.className = "sb-builder-nav";
  const panel = document.createElement("div");
  panel.className = "form-host";
  const preview = document.createElement("div");
  preview.className = "builder-preview";

  function renderPreview(): void {
    const h = settings.header;
    const hero = settings.hero;
    preview.innerHTML = `
      <header class="t-header" style="--t-accent:${h.accent ?? "#2563eb"}">
        <strong class="t-logo">${h.logo ?? "Store"}</strong>
        ${h.showSearch ? '<input class="t-search" placeholder="Search…" />' : ""}
      </header>
      <section class="t-hero">
        <h1>${hero.heading ?? "Welcome"}</h1>
        <p>${hero.subheading ?? ""}</p>
        ${hero.cta ? `<button class="t-cta">${hero.cta}</button>` : ""}
      </section>`;
  }

  function openSection(id: SectionId): void {
    active = id;
    currentForm?.destroy();
    panel.replaceChildren();
    const section = SECTIONS.find((s) => s.id === id)!;
    for (const btn of nav.querySelectorAll("button")) {
      btn.classList.toggle("active", btn.dataset.section === id);
    }
    const form = new Form(section.schema, settings[id]);
    form.on("change", () => {
      settings[id] = form.values.peek() as Record<string, unknown>;
      renderPreview();
    });
    form.mount(panel);
    currentForm = form;
    renderPreview();
  }

  for (const s of SECTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.section = s.id;
    btn.textContent = s.title;
    btn.addEventListener("click", () => openSection(s.id));
    nav.append(btn);
  }

  wrap.append(nav, panel, preview);
  openSection("header");

  wrap.__storyDispose = () => currentForm?.destroy();
  return wrap;
}
