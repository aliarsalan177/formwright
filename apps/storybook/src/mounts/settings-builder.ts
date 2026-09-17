import { Form, type FormSchema } from "@formwright/core";
import "@formwright/dom";
import type { StoryHost } from "../helpers/mount";

type SectionId = "general" | "notifications";

const SECTIONS: readonly { id: SectionId; title: string; icon: string; schema: FormSchema }[] = [
  {
    id: "general",
    title: "General",
    icon: "⚙️",
    schema: {
      id: "general",
      version: "1.0",
      title: "General",
      fields: [
        { id: "appName", type: "text", label: "Application name" },
        {
          id: "language",
          type: "select",
          label: "Language",
          options: [
            { label: "English", value: "en" },
            { label: "Français", value: "fr" },
          ],
        },
        {
          id: "beta",
          type: "toggle",
          label: "Enable beta features",
          description: "Get early access to features still in development.",
          labelPosition: "start",
        },
      ],
    },
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: "🔔",
    schema: {
      id: "notifications",
      version: "1.0",
      title: "Notifications",
      fields: [
        { id: "email", type: "toggle", label: "Email alerts", labelPosition: "start" },
        { id: "push", type: "toggle", label: "Push notifications", labelPosition: "start" },
      ],
    },
  },
];

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Mini iOS-style settings builder. */
export function mountSettingsBuilderMini(): StoryHost {
  let currentForm: Form | null = null;
  let instantApply = true;
  let section: SectionId = "general";
  const values: Record<SectionId, Record<string, unknown>> = {
    general: { appName: "Formwright", language: "en", beta: false },
    notifications: { email: true, push: false },
  };

  const wrap = el("div", "settings-mini") as StoryHost;
  const layout = el("div", "settings");

  const rail = el("aside", "settings-rail");
  const nav = el("div", "settings-nav");
  rail.append(el("div", "settings-search", "Settings"), nav);

  const detail = el("section", "settings-detail");
  const head = el("div", "settings-head");
  const panel = el("div", "form-host");
  detail.append(head, panel);

  const side = el("aside", "settings-side");
  const log = el("pre", "result");
  side.append(el("h2", "", "Save activity"), log);

  function render(): void {
    currentForm?.destroy();
    panel.replaceChildren();
    head.replaceChildren();

    const current = SECTIONS.find((s) => s.id === section)!;
    for (const b of nav.querySelectorAll("button")) {
      b.classList.toggle("active", b.dataset.section === section);
    }

    const bar = el("div", "settings-navbar");
    const seg = el("div", "settings-seg");
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", "Save mode");
    for (const [label, instant] of [
      ["Instant", true],
      ["Save", false],
    ] as const) {
      const b = el(
        "button",
        "settings-seg-opt" + (instantApply === instant ? " is-on" : ""),
        label,
      );
      b.type = "button";
      b.setAttribute("aria-pressed", String(instantApply === instant));
      b.addEventListener("click", () => {
        instantApply = instant;
        render();
      });
      seg.append(b);
    }
    bar.append(el("div", "settings-navbar-lead"), el("h2", "settings-title", current.title), seg);
    head.append(bar);

    const form = new Form({ ...current.schema, actions: [], summary: false }, values[section], {
      dom: { customStyles: true },
    });
    const id = section;
    form.on("change", (p) => {
      const { id: field, value } = p as { id: string; value: unknown };
      values[id] = form.values.peek() as Record<string, unknown>;
      log.textContent = instantApply
        ? `PATCH /api/settings/${id}/${field}\n${JSON.stringify(value, null, 2)}`
        : JSON.stringify(values[id], null, 2);
    });
    form.mount(panel);
    currentForm = form;
    log.textContent = JSON.stringify(values[section], null, 2);

    if (instantApply) {
      panel.append(el("p", "settings-instant-note", "Changes apply instantly."));
    } else {
      const save = el("button", "settings-saveall", "Save all");
      save.type = "button";
      save.addEventListener("click", () => {
        log.textContent = `PUT /api/settings/${id}\n${JSON.stringify(values[id], null, 2)}`;
      });
      panel.append(save);
    }
  }

  for (const s of SECTIONS) {
    const btn = el("button", "");
    btn.type = "button";
    btn.dataset.section = s.id;
    const ico = el("span", "s-ico", s.icon);
    ico.setAttribute("aria-hidden", "true");
    const chev = el("span", "s-chev", "›");
    chev.setAttribute("aria-hidden", "true");
    btn.append(ico, el("span", "", s.title), chev);
    btn.addEventListener("click", () => {
      section = s.id;
      render();
    });
    nav.append(btn);
  }

  layout.append(rail, detail, side);
  wrap.append(layout);
  render();

  wrap.__storyDispose = () => currentForm?.destroy();
  return wrap;
}
