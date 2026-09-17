import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas, logEvents } from "../../../ui/story";

type Args = {
  label: string;
  tone: "neutral" | "accent" | "success" | "warning" | "danger";
  size: "sm" | "md";
  removable: boolean;
  disabled: boolean;
};

const TONES = ["neutral", "accent", "success", "warning", "danger"] as const;

const ICON_USER = `<svg slot="prefix" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>`;
const ICON_CLOCK = `<svg slot="prefix" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;

const meta: Meta<Args> = {
  title: "UI/Display/Tag",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'A label the user can act on — an applied filter, a selected member, a keyword — optionally with a remove button that fires a cancelable `fw-remove`. `import "@formwright/ui/tag";`',
      },
    },
  },
  argTypes: {
    label: { control: "text", description: "Tag text (default slot)" },
    tone: { control: "select", options: [...TONES] },
    size: { control: "select", options: ["sm", "md"] },
    removable: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Evening batch",
    tone: "accent",
    size: "md",
    removable: true,
    disabled: false,
  },
};
export default meta;

type Story = StoryObj<Args>;

export const Playground: Story = {
  render: ({ label, ...rest }) =>
    logEvents(
      canvas(`<div class="sb-ui-row"><fw-tag ${attrs(rest)}>${label}</fw-tag></div>`, {
        note: "Removing hides the tag. Re-render the story (change a control) to bring it back.",
      }),
      ["fw-remove"],
    ),
};

export const Tones: Story = {
  render: () =>
    canvas(
      `<div class="sb-ui-row">${TONES.map((tone) => `<fw-tag tone="${tone}">${tone}</fw-tag>`).join("")}</div>
      <div class="sb-ui-row">${TONES.map((tone) => `<fw-tag tone="${tone}" size="sm">${tone}</fw-tag>`).join("")}</div>`,
      { width: "40rem" },
    ),
};

export const RemovableFilters: Story = {
  name: "Removable filters",
  render: () =>
    logEvents(
      canvas(
        `<div class="sb-ui-row">
          <fw-tag removable>Plan: Gold</fw-tag>
          <fw-tag removable>Status: Active</fw-tag>
          <fw-tag removable>Joined: last 30 days</fw-tag>
          <fw-tag removable tone="warning">Dues over PKR 5,000</fw-tag>
        </div>`,
        {
          note: "Each remove button is named “Remove &lt;text&gt;”. Unprevented, the tag hides itself.",
        },
      ),
      ["fw-remove"],
    ),
};

export const PreventRemoval: Story = {
  name: "Preventing removal",
  render: () => {
    const host = canvas(
      `<div class="sb-ui-row">
        <fw-tag removable tone="accent" data-locked>Head trainer</fw-tag>
        <fw-tag removable>Yoga</fw-tag>
        <fw-tag removable>HIIT</fw-tag>
      </div>
      <p data-status style="margin:0;color:var(--fw-muted)">Try removing “Head trainer”.</p>`,
      {
        note: "An app that owns the list calls <code>preventDefault()</code> on <code>fw-remove</code> and decides itself — here the locked tag stays put.",
      },
    );
    const status = host.querySelector<HTMLElement>("[data-status]")!;
    host.addEventListener("fw-remove", (event) => {
      const tag = event.target as HTMLElement;
      if (tag.hasAttribute("data-locked")) {
        event.preventDefault();
        status.textContent = "The head trainer role can't be removed from here.";
      } else {
        status.textContent = `Removed ${tag.textContent?.trim() ?? ""}.`;
      }
    });
    return logEvents(host, ["fw-remove"]);
  },
};

export const PrefixAndDisabled: Story = {
  name: "Prefix icon & disabled",
  render: () =>
    logEvents(
      canvas(
        `<div class="sb-ui-row">
          <fw-tag tone="accent">${ICON_USER}Trainer: Hina Aslam</fw-tag>
          <fw-tag removable>${ICON_CLOCK}6:00 – 7:00 pm</fw-tag>
        </div>
        <div class="sb-ui-row">
          <fw-tag removable disabled>${ICON_USER}Owner</fw-tag>
          <fw-tag size="sm" removable disabled>Locked</fw-tag>
        </div>`,
        { note: "A disabled tag's remove button does nothing and fires no event." },
      ),
      ["fw-remove"],
    ),
};
