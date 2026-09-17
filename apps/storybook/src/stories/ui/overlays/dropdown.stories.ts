import type { Meta, StoryObj } from "@storybook/html";
import type { FwMenuItem } from "@formwright/ui/dropdown";
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

type DropdownArgs = {
  placement: (typeof PLACEMENTS)[number];
  closeOnSelect: boolean;
  open: boolean;
};

const meta: Meta<DropdownArgs> = {
  title: "UI/Overlays/Dropdown",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-dropdown>` is a menu button: a trigger that opens a list of `<fw-menu-item>` actions, with `<fw-menu-label>`, `<fw-menu-divider>`, checkbox and radio items and nested `<fw-submenu>`s, following the WAI-ARIA menu button keyboard pattern. `import "@formwright/ui/dropdown";`',
      },
    },
  },
  argTypes: {
    placement: { control: "select", options: [...PLACEMENTS] },
    closeOnSelect: { control: "boolean" },
    open: { control: "boolean" },
  },
  args: {
    placement: "bottom-start",
    closeOnSelect: true,
    open: false,
  },
};
export default meta;

type Story = StoryObj<DropdownArgs>;

const EVENTS = ["fw-select", "fw-show", "fw-hide"];

const svg = (path: string) =>
  `<svg slot="prefix" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

const ICONS = {
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  renew: svg('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
  payment: svg('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/>'),
  freeze: svg('<path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
};

export const Playground: Story = {
  render: ({ closeOnSelect, ...rest }) =>
    logEvents(
      canvas(
        `<fw-dropdown ${attrs({ ...rest, closeOnSelect: closeOnSelect ? undefined : "false" })}>
          <fw-button slot="trigger" variant="secondary">Member actions</fw-button>
          <fw-menu-item value="edit">Edit profile</fw-menu-item>
          <fw-menu-item value="renew">Renew membership</fw-menu-item>
          <fw-menu-item value="freeze">Freeze</fw-menu-item>
          <fw-menu-divider></fw-menu-divider>
          <fw-menu-item value="delete" danger>Delete member</fw-menu-item>
        </fw-dropdown>`,
        { center: true },
      ),
      EVENTS,
    ),
};

export const ActionsMenu: Story = {
  name: "Actions with icons and shortcuts",
  render: () =>
    logEvents(
      canvas(
        `<fw-dropdown>
          <fw-button slot="trigger" variant="secondary">Bilal Ahmed ▾</fw-button>
          <fw-menu-label>Membership</fw-menu-label>
          <fw-menu-item value="edit">${ICONS.edit}Edit profile<kbd slot="suffix">E</kbd></fw-menu-item>
          <fw-menu-item value="renew">${ICONS.renew}Renew (PKR 8,500)<kbd slot="suffix">R</kbd></fw-menu-item>
          <fw-menu-item value="payment">${ICONS.payment}Record payment<kbd slot="suffix">P</kbd></fw-menu-item>
          <fw-menu-item value="freeze" disabled>${ICONS.freeze}Freeze (already frozen)</fw-menu-item>
          <fw-menu-divider></fw-menu-divider>
          <fw-menu-item value="delete" danger>${ICONS.trash}Delete member<kbd slot="suffix">⌫</kbd></fw-menu-item>
        </fw-dropdown>`,
        {
          note: "Arrow keys move, typing a letter jumps to the next item starting with it. Shortcut hints are only hints.",
        },
      ),
      EVENTS,
    ),
};

export const CheckboxAndRadioItems: Story = {
  name: "Checkbox and radio items",
  render: () => {
    const host = canvas(
      `<fw-dropdown close-on-select="false">
        <fw-button slot="trigger" variant="secondary">View options</fw-button>
        <fw-menu-label>Show</fw-menu-label>
        <fw-menu-item type="checkbox" value="archived">Archived members</fw-menu-item>
        <fw-menu-item type="checkbox" value="frozen" checked>Frozen memberships</fw-menu-item>
        <fw-menu-divider></fw-menu-divider>
        <fw-menu-label>Sort by</fw-menu-label>
        <fw-menu-item type="radio" group="sort" value="name" checked>Name</fw-menu-item>
        <fw-menu-item type="radio" group="sort" value="joined">Join date</fw-menu-item>
        <fw-menu-item type="radio" group="sort" value="balance">Balance due</fw-menu-item>
      </fw-dropdown>
      <p data-state style="margin:0"></p>`,
      { note: '<code>close-on-select="false"</code> keeps the menu open while toggling.' },
    );
    const state = host.querySelector<HTMLElement>("[data-state]")!;
    const items = [...host.querySelectorAll<FwMenuItem>("fw-menu-item")];
    const render = () => {
      const shown = items.filter((i) => i.type === "checkbox" && i.checked).map((i) => i.value);
      const sort = items.find((i) => i.type === "radio" && i.checked)?.value ?? "none";
      state.textContent = `Showing: ${shown.join(", ") || "active only"} · Sorted by: ${sort}`;
    };
    render();
    host.addEventListener("fw-select", render);
    return logEvents(host, EVENTS);
  },
};

export const NestedSubmenus: Story = {
  name: "Nested submenus",
  render: () =>
    logEvents(
      canvas(
        `<fw-dropdown>
          <fw-button slot="trigger" variant="secondary">Assign</fw-button>
          <fw-menu-item>
            Plan
            <fw-submenu slot="submenu">
              <fw-menu-item value="plan:silver">Silver · PKR 6,000</fw-menu-item>
              <fw-menu-item value="plan:gold">Gold · PKR 12,000</fw-menu-item>
              <fw-menu-item value="plan:platinum">Platinum · PKR 20,000</fw-menu-item>
            </fw-submenu>
          </fw-menu-item>
          <fw-menu-item>
            Trainer
            <fw-submenu slot="submenu">
              <fw-menu-label>By speciality</fw-menu-label>
              <fw-menu-item>
                Strength
                <fw-submenu slot="submenu">
                  <fw-menu-item value="trainer:usman">Coach Usman</fw-menu-item>
                  <fw-menu-item value="trainer:hamza">Coach Hamza</fw-menu-item>
                </fw-submenu>
              </fw-menu-item>
              <fw-menu-item>
                Yoga &amp; mobility
                <fw-submenu slot="submenu">
                  <fw-menu-item value="trainer:mahnoor">Mahnoor Ali</fw-menu-item>
                  <fw-menu-item value="trainer:sana" disabled>Sana Iqbal (on leave)</fw-menu-item>
                </fw-submenu>
              </fw-menu-item>
              <fw-menu-divider></fw-menu-divider>
              <fw-menu-item value="trainer:none">No trainer</fw-menu-item>
            </fw-submenu>
          </fw-menu-item>
          <fw-menu-divider></fw-menu-divider>
          <fw-menu-item value="locker">Locker…</fw-menu-item>
        </fw-dropdown>`,
        {
          note: "Hover or press ArrowRight on an item with a chevron to open its submenu; ArrowLeft or Escape closes just that level. Trainer → Strength is two levels deep.",
        },
      ),
      EVENTS,
    ),
};
