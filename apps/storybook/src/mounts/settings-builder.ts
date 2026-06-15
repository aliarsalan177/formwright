import { Form, type FormSchema } from "@formwright/core";
import "@formwright/dom";
import type { StoryHost } from "../helpers/mount";

const GENERAL: FormSchema = {
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
      labelPosition: "start",
    },
  ],
};

const NOTIFICATIONS: FormSchema = {
  id: "notifications",
  version: "1.0",
  title: "Notifications",
  fields: [
    { id: "email", type: "toggle", label: "Email alerts", labelPosition: "start" },
    { id: "push", type: "toggle", label: "Push notifications", labelPosition: "start" },
  ],
};

/** Mini iOS-style settings builder. */
export function mountSettingsBuilderMini(): StoryHost {
  let currentForm: Form | null = null;
  let instantApply = true;
  let section: "general" | "notifications" = "general";
  const values: Record<string, Record<string, unknown>> = {
    general: { appName: "Formwright", language: "en", beta: false },
    notifications: { email: true, push: false },
  };

  const wrap = document.createElement("div") as StoryHost;
  wrap.className = "sb-settings-mini";

  const sidebar = document.createElement("div");
  sidebar.className = "sb-settings-sidebar";
  const main = document.createElement("div");
  const head = document.createElement("div");
  head.className = "settings-head";
  const panel = document.createElement("div");
  panel.className = "form-host settings-panel";
  const log = document.createElement("pre");
  log.className = "settings-log";
  log.style.fontSize = "11px";
  log.style.padding = "8px";
  main.append(head, panel, log);

  function render(): void {
    currentForm?.destroy();
    panel.replaceChildren();
    head.replaceChildren();

    const title = document.createElement("h2");
    title.className = "settings-title";
    title.textContent = section === "general" ? "General" : "Notifications";
    head.append(title);

    const seg = document.createElement("div");
    seg.className = "settings-seg";
    for (const [label, instant] of [
      ["Instant", true],
      ["Save", false],
    ] as const) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "settings-seg-opt" + (instantApply === instant ? " is-on" : "");
      b.textContent = label;
      b.addEventListener("click", () => {
        instantApply = instant;
        render();
      });
      seg.append(b);
    }
    head.append(seg);

    const schema = section === "general" ? GENERAL : NOTIFICATIONS;
    const form = new Form({ ...schema, actions: [] }, values[section]);
    form.on("change", (p) => {
      const { id, value } = p as { id: string; value: unknown };
      values[section] = form.values.peek() as Record<string, unknown>;
      log.textContent = JSON.stringify(values[section], null, 2);
      if (instantApply) {
        log.textContent = `PATCH /api/settings/${section}/${id}\n${JSON.stringify(value, null, 2)}`;
      }
    });
    form.mount(panel);
    currentForm = form;
    log.textContent = JSON.stringify(values[section], null, 2);

    if (!instantApply) {
      const save = document.createElement("button");
      save.type = "button";
      save.className = "settings-saveall";
      save.textContent = "Save all";
      save.addEventListener("click", () => void form.submit());
      panel.append(save);
    }
  }

  for (const [id, label] of [
    ["general", "General"],
    ["notifications", "Notifications"],
  ] as const) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.addEventListener("click", () => {
      section = id;
      for (const b of sidebar.querySelectorAll("button")) {
        b.classList.toggle("active", b === btn);
      }
      render();
    });
    if (id === "general") btn.classList.add("active");
    sidebar.append(btn);
  }

  wrap.append(sidebar, main);
  render();

  wrap.__storyDispose = () => currentForm?.destroy();
  return wrap;
}
