import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas, logEvents } from "../../../ui/story";

type Args = {
  message: string;
  tone: "info" | "success" | "warning" | "danger";
  heading: string;
  dismissible: boolean;
};

const meta: Meta<Args> = {
  title: "UI/Display/Alert",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'An inline message about something that happened or needs attention, with a tone icon, optional heading, actions and a dismiss button. `warning` and `danger` interrupt screen readers; `info` and `success` are polite. `import "@formwright/ui/alert";`',
      },
    },
  },
  argTypes: {
    message: { control: "text", description: "Message (default slot)" },
    tone: { control: "select", options: ["info", "success", "warning", "danger"] },
    heading: { control: "text" },
    dismissible: { control: "boolean" },
  },
  args: {
    message: "Valid until 30 June 2026. A receipt has been sent to the member.",
    tone: "success",
    heading: "Membership renewed",
    dismissible: true,
  },
};
export default meta;

type Story = StoryObj<Args>;

export const Playground: Story = {
  render: ({ message, ...rest }) =>
    logEvents(canvas(`<fw-alert ${attrs(rest)}>${message}</fw-alert>`), ["fw-dismiss"]),
};

export const Tones: Story = {
  render: () =>
    canvas(
      `<fw-alert tone="info">Classes on 14 August follow the holiday timetable.</fw-alert>
      <fw-alert tone="success">Payment of PKR 12,000 received from Sara Khan.</fw-alert>
      <fw-alert tone="warning">5 memberships expire this week.</fw-alert>
      <fw-alert tone="danger">The card payment for Omar Farooq was declined.</fw-alert>`,
      { width: "36rem" },
    ),
};

export const WithHeading: Story = {
  name: "With heading",
  render: () =>
    canvas(
      `<fw-alert tone="info" heading="New trainer schedule">Hina Aslam now runs the 7 am HIIT class on weekdays.</fw-alert>
      <fw-alert tone="danger"><strong slot="heading">Fingerprint reader offline</strong>Check-ins are being recorded manually until it reconnects.</fw-alert>`,
      {
        note: "Use the <code>heading</code> attribute for plain text, or slot an element into <code>heading</code>.",
        width: "36rem",
      },
    ),
};

export const Dismissible: Story = {
  render: () => {
    const host = canvas(
      `<fw-alert tone="info" dismissible>Tip: press / to search members.</fw-alert>
      <fw-alert tone="warning" dismissible heading="Unsaved plan changes" data-confirm>
        Dismissing this discards the new Gold plan price.
      </fw-alert>`,
      {
        note: "The first hides itself. The second prevents <code>fw-dismiss</code> the first time and asks you to click again.",
        width: "36rem",
      },
    );
    host.querySelector("[data-confirm]")!.addEventListener("fw-dismiss", (event) => {
      const alert = event.currentTarget as HTMLElement;
      if (alert.dataset.confirm !== "armed") {
        event.preventDefault();
        alert.dataset.confirm = "armed";
        alert.setAttribute("heading", "Click × again to discard");
      }
    });
    return logEvents(host, ["fw-dismiss"]);
  },
};

export const WithActions: Story = {
  name: "Actions slot",
  render: () => {
    const host = canvas(
      `<fw-alert tone="warning" heading="Membership expires in 3 days">
        Ali Arsalan's Gold plan ends on 20 September.
        <fw-button slot="actions" size="sm" data-action="renew">Renew — PKR 12,000</fw-button>
        <fw-button slot="actions" size="sm" variant="secondary" data-action="remind">Send reminder</fw-button>
      </fw-alert>
      <p data-status style="margin:0;color:var(--fw-muted)">No action yet.</p>`,
      { width: "36rem" },
    );
    const status = host.querySelector<HTMLElement>("[data-status]")!;
    for (const button of host.querySelectorAll<HTMLElement>("[data-action]")) {
      button.addEventListener("click", () => {
        status.textContent =
          button.dataset.action === "renew" ? "Opening renewal…" : "Reminder sent by SMS.";
      });
    }
    return host;
  },
};
