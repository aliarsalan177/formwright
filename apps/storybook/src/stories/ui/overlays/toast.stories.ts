import type { Meta, StoryObj } from "@storybook/html";
import {
  showToast,
  type ToastHandle,
  type ToastPlacement,
  type ToastTone,
} from "@formwright/ui/toast";
import { attrs, canvas, logEvents, type StoryHost } from "../../../ui/story";

const PLACEMENTS: ToastPlacement[] = [
  "top-start",
  "top-center",
  "top-end",
  "bottom-start",
  "bottom-center",
  "bottom-end",
];
const TONES: ToastTone[] = ["info", "success", "warning", "danger"];

type ToastArgs = {
  message: string;
  heading: string;
  tone: ToastTone;
  duration: number;
  dismissible: boolean;
  placement: ToastPlacement;
  withAction: boolean;
};

const meta: Meta<ToastArgs> = {
  title: "UI/Overlays/Toast",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-toast>` is a short, self-dismissing notification that stacks in a `<fw-toast-region>` (a polite live region). Usually created with `showToast({ message, heading, tone, duration, action, placement })`; toasts stay clickable above open dialogs. `import { showToast } from "@formwright/ui/toast";`',
      },
    },
  },
  argTypes: {
    message: { control: "text" },
    heading: { control: "text" },
    tone: { control: "select", options: TONES },
    duration: { control: "number", description: "ms before it dismisses itself; 0 keeps it." },
    dismissible: { control: "boolean", description: "Inline toast only." },
    placement: {
      control: "select",
      options: PLACEMENTS,
      description: "Region used by showToast().",
    },
    withAction: { control: "boolean", description: "Adds an Undo action." },
  },
  args: {
    message: "Sara Khan's membership is active until 12 March.",
    heading: "Payment recorded",
    tone: "success",
    duration: 5000,
    dismissible: true,
    placement: "bottom-end",
    withAction: true,
  },
};
export default meta;

type Story = StoryObj<ToastArgs>;

/** Remember every toast a story shows, and dismiss them when the story unmounts. */
function tracked(host: StoryHost): (handle: ToastHandle) => void {
  const handles: ToastHandle[] = [];
  host.__storyDispose = () => handles.forEach((handle) => handle.dismiss());
  return (handle) => void handles.push(handle);
}

/** Write a line into the story's own log, so action callbacks are visible. */
function note(host: HTMLElement, text: string): void {
  const out = host.querySelector<HTMLElement>("[data-output]");
  if (out) out.textContent = text;
}

export const Playground: Story = {
  render: ({ placement, withAction, dismissible, message, ...toast }) => {
    const host = canvas(
      `<fw-button data-show>Show with showToast()</fw-button>
      <p style="margin:0">Inline preview of the same toast (static region):</p>
      <fw-toast-region style="position:static;padding:0;align-items:stretch">
        <fw-toast ${attrs({ ...toast, dismissible: dismissible ? undefined : "false" })}>
          ${withAction ? '<button slot="action">Undo</button>' : ""}
        </fw-toast>
      </fw-toast-region>
      <pre class="sb-ui-log" data-output>Actions will appear here.</pre>`,
    );
    // The message comes from a control, so it goes in as text, not markup.
    host.querySelector("fw-toast")!.prepend(message);
    const track = tracked(host);
    host.querySelector("[data-show]")!.addEventListener("click", () => {
      track(
        showToast({
          message,
          tone: toast.tone,
          duration: toast.duration,
          placement,
          ...(toast.heading ? { heading: toast.heading } : {}),
          ...(withAction
            ? { action: { label: "Undo", onClick: () => note(host, "Undo clicked.") } }
            : {}),
        }),
      );
    });
    return logEvents(host, ["fw-dismiss"]);
  },
};

export const Tones: Story = {
  render: () => {
    const messages: Record<ToastTone, string> = {
      info: "Gym closes at 8 pm on Friday for maintenance.",
      success: "Bilal Ahmed checked in at 07:12.",
      warning: "3 memberships expire this week.",
      danger: "Card payment of PKR 12,000 was declined.",
    };
    const host = canvas(
      `<div class="sb-ui-row">
        ${TONES.map((tone) => `<fw-button variant="secondary" data-tone="${tone}">${tone}</fw-button>`).join("")}
      </div>`,
      {
        note: '<code>danger</code> toasts use <code>role="alert"</code> and interrupt the screen reader.',
      },
    );
    const track = tracked(host);
    for (const button of host.querySelectorAll<HTMLElement>("[data-tone]")) {
      const tone = button.dataset.tone as ToastTone;
      button.addEventListener("click", () => track(showToast({ tone, message: messages[tone] })));
    }
    return host;
  },
};

export const HeadingActionAndPersistent: Story = {
  name: "Heading, action and persistent",
  render: () => {
    const host = canvas(
      `<div class="sb-ui-row">
        <fw-button variant="secondary" data-heading>With heading</fw-button>
        <fw-button variant="secondary" data-action>With Undo action</fw-button>
        <fw-button variant="secondary" data-persistent>Persistent (duration 0)</fw-button>
        <fw-button variant="ghost" data-clear>Dismiss all</fw-button>
      </div>
      <pre class="sb-ui-log" data-output>Actions will appear here.</pre>`,
      { note: "The countdown pauses while the pointer is over a toast or focus is inside it." },
    );
    const handles: ToastHandle[] = [];
    host.__storyDispose = () => handles.forEach((handle) => handle.dismiss());
    const on = (selector: string, run: () => ToastHandle) =>
      host.querySelector(selector)!.addEventListener("click", () => handles.push(run()));
    on("[data-heading]", () =>
      showToast({
        tone: "success",
        heading: "Plan upgraded",
        message: "Ayesha Khan moved to Platinum (PKR 20,000).",
      }),
    );
    on("[data-action]", () =>
      showToast({
        tone: "info",
        message: "Hamza Siddiqui was archived.",
        action: {
          label: "Undo",
          onClick: () => {
            note(host, "Undo clicked: Hamza Siddiqui restored.");
            handles.push(
              showToast({ tone: "success", message: "Hamza Siddiqui restored.", duration: 3000 }),
            );
          },
        },
      }),
    );
    on("[data-persistent]", () =>
      showToast({
        tone: "warning",
        heading: "Sync paused",
        message: "The biometric device is offline. Check-ins are queued.",
        duration: 0,
      }),
    );
    host.querySelector("[data-clear]")!.addEventListener("click", () => {
      handles.splice(0).forEach((handle) => handle.dismiss());
    });
    return host;
  },
};

export const Placements: Story = {
  render: () => {
    const host = canvas(
      `<div class="sb-ui-row">
        ${PLACEMENTS.map((p) => `<fw-button variant="secondary" data-placement="${p}">${p}</fw-button>`).join("")}
      </div>`,
      {
        width: "40rem",
        note: "<code>showToast()</code> reuses or creates one <code>&lt;fw-toast-region&gt;</code> per placement.",
      },
    );
    const track = tracked(host);
    for (const button of host.querySelectorAll<HTMLElement>("[data-placement]")) {
      const placement = button.dataset.placement as ToastPlacement;
      button.addEventListener("click", () =>
        track(showToast({ placement, message: `Toast at ${placement}.`, duration: 3000 })),
      );
    }
    return host;
  },
};

export const StaticRegion: Story = {
  name: "Static region with inline toasts",
  render: () =>
    logEvents(
      canvas(
        `<fw-toast-region style="position:static;padding:0;align-items:stretch">
          <fw-toast tone="info" duration="0">Morning yoga moved to Studio B.</fw-toast>
          <fw-toast tone="success" heading="Payment recorded" duration="0">
            PKR 8,500 received from Bilal Ahmed.
            <button slot="action">Receipt</button>
          </fw-toast>
          <fw-toast tone="warning" duration="0" dismissible="false">Locker 14 key not returned.</fw-toast>
          <fw-toast tone="danger" heading="Device offline" duration="0">Front desk fingerprint reader is not responding.</fw-toast>
        </fw-toast-region>`,
        {
          note: 'Authored in markup with <code>duration="0"</code>; the region is made static here only so it sits in the page instead of a corner. The warning is <code>dismissible="false"</code>.',
        },
      ),
      ["fw-dismiss"],
    ),
};
