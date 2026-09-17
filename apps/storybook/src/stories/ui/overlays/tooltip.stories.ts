import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas, logEvents } from "../../../ui/story";

const PLACEMENTS = [
  "top",
  "top-start",
  "top-end",
  "right",
  "right-start",
  "right-end",
  "bottom",
  "bottom-start",
  "bottom-end",
  "left",
  "left-start",
  "left-end",
] as const;

type TooltipArgs = {
  content: string;
  placement: (typeof PLACEMENTS)[number];
  delay: number;
  hideDelay: number;
  disabled: boolean;
  open: boolean;
};

const meta: Meta<TooltipArgs> = {
  title: "UI/Overlays/Tooltip",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-tooltip>` shows a short plain-text hint for the element it wraps, on hover after a delay or at once on keyboard focus. Use it to name icon-only buttons; for anything interactive use `<fw-popover>`. `import "@formwright/ui/tooltip";`',
      },
    },
  },
  argTypes: {
    content: { control: "text" },
    placement: { control: "select", options: [...PLACEMENTS] },
    delay: { control: "number" },
    hideDelay: { control: "number" },
    disabled: { control: "boolean" },
    open: { control: "boolean" },
  },
  args: {
    content: "Record a cash payment",
    placement: "top",
    delay: 400,
    hideDelay: 100,
    disabled: false,
    open: false,
  },
};
export default meta;

type Story = StoryObj<TooltipArgs>;

const EVENTS = ["fw-show", "fw-hide"];

const svg = (path: string) =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

const ICONS = {
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  freeze: svg('<path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19"/>'),
  payment: svg('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
};

export const Playground: Story = {
  render: (args) =>
    logEvents(
      canvas(
        `<fw-tooltip ${attrs(args)}>
          <fw-button variant="secondary">Record payment</fw-button>
        </fw-tooltip>`,
        { center: true },
      ),
      EVENTS,
    ),
};

export const Placements: Story = {
  render: () =>
    logEvents(
      canvas(
        `<div class="sb-ui-row" style="justify-content:center;padding:3rem 0">
          ${(["top", "right", "bottom", "left"] as const)
            .map(
              (placement) =>
                `<fw-tooltip placement="${placement}" content="Tooltip on ${placement}">
                  <fw-button variant="secondary">${placement}</fw-button>
                </fw-tooltip>`,
            )
            .join("")}
        </div>`,
        { width: "40rem" },
      ),
      EVENTS,
    ),
};

export const Delay: Story = {
  render: () =>
    logEvents(
      canvas(
        `<div class="sb-ui-row">
          <fw-tooltip delay="0" content="Shows immediately"><fw-button variant="secondary">delay 0</fw-button></fw-tooltip>
          <fw-tooltip content="Default rest of 400 ms"><fw-button variant="secondary">delay 400 (default)</fw-button></fw-tooltip>
          <fw-tooltip delay="1000" hide-delay="600" content="Waits a second, lingers 600 ms">
            <fw-button variant="secondary">delay 1000, hide-delay 600</fw-button>
          </fw-tooltip>
        </div>`,
        { width: "40rem", note: "Keyboard focus ignores the delay and shows the tooltip at once." },
      ),
      EVENTS,
    ),
};

export const IconButtons: Story = {
  name: "On icon buttons",
  render: () =>
    logEvents(
      canvas(
        `<div class="sb-ui-row" role="toolbar" aria-label="Member actions">
          <fw-tooltip content="Edit member"><fw-button variant="ghost" aria-label="Edit member">${ICONS.edit}</fw-button></fw-tooltip>
          <fw-tooltip content="Freeze membership"><fw-button variant="ghost" aria-label="Freeze membership">${ICONS.freeze}</fw-button></fw-tooltip>
          <fw-tooltip content="Record payment (PKR)"><fw-button variant="ghost" aria-label="Record payment">${ICONS.payment}</fw-button></fw-tooltip>
          <fw-tooltip placement="bottom">
            <fw-button variant="ghost" aria-label="Delete member">${ICONS.trash}</fw-button>
            <span slot="content">Delete member <em>(cannot be undone)</em></span>
          </fw-tooltip>
        </div>`,
        {
          note: "The tooltip text is mirrored into <code>aria-description</code> on the button. The last one uses the <code>content</code> slot.",
        },
      ),
      EVENTS,
    ),
};

export const Disabled: Story = {
  render: () =>
    logEvents(
      canvas(
        `<div class="sb-ui-row">
          <fw-tooltip content="Sends a reminder by SMS"><fw-button variant="secondary">Enabled tooltip</fw-button></fw-tooltip>
          <fw-tooltip content="You will not see this" disabled><fw-button variant="secondary">Disabled tooltip</fw-button></fw-tooltip>
        </div>`,
        { note: "<code>disabled</code> suppresses the tooltip; the button itself still works." },
      ),
      EVENTS,
    ),
};
