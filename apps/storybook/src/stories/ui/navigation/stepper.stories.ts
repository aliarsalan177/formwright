import type { Meta, StoryObj } from "@storybook/html";
import type { FwButton } from "@formwright/ui/button";
import type { FwStepper } from "@formwright/ui/stepper";
import { canvas, logEvents } from "../../../ui/story";

interface StepperArgs {
  value: number;
  orientation: "horizontal" | "vertical";
  linear: boolean;
  label: string;
}

const STEPPER_EVENTS = ["change"];

const REGISTRATION = `
  <fw-step label="Details" description="Name and contact"></fw-step>
  <fw-step label="Plan" description="Monthly, quarterly or yearly"></fw-step>
  <fw-step label="Payment" description="PKR, cash or card"></fw-step>
  <fw-step label="Confirm"></fw-step>`;

const meta: Meta<StepperArgs> = {
  title: "UI/Navigation/Stepper",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-stepper>` with `<fw-step>`s shows progress through a sequence of numbered steps, such as a multi-page member registration. Completed steps show a check, and steps can be made clickable.\n\n`import "@formwright/ui/stepper";`',
      },
    },
  },
  argTypes: {
    value: {
      control: { type: "number", min: 0, max: 3, step: 1 },
      description: "Index (0-based) of the current step.",
    },
    orientation: { control: "select", options: ["horizontal", "vertical"] },
    linear: {
      control: "boolean",
      description:
        'When true, users can go back but not jump ahead. Written as `linear="false"` to turn off.',
    },
    label: { control: "text", description: "Accessible name of the step list." },
  },
  args: {
    value: 1,
    orientation: "horizontal",
    linear: true,
    label: "Member registration",
  },
};
export default meta;

type Story = StoryObj<StepperArgs>;

export const Playground: Story = {
  render: ({ value, orientation, linear, label }) =>
    logEvents(
      canvas(
        // `linear` is a JSON attribute defaulting to true, so it is written out explicitly.
        `<fw-stepper value="${value}" orientation="${orientation}" linear="${linear}" label="${label.replace(/"/g, "&quot;")}">${REGISTRATION}</fw-stepper>`,
        { width: "44rem" },
      ),
      STEPPER_EVENTS,
    ),
};

export const Orientations: Story = {
  name: "Horizontal and vertical",
  render: () =>
    logEvents(
      canvas(
        `<fw-stepper value="2" label="Registration (horizontal)">${REGISTRATION}</fw-stepper>
         <fw-stepper value="2" orientation="vertical" label="Registration (vertical)">${REGISTRATION}</fw-stepper>`,
        { width: "44rem", note: "Steps before `value` are complete; click one to go back." },
      ),
      STEPPER_EVENTS,
    ),
};

export const LinearVsNonLinear: Story = {
  name: "Linear vs non-linear",
  render: () =>
    logEvents(
      canvas(
        `<h4 style="margin:0">Linear (default)</h4>
         <fw-stepper value="1" label="Linear registration">${REGISTRATION}</fw-stepper>
         <h4 style="margin:0">Non-linear</h4>
         <fw-stepper value="1" linear="false" label="Non-linear registration">${REGISTRATION}</fw-stepper>`,
        {
          width: "44rem",
          note: 'Linear steppers only let you click back to completed steps; with `linear="false"` every step is a button.',
        },
      ),
      STEPPER_EVENTS,
    ),
};

export const ErrorAndDisabled: Story = {
  name: "Error status + disabled step",
  render: () =>
    logEvents(
      canvas(
        `<fw-stepper value="3" orientation="vertical" label="Trainer onboarding">
          <fw-step label="Profile" description="Photo, bio and specialities"></fw-step>
          <fw-step label="Certifications" status="error" description="CNIC copy is unreadable — upload again"></fw-step>
          <fw-step label="Availability">
            <span slot="description">Mon–Fri, <strong>6:00–14:00</strong></span>
          </fw-step>
          <fw-step label="Payroll" description="Salary PKR 85,000 / month"></fw-step>
          <fw-step label="Go live" disabled description="Unlocks after certification is approved"></fw-step>
        </fw-stepper>`,
        {
          width: "44rem",
          note: '`status="error"` overrides the computed state. The third step uses the `description` slot. Disabled steps are never clickable.',
        },
      ),
      STEPPER_EVENTS,
    ),
};

export const WithButtons: Story = {
  name: "Back / Next buttons",
  render: () => {
    const host = canvas(
      `<fw-stepper value="0" label="Member registration">${REGISTRATION}</fw-stepper>
       <p class="step-body" style="margin:0;padding:1rem;border:1px solid var(--fw-border);border-radius:var(--fw-radius)"></p>
       <div class="sb-ui-row" style="justify-content:space-between">
         <fw-button class="back" variant="secondary">Back</fw-button>
         <fw-button class="next">Next</fw-button>
       </div>`,
      {
        width: "44rem",
        note: "The buttons set `value`; clicking a completed step also works and fires `change`.",
      },
    );
    const stepper = host.querySelector<FwStepper>("fw-stepper")!;
    const body = host.querySelector<HTMLParagraphElement>(".step-body")!;
    const back = host.querySelector<FwButton>(".back")!;
    const next = host.querySelector<FwButton>(".next")!;
    const bodies = [
      "Enter the member's name, phone and emergency contact.",
      "Pick a plan: Monthly PKR 8,000, Quarterly PKR 22,000 or Yearly PKR 80,000.",
      "Collect payment in cash or by card and print a receipt.",
      "Review the details and activate the membership.",
    ];
    const last = bodies.length - 1;

    const sync = () => {
      const value = Number(stepper.getAttribute("value") ?? 0);
      body.textContent = bodies[value] ?? "";
      back.disabled = value === 0;
      next.textContent = value === last ? "Finish" : "Next";
    };
    const go = (value: number) => {
      stepper.value = Math.max(0, Math.min(last, value));
      sync();
    };

    back.addEventListener("click", () => go(stepper.value - 1));
    next.addEventListener("click", () => {
      if (stepper.value === last) body.textContent = "Membership activated for Ali Arsalan.";
      else go(stepper.value + 1);
    });
    stepper.addEventListener("change", sync);
    sync();
    return logEvents(host, STEPPER_EVENTS);
  },
};
