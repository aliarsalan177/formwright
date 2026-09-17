import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas, logEvents } from "../../../ui/story";

type Args = {
  heading: string;
  description: string;
  size: "sm" | "md";
};

const ICON_USERS = `<svg slot="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5-5-6"/></svg>`;
const ICON_SEARCH = `<svg slot="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;
const ICON_RECEIPT = `<svg slot="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>`;

const meta: Meta<Args> = {
  title: "UI/Display/Empty state",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'What to show where a list, table or page has nothing yet: an icon, a heading, a short explanation and the next action. Each area collapses when empty. `import "@formwright/ui/empty-state";`',
      },
    },
  },
  argTypes: {
    heading: { control: "text" },
    description: { control: "text", description: "Default slot" },
    size: { control: "select", options: ["sm", "md"] },
  },
  args: {
    heading: "No members yet",
    description: "Members you register will appear here.",
    size: "md",
  },
};
export default meta;

type Story = StoryObj<Args>;

export const Playground: Story = {
  render: ({ description, ...rest }) =>
    logEvents(
      canvas(
        `<fw-empty-state ${attrs(rest)}>
          ${ICON_USERS}
          ${description}
          <fw-button slot="actions">Register member</fw-button>
        </fw-empty-state>`,
      ),
      ["click"],
    ),
};

export const WithActions: Story = {
  name: "Icon, heading, description & actions",
  render: () => {
    const host = canvas(
      `<fw-card>
        <fw-empty-state heading="No payments this month">
          ${ICON_RECEIPT}
          Payments recorded at the front desk or online show up here, with receipts in PKR.
          <fw-button slot="actions" data-action="record">Record payment</fw-button>
          <fw-button slot="actions" variant="secondary" data-action="import">Import from CSV</fw-button>
        </fw-empty-state>
      </fw-card>
      <p data-status style="margin:0;color:var(--fw-muted)">No action yet.</p>`,
      { width: "36rem" },
    );
    const status = host.querySelector<HTMLElement>("[data-status]")!;
    for (const button of host.querySelectorAll<HTMLElement>("[data-action]")) {
      button.addEventListener("click", () => {
        status.textContent = `Clicked: ${button.dataset.action ?? ""}`;
      });
    }
    return host;
  },
};

export const Sizes: Story = {
  render: () =>
    canvas(
      `<fw-card>
        <fw-empty-state heading="No trainers assigned">
          ${ICON_USERS}
          Assign a trainer to start booking personal training sessions.
          <fw-button slot="actions" variant="secondary">Assign trainer</fw-button>
        </fw-empty-state>
      </fw-card>
      <fw-card>
        <fw-empty-state size="sm">
          ${ICON_SEARCH}
          <h3 slot="heading">No results for “zumba”</h3>
          Try a different class name or clear the filters.
          <fw-button slot="actions" size="sm" variant="ghost">Clear filters</fw-button>
        </fw-empty-state>
      </fw-card>`,
      {
        note: "<code>md</code> for a whole page or table; <code>sm</code> inside panels and dropdowns. The second slots a real <code>&lt;h3&gt;</code> as its heading.",
        width: "36rem",
      },
    ),
};

export const Minimal: Story = {
  render: () =>
    canvas(`<fw-card><fw-empty-state size="sm">No check-ins today.</fw-empty-state></fw-card>`, {
      note: "Just a description — the icon, heading and actions areas collapse.",
    }),
};
