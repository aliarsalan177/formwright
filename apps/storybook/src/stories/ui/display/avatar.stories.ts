import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas } from "../../../ui/story";

type Args = {
  name: string;
  src: string;
  alt: string;
  size: "xs" | "sm" | "md" | "lg" | "xl";
  shape: "circle" | "square";
  status: "" | "online" | "away" | "busy" | "offline";
};

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

/** A tiny inline SVG "photo", so the story works offline. */
const PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0ea5e9"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="80" height="80" fill="url(#g)"/><circle cx="40" cy="31" r="14" fill="#fde68a"/><path d="M14 80c2-16 13-24 26-24s24 8 26 24z" fill="#1e293b"/></svg>`,
  );

const meta: Meta<Args> = {
  title: "UI/Display/Avatar",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'A person\'s picture that falls back to initials (on a colour derived from the name) or a generic icon, plus `fw-avatar-group` for overlapping stacks with a “+N”. `import "@formwright/ui/avatar";`',
      },
    },
  },
  argTypes: {
    name: { control: "text" },
    src: { control: "text", description: "Image URL; leave empty for initials" },
    alt: { control: "text", description: "Accessible name; defaults to name" },
    size: { control: "select", options: [...SIZES] },
    shape: { control: "select", options: ["circle", "square"] },
    status: { control: "select", options: ["", "online", "away", "busy", "offline"] },
  },
  args: {
    name: "Ali Arsalan",
    src: "",
    alt: "",
    size: "lg",
    shape: "circle",
    status: "online",
  },
};
export default meta;

type Story = StoryObj<Args>;

export const Playground: Story = {
  render: (args) => canvas(`<div class="sb-ui-row"><fw-avatar ${attrs(args)}></fw-avatar></div>`),
};

export const Fallbacks: Story = {
  name: "Image, initials & fallbacks",
  render: () =>
    canvas(
      `<div class="sb-ui-row">
        <fw-avatar size="lg" src="${PHOTO}" name="Sara Khan"></fw-avatar>
        <fw-avatar size="lg" name="Omar Farooq"></fw-avatar>
        <fw-avatar size="lg" name="Hina Aslam"></fw-avatar>
        <fw-avatar size="lg" src="/does-not-exist/photo.jpg" name="Bilal Ahmed"></fw-avatar>
        <fw-avatar size="lg"></fw-avatar>
      </div>`,
      {
        note: "Left to right: a loaded image; initials from <code>name</code> (same name, same colour); a broken <code>src</code> falling back to initials; no name at all (decorative person icon).",
        width: "36rem",
      },
    ),
};

export const SizesAndShapes: Story = {
  name: "Sizes & shapes",
  render: () =>
    canvas(
      `<div class="sb-ui-row">${SIZES.map((size) => `<fw-avatar size="${size}" name="Zainab Ali"></fw-avatar>`).join("")}</div>
      <div class="sb-ui-row">${SIZES.map((size) => `<fw-avatar size="${size}" shape="square" name="Iron Temple Gym"></fw-avatar>`).join("")}</div>`,
    ),
};

export const Status: Story = {
  render: () =>
    canvas(
      `<div class="sb-ui-row">
        <fw-avatar size="lg" name="Ali Arsalan" status="online"></fw-avatar>
        <fw-avatar size="lg" name="Sara Khan" status="away"></fw-avatar>
        <fw-avatar size="lg" name="Omar Farooq" status="busy"></fw-avatar>
        <fw-avatar size="lg" name="Hina Aslam" status="offline"></fw-avatar>
        <fw-avatar size="lg" shape="square" src="${PHOTO}" name="Front desk" status="online"></fw-avatar>
      </div>`,
      { note: "Each status adds a dot and a visually hidden word (“Online”) for screen readers." },
    ),
};

export const Group: Story = {
  name: "Avatar group with max",
  render: () =>
    canvas(
      `<div class="sb-ui-row" style="justify-content:space-between">
        <span>Trainers on shift</span>
        <fw-avatar-group label="Trainers on shift" max="3" size="sm">
          <fw-avatar name="Ali Arsalan"></fw-avatar>
          <fw-avatar name="Sara Khan" src="${PHOTO}"></fw-avatar>
          <fw-avatar name="Omar Farooq"></fw-avatar>
          <fw-avatar name="Hina Aslam"></fw-avatar>
          <fw-avatar name="Bilal Ahmed"></fw-avatar>
        </fw-avatar-group>
      </div>
      <div class="sb-ui-row" style="justify-content:space-between">
        <span>Morning HIIT class</span>
        <fw-avatar-group label="Morning HIIT attendees" max="4" size="md" shape="square">
          <fw-avatar name="Zainab Ali"></fw-avatar>
          <fw-avatar name="Usman Tariq"></fw-avatar>
          <fw-avatar name="Ayesha Noor"></fw-avatar>
          <fw-avatar name="Fahad Mirza"></fw-avatar>
          <fw-avatar name="Mariam Shah"></fw-avatar>
          <fw-avatar name="Hamza Qureshi"></fw-avatar>
          <fw-avatar name="Sana Javed"></fw-avatar>
        </fw-avatar-group>
      </div>
      <div class="sb-ui-row" style="justify-content:space-between">
        <span>No max</span>
        <fw-avatar-group label="Managers" size="lg">
          <fw-avatar name="Ali Arsalan"></fw-avatar>
          <fw-avatar name="Sara Khan"></fw-avatar>
        </fw-avatar-group>
      </div>`,
      {
        note: "<code>size</code> and <code>shape</code> on the group apply to every avatar; <code>max</code> collapses the rest into “+N”.",
      },
    ),
};
