import type { Meta, StoryObj } from "@storybook/html";
import type { StoryHost } from "../../helpers/mount";

function playgroundIframe(page: string, title: string): StoryHost {
  const wrap = document.createElement("div") as StoryHost;
  wrap.className = "sb-iframe-wrap";
  const note = document.createElement("p");
  note.style.padding = "12px 16px";
  note.style.margin = "0";
  note.style.fontSize = "13px";
  note.style.color = "var(--muted,#64748b)";
  note.textContent = `${title} — for the full page, run: pnpm --filter @formwright/playground dev (port 5173)`;
  const iframe = document.createElement("iframe");
  iframe.title = title;
  iframe.src = `/playground/${page}`;
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
