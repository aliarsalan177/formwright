import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas } from "../../../ui/story";

interface BreadcrumbsArgs {
  label: string;
  max: number | undefined;
}

const TRAIL = `
  <fw-breadcrumb-item href="#">Dashboard</fw-breadcrumb-item>
  <fw-breadcrumb-item href="#">Branches</fw-breadcrumb-item>
  <fw-breadcrumb-item href="#">Gulberg</fw-breadcrumb-item>
  <fw-breadcrumb-item href="#">Members</fw-breadcrumb-item>
  <fw-breadcrumb-item href="#">Ali Arsalan</fw-breadcrumb-item>
  <fw-breadcrumb-item current>Payments</fw-breadcrumb-item>`;

const meta: Meta<BreadcrumbsArgs> = {
  title: "UI/Navigation/Breadcrumbs",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "`<fw-breadcrumbs>` with `<fw-breadcrumb-item>`s shows where the current page sits in the app's hierarchy, as a trail of links in a navigation landmark. Use it on nested pages such as a member's payment history.\n\n`import \"@formwright/ui/breadcrumbs\";`",
      },
    },
  },
  argTypes: {
    label: { control: "text", description: "Accessible name of the `<nav>` landmark." },
    max: {
      control: { type: "number", min: 2, step: 1 },
      description: "Collapse the middle of trails longer than this into an ellipsis button.",
    },
  },
  args: {
    label: "Breadcrumb",
    max: undefined,
  },
};
export default meta;

type Story = StoryObj<BreadcrumbsArgs>;

export const Playground: Story = {
  render: (args) =>
    canvas(`<fw-breadcrumbs ${attrs({ ...args })}>${TRAIL}</fw-breadcrumbs>`, { width: "40rem" }),
};

export const CurrentPage: Story = {
  name: "Current page",
  render: () =>
    canvas(
      `<fw-breadcrumbs>
        <fw-breadcrumb-item href="#">Members</fw-breadcrumb-item>
        <fw-breadcrumb-item current>Ali Arsalan</fw-breadcrumb-item>
      </fw-breadcrumbs>
      <fw-breadcrumbs>
        <fw-breadcrumb-item href="#">Trainers</fw-breadcrumb-item>
        <fw-breadcrumb-item href="#">Sana Malik</fw-breadcrumb-item>
        <fw-breadcrumb-item current>Schedule</fw-breadcrumb-item>
      </fw-breadcrumbs>`,
      {
        note: 'The `current` item is plain text marked `aria-current="page"`, even if it has an `href`; no separator is drawn after the last item.',
      },
    ),
};

export const CustomSeparator: Story = {
  name: "Custom separator",
  render: () =>
    canvas(
      `<fw-breadcrumbs>
        <span slot="separator">/</span>
        <fw-breadcrumb-item href="#">Dashboard</fw-breadcrumb-item>
        <fw-breadcrumb-item href="#">Plans</fw-breadcrumb-item>
        <fw-breadcrumb-item current>Gold quarterly</fw-breadcrumb-item>
      </fw-breadcrumbs>
      <fw-breadcrumbs>
        <span slot="separator">·</span>
        <fw-breadcrumb-item href="#">Payments</fw-breadcrumb-item>
        <fw-breadcrumb-item href="#">September 2026</fw-breadcrumb-item>
        <fw-breadcrumb-item current>Receipt #1042</fw-breadcrumb-item>
      </fw-breadcrumbs>`,
      { note: "Whatever goes in the `separator` slot is copied between every item." },
    ),
};

export const CollapsedTrail: Story = {
  name: "Collapsing a long trail (max)",
  render: () =>
    canvas(`<fw-breadcrumbs max="3">${TRAIL}</fw-breadcrumbs>`, {
      width: "40rem",
      note: 'With `max="3"` the first item and the last two stay visible. Press the ellipsis to reveal the rest; focus moves to the first revealed item.',
    }),
};

export const RightToLeft: Story = {
  name: "Right-to-left",
  render: () =>
    canvas(
      `<div dir="rtl" lang="ur">
        <fw-breadcrumbs label="راستہ">
          <fw-breadcrumb-item href="#">ڈیش بورڈ</fw-breadcrumb-item>
          <fw-breadcrumb-item href="#">اراکین</fw-breadcrumb-item>
          <fw-breadcrumb-item href="#">علی ارسلان</fw-breadcrumb-item>
          <fw-breadcrumb-item current>ادائیگیاں</fw-breadcrumb-item>
        </fw-breadcrumbs>
      </div>`,
      { note: "In right-to-left text the default chevron separator is mirrored." },
    ),
};
