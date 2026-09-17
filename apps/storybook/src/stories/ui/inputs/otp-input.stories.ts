import type { Meta, StoryObj } from "@storybook/html";
import type { FwOtpInput, OtpType } from "@formwright/ui/otp-input";
import { attrs, canvas, logEvents } from "../../../ui/story";

interface OtpInputArgs {
  label: string;
  help: string;
  error: string;
  size: "sm" | "md" | "lg";
  length: number;
  type: OtpType;
  mask: boolean;
  disabled: boolean;
  required: boolean;
}

const EVENTS = ["input", "change", "fw-complete"];

const meta: Meta<OtpInputArgs> = {
  title: "UI/Inputs/OTP input",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'A one-time code with one box per character; typing advances, pasting or SMS autofill fills every box, and `fw-complete` fires when the code is whole. Use it for verification and backup codes. `import "@formwright/ui/otp-input";`',
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    help: { control: "text" },
    error: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    length: { control: { type: "number", min: 1, max: 12, step: 1 } },
    type: { control: "select", options: ["numeric", "alphanumeric"] },
    mask: { control: "boolean" },
    disabled: { control: "boolean" },
    required: { control: "boolean" },
  },
  args: {
    label: "Verification code",
    help: "We sent a 6-digit code to +92 300 *** **67.",
    error: "",
    size: "md",
    length: 6,
    type: "numeric",
    mask: false,
    disabled: false,
    required: false,
  },
};
export default meta;

type Story = StoryObj<OtpInputArgs>;

export const Playground: Story = {
  render: (args) =>
    logEvents(canvas(`<fw-otp-input name="code" ${attrs({ ...args })}></fw-otp-input>`), EVENTS),
};

export const VerifyOnComplete: Story = {
  name: "Numeric — verify on complete",
  render: () => {
    const host = canvas(
      `<fw-otp-input label="Check-in code" name="checkin" required
          help="Enter the code shown at the front desk. (It is 482913.)"></fw-otp-input>
       <p data-result class="sb-ui-note">Waiting for the code…</p>`,
      {
        note: "<code>fw-complete</code> fires once every box is filled; this story checks the code and sets <code>error</code> when it is wrong.",
      },
    );
    const otp = host.querySelector<FwOtpInput>("fw-otp-input")!;
    const result = host.querySelector<HTMLElement>("[data-result]")!;
    otp.addEventListener("fw-complete", (event) => {
      const { value } = (event as CustomEvent<{ value: string }>).detail;
      const ok = value === "482913";
      otp.error = ok ? null : "That code is not right. Try again.";
      result.textContent = ok ? "Checked in — welcome back, Ayesha." : "Code rejected.";
    });
    otp.addEventListener("input", () => {
      if (otp.error) otp.error = null;
    });
    return logEvents(host, EVENTS);
  },
};

export const AlphanumericMasked: Story = {
  name: "Alphanumeric and masked",
  render: () =>
    logEvents(
      canvas(`
        <fw-otp-input label="Gift voucher" name="voucher" length="8" type="alphanumeric"
            help="Letters and digits, e.g. FIT2026X."></fw-otp-input>
        <fw-otp-input label="Account PIN" name="pin" length="4" mask
            help="Masked: the digits show as dots."></fw-otp-input>
      `),
      EVENTS,
    ),
};

export const SizesAndStates: Story = {
  name: "Sizes and states",
  render: () =>
    canvas(`
      <fw-otp-input size="sm" label="Small" length="4"></fw-otp-input>
      <fw-otp-input size="md" label="Medium" length="4"></fw-otp-input>
      <fw-otp-input size="lg" label="Large" length="4"></fw-otp-input>
      <fw-otp-input label="Disabled" length="4" value="1234" disabled></fw-otp-input>
      <fw-otp-input label="With error" length="4" value="12" error="Enter all 4 digits."></fw-otp-input>
    `),
};
