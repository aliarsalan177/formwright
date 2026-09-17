import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas, logEvents } from "../../../ui/story";

type ListArgs = {
  selection: "none" | "single" | "multiple";
  variant: "plain" | "outline" | "inset";
  size: "sm" | "md" | "lg";
  dividers: boolean;
  disabled: boolean;
  label: string;
};

const meta: Meta<ListArgs> = {
  title: "UI/Display/List",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-list>` holds `<fw-list-item>` rows: static, links (`href`), actions (`interactive`) or selectable (`selection="single" | "multiple"`, form-associated). `<fw-list-item>` is the same row `<fw-option>` and `<fw-menu-item>` are built on, so it also works inside `<fw-select>`, `<fw-combobox>`, `<fw-multi-select>` and `<fw-dropdown>`. `import "@formwright/ui/list";`',
      },
    },
  },
  argTypes: {
    selection: { control: "select", options: ["none", "single", "multiple"] },
    variant: { control: "select", options: ["plain", "outline", "inset"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    dividers: { control: "boolean" },
    disabled: { control: "boolean" },
    label: { control: "text" },
  },
  args: {
    selection: "single",
    variant: "inset",
    size: "md",
    dividers: false,
    disabled: false,
    label: "Branch",
  },
};
export default meta;

type Story = StoryObj<ListArgs>;

const EVENTS = ["input", "change", "fw-select"];

const icon = (path: string, slot = "prefix") =>
  `<svg slot="${slot}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

const ICONS = {
  card: icon('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>'),
  bell: icon(
    '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  ),
  lock: icon(
    '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  ),
  users: icon(
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  ),
  renew: icon('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
  freeze: icon('<path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19"/>'),
  export: icon(
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  ),
  trash: icon('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  external: icon(
    '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    "suffix",
  ),
};

const MEMBERS = [
  {
    value: "sana",
    name: "Sana Malik",
    description: "Head trainer · sana@ironhouse.pk",
    badge: '<fw-badge slot="suffix" tone="success" size="sm">Active</fw-badge>',
  },
  {
    value: "usman",
    name: "Usman Tariq",
    description: "Strength coach · 18 members",
    badge: '<fw-badge slot="suffix" tone="accent" size="sm">Coach</fw-badge>',
  },
  {
    value: "mahnoor",
    name: "Mahnoor Ali",
    description: "Yoga & mobility · on leave until 2 Oct",
    badge: '<fw-badge slot="suffix" tone="warning" size="sm">Away</fw-badge>',
  },
  {
    value: "faisal",
    name: "Faisal Qureshi",
    description: "Front desk · joined 2024",
    badge: '<fw-badge slot="suffix" size="sm">Staff</fw-badge>',
  },
];

const memberRows = (tag = "fw-list-item", avatarSize = "sm") =>
  MEMBERS.map(
    (m) =>
      `<${tag} value="${m.value}" description="${m.description}">
        <fw-avatar slot="prefix" name="${m.name}" size="${avatarSize}"></fw-avatar>
        ${m.name}
        ${m.badge}
      </${tag}>`,
  ).join("");

export const Playground: Story = {
  render: (args) =>
    logEvents(
      canvas(
        `<fw-list ${attrs(args)} value="dha">
          <fw-list-item value="dha" description="Phase 5 · open 6am–11pm">DHA</fw-list-item>
          <fw-list-item value="gulberg" description="Main Boulevard · open 24 hours">Gulberg III</fw-list-item>
          <fw-list-item value="johar" description="Opening next month" disabled>Johar Town</fw-list-item>
          <fw-list-item value="bahria" description="Sector C · ladies only">Bahria Town</fw-list-item>
        </fw-list>`,
        { width: "24rem" },
      ),
      EVENTS,
    ),
};

export const Members: Story = {
  name: "Members (outline)",
  render: () =>
    canvas(`<fw-list variant="outline" label="Staff">${memberRows()}</fw-list>`, {
      width: "30rem",
      note: "Avatar in <code>prefix</code>, the <code>description</code> attribute, a badge in <code>suffix</code>. Without selection the rows are plain list items and take no focus.",
    }),
};

export const NavigationRows: Story = {
  name: "Navigation rows",
  render: () =>
    logEvents(
      canvas(
        `<fw-list variant="inset" label="Settings">
          <fw-list-item href="#billing" description="Plans, invoices and payment methods">${ICONS.card}Billing</fw-list-item>
          <fw-list-item href="#notifications" description="Renewal reminders and receipts">${ICONS.bell}Notifications</fw-list-item>
          <fw-list-item href="#security">${ICONS.lock}Security</fw-list-item>
          <fw-list-item href="#staff" disabled description="Only owners can manage staff">${ICONS.users}Staff &amp; roles</fw-list-item>
          <fw-list-item href="https://example.com/help" target="_blank">Help centre${ICONS.external}</fw-list-item>
        </fw-list>`,
        {
          width: "26rem",
          note: "Each row is a real <code>&lt;a&gt;</code>: middle-click and “copy link” work. Tab reaches the list once; arrows move between rows and Enter follows the link.",
        },
      ),
      ["fw-select"],
    ),
};

export const ActionRows: Story = {
  name: "Action rows",
  render: () =>
    logEvents(
      canvas(
        `<fw-list variant="outline" dividers label="Member actions">
          <fw-list-item interactive value="renew" description="PKR 8,500 · extends to 17 Oct">${ICONS.renew}Renew membership<kbd slot="suffix">R</kbd></fw-list-item>
          <fw-list-item interactive value="freeze" description="Pause billing for up to 30 days">${ICONS.freeze}Freeze</fw-list-item>
          <fw-list-item interactive value="export">${ICONS.export}Export attendance<kbd slot="suffix">⌘E</kbd></fw-list-item>
          <fw-list-item interactive value="delete" danger description="Removes history and payments">${ICONS.trash}Delete member</fw-list-item>
        </fw-list>`,
        {
          width: "26rem",
          note: "<code>interactive</code> rows are buttons in a list without selection: click, Enter or Space emits <code>fw-select</code>.",
        },
      ),
      ["fw-select"],
    ),
};

export const PlanPicker: Story = {
  name: "Single selection in a form",
  render: () => {
    const host = canvas(
      `<form data-form style="display:grid;gap:0.75rem">
        <fw-list selection="single" variant="inset" name="plan" value="standard" required label="Plan">
          <fw-list-item value="basic" description="Gym floor, 6am–4pm">Basic<span slot="suffix">PKR 5,000</span></fw-list-item>
          <fw-list-item value="standard" description="Gym floor and classes, all day">Standard<span slot="suffix">PKR 8,500</span></fw-list-item>
          <fw-list-item value="premium" description="Everything, plus a personal trainer">Premium<span slot="suffix">PKR 14,000</span></fw-list-item>
          <fw-list-item value="couple" description="Sold out this month" disabled>Couple<span slot="suffix">PKR 15,000</span></fw-list-item>
        </fw-list>
        <div class="sb-ui-row">
          <fw-button type="submit">Save</fw-button>
          <fw-button type="reset" variant="secondary">Reset</fw-button>
        </div>
      </form>
      <pre class="sb-ui-log" data-output>Submit the form to see its FormData.</pre>`,
      { width: "26rem" },
    );
    const form = host.querySelector<HTMLFormElement>("[data-form]")!;
    const output = host.querySelector<HTMLElement>("[data-output]")!;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      output.textContent = JSON.stringify([...new FormData(form).entries()]);
    });
    return logEvents(host, ["change"]);
  },
};

export const MultipleSelection: Story = {
  name: "Multiple selection",
  render: () =>
    logEvents(
      canvas(
        `<fw-list selection="multiple" variant="outline" name="days" value="mon,wed,fri" label="Training days">
          <fw-list-item value="mon">Monday</fw-list-item>
          <fw-list-item value="tue">Tuesday</fw-list-item>
          <fw-list-item value="wed">Wednesday</fw-list-item>
          <fw-list-item value="thu">Thursday</fw-list-item>
          <fw-list-item value="fri">Friday</fw-list-item>
          <fw-list-item value="sat" disabled description="Closed for maintenance">Saturday</fw-list-item>
        </fw-list>`,
        {
          width: "22rem",
          note: "Space, Enter or a click toggles a row; <code>value</code> is a string array.",
        },
      ),
      ["change"],
    ),
};

export const InsideSelectAndDropdown: Story = {
  name: "Inside select and dropdown",
  render: () =>
    logEvents(
      canvas(
        `<fw-select label="Trainer" placeholder="Choose a trainer" value="usman">${memberRows("fw-list-item", "xs")}</fw-select>
        <fw-combobox label="Find a member" placeholder="Type a name">${memberRows("fw-list-item", "xs")}</fw-combobox>
        <div>
        <fw-dropdown>
          <fw-button slot="trigger" variant="secondary">Assign to…</fw-button>
          <fw-menu-label>Trainers</fw-menu-label>
          ${memberRows("fw-list-item", "xs")}
          <fw-menu-divider></fw-menu-divider>
          <fw-menu-item value="none">Unassigned</fw-menu-item>
        </fw-dropdown>
        </div>`,
        {
          width: "26rem",
          note: "The same <code>&lt;fw-list-item&gt;</code> rows — avatar, description, badge — as options in a select and a combobox and as menu items in a dropdown. They take their role from where they are.",
        },
      ),
      EVENTS,
    ),
};
