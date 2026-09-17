import type { Meta, StoryObj } from "@storybook/html";
import type { CommandSelectDetail, FwCommandPalette } from "@formwright/ui/command-palette";
import { attrs, canvas, logEvents } from "../../../ui/story";

type PaletteArgs = {
  placeholder: string;
  hotkey: string;
  emptyText: string;
  label: string;
  open: boolean;
};

const meta: Meta<PaletteArgs> = {
  title: "UI/Overlays/Command Palette",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-command-palette>` is a modal search box that filters `<fw-command>`s (optionally in `<fw-command-group>`s) by label and keywords and fires `fw-select` for the one chosen. It opens from `show()` or its `hotkey` — `mod+k` by default, ⌘K on Apple and Ctrl+K elsewhere. Only the Playground keeps the hotkey here, so one palette answers it. `import "@formwright/ui/command-palette";`',
      },
    },
  },
  argTypes: {
    placeholder: { control: "text" },
    hotkey: {
      control: "text",
      description: "`mod` is ⌘ on Apple platforms, Ctrl elsewhere; empty disables it.",
    },
    emptyText: { control: "text" },
    label: { control: "text" },
    open: { control: "boolean" },
  },
  args: {
    placeholder: "Search members, payments, pages…",
    hotkey: "mod+k",
    emptyText: "No results",
    label: "Command palette",
    open: false,
  },
};
export default meta;

type Story = StoryObj<PaletteArgs>;

const EVENTS = ["fw-select", "fw-show", "fw-hide"];

const COMMANDS = `
  <fw-command-group heading="Members">
    <fw-command value="add-member" keywords="new, join, register" shortcut="⌘ M">Add member</fw-command>
    <fw-command value="find-member" keywords="search, lookup">Find member</fw-command>
    <fw-command value="check-in" keywords="attendance, biometric">Manual check-in</fw-command>
  </fw-command-group>
  <fw-command-group heading="Payments">
    <fw-command value="record-payment" keywords="cash, fee, pkr" shortcut="⌘ P">Record payment</fw-command>
    <fw-command value="dues" keywords="outstanding, balance, overdue">View dues</fw-command>
    <fw-command value="refund" keywords="return, reverse" disabled>Issue refund (admins only)</fw-command>
  </fw-command-group>
  <fw-command-group heading="Go to">
    <fw-command value="nav:dashboard" keywords="home">Dashboard</fw-command>
    <fw-command value="nav:trainers" keywords="coach, staff">Trainers</fw-command>
    <fw-command value="nav:plans" keywords="packages, pricing">Plans</fw-command>
  </fw-command-group>
  <fw-command value="logout" keywords="sign out, exit">Log out</fw-command>`;

/** A button that opens the palette inside `host`. */
function withOpener(host: HTMLElement): HTMLElement {
  const palette = host.querySelector<FwCommandPalette>("fw-command-palette")!;
  host.querySelector("[data-open]")!.addEventListener("click", () => palette.show());
  return host;
}

export const Playground: Story = {
  render: (args) =>
    logEvents(
      withOpener(
        canvas(
          `<fw-button data-open>Open command palette</fw-button>
          <fw-command-palette ${attrs(args)}>${COMMANDS}</fw-command-palette>`,
          { note: "Or press ⌘K / Ctrl+K while this story has focus." },
        ),
      ),
      EVENTS,
    ),
};

export const GroupsKeywordsAndShortcuts: Story = {
  name: "Groups, keywords and shortcuts",
  render: () =>
    logEvents(
      withOpener(
        canvas(
          `<fw-button data-open>Open command palette</fw-button>
          <fw-command-palette hotkey="">${COMMANDS}</fw-command-palette>`,
          {
            note: "Try typing <code>cash</code> (a keyword of Record payment), <code>coach</code> or <code>refund</code> — the refund command is disabled. Shortcut hints are shown, not bound. Escape clears the search, then closes.",
          },
        ),
      ),
      EVENTS,
    ),
};

export const KeepOpenOnSelect: Story = {
  name: "Keep open on select",
  render: () => {
    const host = canvas(
      `<fw-button data-open>Quick check-in</fw-button>
      <p data-count style="margin:0">Checked in: nobody yet</p>
      <fw-command-palette hotkey="" placeholder="Check in a member…" empty-text="No member with that name">
        <fw-command value="Bilal Ahmed" keywords="GMS-00118">Bilal Ahmed</fw-command>
        <fw-command value="Ayesha Khan" keywords="GMS-00421">Ayesha Khan</fw-command>
        <fw-command value="Hamza Siddiqui" keywords="GMS-00077">Hamza Siddiqui</fw-command>
        <fw-command value="Mahnoor Ali" keywords="GMS-00302">Mahnoor Ali</fw-command>
        <div slot="footer" style="padding:.5rem 1rem;font-size:12px;color:var(--fw-muted)">Enter checks in · Escape closes</div>
      </fw-command-palette>`,
      {
        note: "<code>fw-select</code> is cancelable: calling <code>preventDefault()</code> keeps the palette open for the next member. Search by name or member ID.",
      },
    );
    const palette = host.querySelector<FwCommandPalette>("fw-command-palette")!;
    const count = host.querySelector<HTMLElement>("[data-count]")!;
    const checkedIn: string[] = [];
    palette.addEventListener("fw-select", (event) => {
      event.preventDefault();
      const { value } = (event as CustomEvent<CommandSelectDetail>).detail;
      if (!checkedIn.includes(value)) checkedIn.push(value);
      count.textContent = `Checked in: ${checkedIn.join(", ")}`;
    });
    return logEvents(withOpener(host), EVENTS);
  },
};
