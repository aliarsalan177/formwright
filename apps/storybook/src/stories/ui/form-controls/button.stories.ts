import type { Meta, StoryObj } from "@storybook/html";
import type { FwButton } from "@formwright/ui/button";
import { attrs, canvas, logEvents } from "../../../ui/story";

type ButtonArgs = {
  label: string;
  variant: "primary" | "secondary" | "ghost" | "danger";
  size: "sm" | "md" | "lg";
  loading: boolean;
  disabled: boolean;
  block: boolean;
  href: string;
  target: string;
};

const PLUS = `<svg slot="prefix" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;

const meta: Meta<ButtonArgs> = {
  title: "UI/Form Controls/Button",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-button>` is a button, a link styled as one (set `href`), or a form\'s submit/reset button. `loading` shows a spinner and blocks repeat clicks. `import "@formwright/ui/button";`',
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    variant: { control: "select", options: ["primary", "secondary", "ghost", "danger"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
    block: { control: "boolean" },
    href: { control: "text", description: "Renders a real <a> when set" },
    target: { control: "select", options: ["", "_blank", "_self"] },
  },
  args: {
    label: "Add member",
    variant: "primary",
    size: "md",
    loading: false,
    disabled: false,
    block: false,
    href: "",
    target: "",
  },
};
export default meta;

type Story = StoryObj<ButtonArgs>;

export const Playground: Story = {
  render: ({ label, ...rest }) =>
    logEvents(canvas(`<fw-button ${attrs(rest)}>${label}</fw-button>`), ["click"]),
};

export const Variants: Story = {
  render: () =>
    canvas(
      `<div class="sb-ui-row">
        <fw-button>${PLUS}New member</fw-button>
        <fw-button variant="secondary">Export CSV</fw-button>
        <fw-button variant="ghost">Cancel</fw-button>
        <fw-button variant="danger">Delete plan</fw-button>
      </div>
      <div class="sb-ui-row">
        <fw-button disabled>${PLUS}New member</fw-button>
        <fw-button variant="secondary" disabled>Export CSV</fw-button>
        <fw-button variant="ghost" disabled>Cancel</fw-button>
        <fw-button variant="danger" disabled>Delete plan</fw-button>
      </div>`,
      { note: "Four variants, enabled and disabled. Icons go in the <code>prefix</code> slot." },
    ),
};

export const Sizes: Story = {
  render: () =>
    canvas(
      `<div class="sb-ui-row">
        <fw-button size="sm">Small</fw-button>
        <fw-button size="md">Medium</fw-button>
        <fw-button size="lg">Large</fw-button>
      </div>
      <fw-button block size="lg">Check in member</fw-button>`,
      { note: "<code>block</code> fills the width, e.g. a kiosk check-in button." },
    ),
};

export const Loading: Story = {
  render: () => {
    const host = canvas(
      `<div class="sb-ui-row">
        <fw-button id="pay">Record payment · PKR 8,500</fw-button>
        <fw-button variant="danger" loading>Deleting…</fw-button>
      </div>`,
      {
        note: "Click the first button: it goes into <code>loading</code> for two seconds. Extra clicks while loading are swallowed.",
      },
    );
    const pay = host.querySelector<FwButton>("#pay")!;
    let timer: ReturnType<typeof setTimeout> | undefined;
    pay.addEventListener("click", () => {
      pay.loading = true;
      timer = setTimeout(() => {
        pay.loading = false;
      }, 2000);
    });
    host.__storyDispose = () => clearTimeout(timer);
    return logEvents(host, ["click"]);
  },
};

export const AsLink: Story = {
  name: "As link",
  render: () =>
    canvas(
      `<div class="sb-ui-row">
        <fw-button href="#members" variant="secondary">View members</fw-button>
        <fw-button href="https://example.com/receipt/1042" target="_blank" variant="ghost">Open receipt ↗</fw-button>
      </div>`,
      {
        note: 'With <code>href</code> it renders a real <code>&lt;a&gt;</code>: middle click and open-in-new-tab work, and <code>target="_blank"</code> gets <code>rel="noopener noreferrer"</code> automatically.',
      },
    ),
};

export const SubmitAndReset: Story = {
  name: "Submit and reset in a form",
  render: () => {
    const host = canvas(
      `<form>
        <div class="sb-ui-body">
          <fw-input label="Member name" name="name" value="Ayesha Khan" required></fw-input>
          <div class="sb-ui-row">
            <fw-button type="submit">Save</fw-button>
            <fw-button type="reset" variant="secondary">Reset</fw-button>
          </div>
        </div>
      </form>`,
      {
        note: '<code>type="submit"</code> calls <code>form.requestSubmit()</code> (so validation runs) and <code>type="reset"</code> calls <code>form.reset()</code>. Clear the name and press Save: nothing submits.',
      },
    );
    const form = host.querySelector("form")!;
    form.addEventListener("submit", (event) => event.preventDefault());
    return logEvents(host, ["submit", "reset"]);
  },
};
