import type { Meta, StoryObj } from "@storybook/html";
import type { FwPopover } from "@formwright/ui/popover";
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

type PopoverArgs = {
  trigger: "click" | "hover" | "focus" | "manual";
  placement: (typeof PLACEMENTS)[number];
  arrow: boolean;
  offset: number;
  label: string;
  open: boolean;
};

const meta: Meta<PopoverArgs> = {
  title: "UI/Overlays/Popover",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-popover>` anchors rich, interactive content (text, buttons, a small form) to a trigger, opening on click, hover or focus. Use `<fw-tooltip>` for plain hints and `<fw-dialog>` when the task needs the whole screen. `import "@formwright/ui/popover";`',
      },
    },
  },
  argTypes: {
    trigger: { control: "select", options: ["click", "hover", "focus", "manual"] },
    placement: { control: "select", options: [...PLACEMENTS] },
    arrow: { control: "boolean" },
    offset: { control: "number" },
    label: { control: "text" },
    open: { control: "boolean" },
  },
  args: {
    trigger: "click",
    placement: "bottom",
    arrow: true,
    offset: 8,
    label: "Plan details",
    open: false,
  },
};
export default meta;

type Story = StoryObj<PopoverArgs>;

const EVENTS = ["fw-show", "fw-hide"];

export const Playground: Story = {
  render: (args) =>
    logEvents(
      canvas(
        `<fw-popover ${attrs(args)}>
          <fw-button slot="trigger" variant="secondary">Gold plan</fw-button>
          <p style="margin:0 0 .5rem"><strong>Gold plan</strong> · PKR 12,000 / month</p>
          <p style="margin:0">Gym floor, group classes and 4 personal training sessions.</p>
        </fw-popover>`,
        {
          center: true,
          note: 'With <code>trigger="manual"</code> only the <code>open</code> control opens it.',
        },
      ),
      EVENTS,
    ),
};

export const TriggerModes: Story = {
  name: "Trigger modes",
  render: () =>
    logEvents(
      canvas(
        `<div class="sb-ui-row">
          <fw-popover trigger="click" arrow label="Member summary">
            <fw-button slot="trigger" variant="secondary">Click: Ayesha Khan</fw-button>
            <p style="margin:0">Silver plan · renews 3 Oct · last check-in today 07:12</p>
          </fw-popover>
          <fw-popover trigger="hover" arrow label="Trainer">
            <span slot="trigger" tabindex="0" style="text-decoration:underline dotted;cursor:help">Hover: Coach Usman</span>
            <p style="margin:0">Strength &amp; conditioning · Mon/Wed/Fri mornings</p>
          </fw-popover>
          <fw-popover trigger="focus" placement="right" arrow label="Member ID format">
            <fw-input slot="trigger" label="Focus: Member ID" placeholder="GMS-00421"></fw-input>
            <p style="margin:0">IDs start with <code>GMS-</code> followed by five digits.</p>
          </fw-popover>
        </div>`,
        {
          width: "44rem",
          note: "Click toggles, hover opens after a short rest, focus follows keyboard or pointer focus.",
        },
      ),
      EVENTS,
    ),
};

export const Placements: Story = {
  render: () =>
    logEvents(
      canvas(
        `<div class="sb-ui-row" style="justify-content:center;padding:6rem 0">
          ${(["top", "right", "bottom", "left"] as const)
            .map(
              (placement) => `<fw-popover placement="${placement}" arrow label="${placement}">
                <fw-button slot="trigger" variant="secondary">${placement}</fw-button>
                <p style="margin:0">Opens ${placement}, flips if there is no room.</p>
              </fw-popover>`,
            )
            .join("")}
        </div>`,
        { width: "44rem" },
      ),
      EVENTS,
    ),
};

export const WithForm: Story = {
  name: "Form inside a popover",
  render: () => {
    const host = canvas(
      `<fw-popover placement="bottom-start" arrow label="Freeze membership">
        <fw-button slot="trigger">Freeze membership</fw-button>
        <form style="display:grid;gap:.75rem;width:18rem">
          <fw-input type="date" name="until" label="Freeze until" required></fw-input>
          <fw-textarea name="reason" label="Reason" rows="2" placeholder="Travelling for work"></fw-textarea>
          <div class="sb-ui-row" style="justify-content:flex-end">
            <fw-button type="button" variant="ghost" size="sm" data-cancel>Cancel</fw-button>
            <fw-button type="submit" size="sm">Freeze</fw-button>
          </div>
        </form>
      </fw-popover>
      <pre class="sb-ui-log" data-output>Submit the form to see its FormData.</pre>`,
      {
        note: "Focus moves to the first field when it opens by click, and back to the trigger when it closes.",
      },
    );
    const popover = host.querySelector<FwPopover>("fw-popover")!;
    const form = host.querySelector("form")!;
    const output = host.querySelector<HTMLElement>("[data-output]")!;
    host.querySelector("[data-cancel]")!.addEventListener("click", () => popover.hide());
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      output.textContent = JSON.stringify(Object.fromEntries(new FormData(form)), null, 2);
      popover.hide();
    });
    return logEvents(host, EVENTS);
  },
};
