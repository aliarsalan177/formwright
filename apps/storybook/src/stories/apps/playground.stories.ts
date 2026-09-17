import type { Meta, StoryObj } from "@storybook/html";
import type { StoryHost } from "../../helpers/mount";
import { playgroundPageUrl } from "../../helpers/playground-url";

function playgroundIframe(page: string, title: string): StoryHost {
  const wrap = document.createElement("div") as StoryHost;
  wrap.className = "sb-iframe-wrap";
  // The playground pages are dark; keep the caption strip on the same surface.
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.background = "var(--bg, #0f1115)";
  const url = playgroundPageUrl(page);
  const note = document.createElement("p");
  note.style.padding = "10px 16px";
  note.style.margin = "0";
  note.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  note.style.fontSize = "12px";
  note.style.lineHeight = "1.5";
  note.style.color = "var(--muted, #9aa3b2)";
  note.style.background = "var(--panel, #171a21)";
  note.style.borderBottom = "1px solid var(--border, #2a2f3a)";
  note.textContent = `${title} — embedded from the live playground pages (also at ${url}).`;
  const iframe = document.createElement("iframe");
  iframe.title = title;
  iframe.src = url;
  iframe.style.display = "block";
  wrap.append(note, iframe);
  return wrap;
}

const meta: Meta = {
  title: "Apps/Playground",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const FormPlayground: Story = {
  name: "Form playground",
  render: () => playgroundIframe("playground.html", "Form playground"),
};

export const Home: Story = {
  name: "Home (intro)",
  render: () => playgroundIframe("index.html", "Formwright home"),
};

export const GridPlayground: Story = {
  name: "Grid playground",
  render: () => playgroundIframe("grid.html", "Grid playground"),
};

export const ForgeFull: Story = {
  name: "Forge (full page)",
  render: () => playgroundIframe("forge.html", "Forge"),
};

export const BuilderFull: Story = {
  name: "Theme builder (full page)",
  render: () => playgroundIframe("builder.html", "Theme builder"),
};

export const SettingsFull: Story = {
  name: "Settings builder (full page)",
  render: () => playgroundIframe("settings.html", "Settings builder"),
};
