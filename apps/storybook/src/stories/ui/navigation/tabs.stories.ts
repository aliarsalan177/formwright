import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas, logEvents } from "../../../ui/story";

interface TabsArgs {
  value: string;
  variant: "line" | "pills";
  orientation: "horizontal" | "vertical";
  activation: "auto" | "manual";
  label: string;
}

const TAB_EVENTS = ["change", "fw-tab-show"];

const ICON_USER = `<svg slot="prefix" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`;
const ICON_CARD = `<svg slot="prefix" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>`;
const ICON_CLOCK = `<svg slot="prefix" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;

/** The member-profile tabs used by most stories. */
const memberTabs = (disableDanger = false) => `
  <fw-tab slot="nav" panel="profile">Profile</fw-tab>
  <fw-tab slot="nav" panel="plan">Plan</fw-tab>
  <fw-tab slot="nav" panel="payments">Payments</fw-tab>
  <fw-tab slot="nav" panel="danger"${disableDanger ? " disabled" : ""}>Danger zone</fw-tab>
  <fw-tab-panel name="profile"><p>Ali Arsalan · Member since March 2024 · +92 300 1234567</p></fw-tab-panel>
  <fw-tab-panel name="plan"><p>Gold quarterly plan — PKR 24,000, renews 1 December.</p></fw-tab-panel>
  <fw-tab-panel name="payments"><p>Last payment PKR 8,000 by card on 1 September.</p></fw-tab-panel>
  <fw-tab-panel name="danger"><p>Freeze or cancel this membership.</p></fw-tab-panel>`;

const meta: Meta<TabsArgs> = {
  title: "UI/Navigation/Tabs",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-tabs>` with `<fw-tab>` and `<fw-tab-panel>` shows one panel at a time, picked from a row or column of tabs, following the WAI-ARIA tabs pattern. Use it to split related content on one page, such as a member profile.\n\n`import "@formwright/ui/tabs";`',
      },
    },
  },
  argTypes: {
    value: {
      control: "select",
      options: ["profile", "plan", "payments", "danger"],
      description: "The `panel` name of the selected tab.",
    },
    variant: { control: "select", options: ["line", "pills"] },
    orientation: { control: "select", options: ["horizontal", "vertical"] },
    activation: {
      control: "select",
      options: ["auto", "manual"],
      description: "`auto` selects as arrow keys move; `manual` needs Enter or Space.",
    },
    label: { control: "text", description: "Accessible name of the tablist." },
  },
  args: {
    value: "profile",
    variant: "line",
    orientation: "horizontal",
    activation: "auto",
    label: "Member profile",
  },
};
export default meta;

type Story = StoryObj<TabsArgs>;

export const Playground: Story = {
  render: (args) =>
    logEvents(
      canvas(`<fw-tabs ${attrs({ ...args })}>${memberTabs()}</fw-tabs>`, { width: "40rem" }),
      TAB_EVENTS,
    ),
};

export const Variants: Story = {
  name: "Line and pills",
  render: () =>
    logEvents(
      canvas(
        `<fw-tabs label="Member profile (line)">${memberTabs()}</fw-tabs>
         <fw-tabs variant="pills" value="plan" label="Member profile (pills)">${memberTabs()}</fw-tabs>`,
        {
          width: "40rem",
          note: "The default `line` variant underlines the selected tab; `pills` fills it.",
        },
      ),
      TAB_EVENTS,
    ),
};

export const Vertical: Story = {
  render: () =>
    logEvents(
      canvas(
        `<fw-tabs orientation="vertical" label="Gym settings">
          <fw-tab slot="nav" panel="general">General</fw-tab>
          <fw-tab slot="nav" panel="hours">Opening hours</fw-tab>
          <fw-tab slot="nav" panel="plans">Plans &amp; pricing</fw-tab>
          <fw-tab slot="nav" panel="staff">Trainers</fw-tab>
          <fw-tab-panel name="general"><p>Iron Temple Gym, Gulberg III, Lahore.</p></fw-tab-panel>
          <fw-tab-panel name="hours"><p>Mon–Sat 6:00–23:00, Sunday 8:00–20:00.</p></fw-tab-panel>
          <fw-tab-panel name="plans"><p>Monthly PKR 8,000 · Quarterly PKR 22,000 · Yearly PKR 80,000.</p></fw-tab-panel>
          <fw-tab-panel name="staff"><p>6 trainers, 2 on leave this week.</p></fw-tab-panel>
        </fw-tabs>`,
        { width: "40rem", note: "Up and Down arrows move between vertical tabs." },
      ),
      TAB_EVENTS,
    ),
};

export const ManualActivationAndDisabled: Story = {
  name: "Manual activation + disabled tab",
  render: () =>
    logEvents(
      canvas(`<fw-tabs activation="manual" label="Member profile">${memberTabs(true)}</fw-tabs>`, {
        width: "40rem",
        note: "Focus a tab and use the arrow keys: focus moves but nothing is selected until Enter or Space. The disabled “Danger zone” tab is skipped.",
      }),
      TAB_EVENTS,
    ),
};

export const WithIconsAndBadges: Story = {
  name: "Prefix icons + badges",
  render: () =>
    logEvents(
      canvas(
        `<fw-tabs variant="pills" label="Front desk">
          <fw-tab panel="members">${ICON_USER}Members<fw-badge slot="suffix" size="sm">412</fw-badge></fw-tab>
          <fw-tab panel="dues">${ICON_CARD}Dues<fw-badge slot="suffix" size="sm" tone="danger" variant="solid">7</fw-badge></fw-tab>
          <fw-tab panel="checkins">${ICON_CLOCK}Check-ins</fw-tab>
          <fw-tab-panel name="members"><p>412 active members, 38 on frozen plans.</p></fw-tab-panel>
          <fw-tab-panel name="dues"><p>7 members owe a total of PKR 56,000.</p></fw-tab-panel>
          <fw-tab-panel name="checkins"><p>129 check-ins today, peak at 18:00.</p></fw-tab-panel>
        </fw-tabs>`,
        { width: "40rem", note: "Tabs without a `slot` are moved into the `nav` slot for you." },
      ),
      TAB_EVENTS,
    ),
};

export const RightToLeft: Story = {
  name: "Right-to-left",
  render: () =>
    logEvents(
      canvas(
        `<div dir="rtl" lang="ur">
          <fw-tabs label="رکن کی پروفائل">
            <fw-tab slot="nav" panel="profile">پروفائل</fw-tab>
            <fw-tab slot="nav" panel="plan">پلان</fw-tab>
            <fw-tab slot="nav" panel="payments">ادائیگیاں</fw-tab>
            <fw-tab-panel name="profile"><p>علی ارسلان — مارچ 2024 سے رکن</p></fw-tab-panel>
            <fw-tab-panel name="plan"><p>گولڈ سہ ماہی پلان — 24,000 روپے</p></fw-tab-panel>
            <fw-tab-panel name="payments"><p>آخری ادائیگی 8,000 روپے</p></fw-tab-panel>
          </fw-tabs>
        </div>`,
        {
          width: "40rem",
          note: 'Inside `dir="rtl"`, Left and Right arrows are reversed so they follow the reading direction.',
        },
      ),
      TAB_EVENTS,
    ),
};
