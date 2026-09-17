import type { Meta, StoryObj } from "@storybook/html";
import type { FwDrawer } from "@formwright/ui/drawer";
import { attrs, canvas, logEvents } from "../../../ui/story";

type DrawerArgs = {
  heading: string;
  placement: "start" | "end" | "top" | "bottom";
  size: string;
  dismissible: boolean;
  noHeader: boolean;
  open: boolean;
};

const meta: Meta<DrawerArgs> = {
  title: "UI/Overlays/Drawer",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-drawer>` is a modal panel that slides in from an edge — filters, details and quick edits that keep the page in context. Same contract as `<fw-dialog>` (focus, scroll lock, cancelable `fw-request-close`), anchored to `start`, `end`, `top` or `bottom`. `import "@formwright/ui/drawer";`',
      },
    },
  },
  argTypes: {
    heading: { control: "text" },
    placement: { control: "select", options: ["start", "end", "top", "bottom"] },
    size: {
      control: "text",
      description: "Any CSS length: width for start/end, height for top/bottom.",
    },
    dismissible: { control: "boolean" },
    noHeader: { control: "boolean" },
    open: { control: "boolean" },
  },
  args: {
    heading: "Member details",
    placement: "end",
    size: "",
    dismissible: true,
    noHeader: false,
    open: false,
  },
};
export default meta;

type Story = StoryObj<DrawerArgs>;

const EVENTS = ["fw-show", "fw-after-show", "fw-request-close", "fw-hide", "fw-after-hide"];

/** `[data-open="x"]` buttons open `fw-drawer[data-drawer="x"]`; `[data-close]` inside a drawer asks it to close. */
function wire(host: HTMLElement): void {
  for (const button of host.querySelectorAll<HTMLElement>("[data-open]")) {
    const drawer = host.querySelector<FwDrawer>(`fw-drawer[data-drawer="${button.dataset.open}"]`);
    button.addEventListener("click", () => drawer?.show());
  }
  for (const button of host.querySelectorAll<HTMLElement>("fw-drawer [data-close]")) {
    button.addEventListener("click", () => button.closest("fw-drawer")?.hide());
  }
}

const MEMBER = `<dl style="display:grid;grid-template-columns:auto 1fr;gap:.5rem 1rem;margin:0">
  <dt>Name</dt><dd style="margin:0">Mahnoor Ali</dd>
  <dt>Plan</dt><dd style="margin:0">Gold · PKR 12,000 / month</dd>
  <dt>Trainer</dt><dd style="margin:0">Coach Usman</dd>
  <dt>Renews</dt><dd style="margin:0">3 October</dd>
</dl>`;

export const Playground: Story = {
  render: ({ dismissible, ...rest }) => {
    const host = canvas(
      `<fw-button data-open="main">Open drawer</fw-button>
      <fw-drawer data-drawer="main" ${attrs({ ...rest, dismissible: dismissible ? undefined : "false" })}>
        ${MEMBER}
        <fw-button slot="footer" variant="secondary" data-close>Close</fw-button>
      </fw-drawer>`,
    );
    wire(host);
    return logEvents(host, EVENTS);
  },
};

export const Placements: Story = {
  render: () => {
    const placements = ["start", "end", "top", "bottom"] as const;
    const host = canvas(
      `<div class="sb-ui-row">
        ${placements.map((p) => `<fw-button variant="secondary" data-open="${p}">From ${p}</fw-button>`).join("")}
      </div>
      ${placements
        .map(
          (
            p,
          ) => `<fw-drawer data-drawer="${p}" placement="${p}" heading="placement=&quot;${p}&quot;">
            ${MEMBER}
            <fw-button slot="footer" variant="secondary" data-close>Close</fw-button>
          </fw-drawer>`,
        )
        .join("")}`,
      {
        note: "<code>start</code> and <code>end</code> follow the text direction; <code>top</code> and <code>bottom</code> are as tall as their content.",
      },
    );
    wire(host);
    return logEvents(host, EVENTS);
  },
};

export const Sizes: Story = {
  render: () => {
    const host = canvas(
      `<div class="sb-ui-row">
        <fw-button variant="secondary" data-open="narrow">Narrow (18rem)</fw-button>
        <fw-button variant="secondary" data-open="wide">Wide (40rem)</fw-button>
        <fw-button variant="secondary" data-open="sheet">Bottom sheet (50vh)</fw-button>
      </div>
      <fw-drawer data-drawer="narrow" size="18rem" heading="Quick view">${MEMBER}</fw-drawer>
      <fw-drawer data-drawer="wide" size="40rem" heading="Attendance">
        <p style="margin-top:0">September: 18 visits, average 74 minutes.</p>${MEMBER}
      </fw-drawer>
      <fw-drawer data-drawer="sheet" placement="bottom" size="50vh" heading="Quick check-in">
        <fw-input label="Member ID" placeholder="GMS-00421" autofocus></fw-input>
        <fw-button slot="footer" data-close>Check in</fw-button>
      </fw-drawer>`,
    );
    wire(host);
    return logEvents(host, EVENTS);
  },
};

export const FiltersPanel: Story = {
  name: "Filters panel with footer",
  render: () => {
    const host = canvas(
      `<fw-button variant="secondary" data-open="filters">Filters</fw-button>
      <pre class="sb-ui-log" data-output>Apply the filters to see the FormData.</pre>
      <fw-drawer data-drawer="filters" heading="Filter members" size="24rem">
        <form style="display:grid;gap:1rem">
          <fw-select name="plan" label="Plan" placeholder="Any plan" clearable>
            <fw-option value="silver">Silver</fw-option>
            <fw-option value="gold">Gold</fw-option>
            <fw-option value="platinum">Platinum</fw-option>
          </fw-select>
          <fw-select name="trainer" label="Trainer" placeholder="Any trainer" clearable>
            <fw-option value="usman">Coach Usman</fw-option>
            <fw-option value="mahnoor">Mahnoor Ali</fw-option>
          </fw-select>
          <fw-input name="minDue" type="number" label="Balance due at least" min="0" step="500">
            <span slot="prefix">PKR</span>
          </fw-input>
          <fw-checkbox name="status" value="active" checked>Active</fw-checkbox>
          <fw-checkbox name="status" value="frozen">Frozen</fw-checkbox>
          <fw-checkbox name="status" value="expired">Expired</fw-checkbox>
        </form>
        <fw-button slot="footer" variant="ghost" data-reset>Reset</fw-button>
        <fw-button slot="footer" data-apply>Apply filters</fw-button>
      </fw-drawer>`,
      {
        note: "The selects open their lists in the top layer, so they are not clipped by the drawer.",
      },
    );
    wire(host);
    const drawer = host.querySelector<FwDrawer>("fw-drawer")!;
    const form = host.querySelector("form")!;
    const output = host.querySelector<HTMLElement>("[data-output]")!;
    host.querySelector("[data-reset]")!.addEventListener("click", () => form.reset());
    host.querySelector("[data-apply]")!.addEventListener("click", () => {
      const data = new FormData(form);
      const summary: Record<string, string[]> = {};
      for (const [key, value] of data) (summary[key] ??= []).push(String(value));
      output.textContent = JSON.stringify(summary, null, 2);
      drawer.hide();
    });
    return logEvents(host, EVENTS);
  },
};
