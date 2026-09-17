import type { Meta, StoryObj } from "@storybook/html";
import type { FwCheckbox } from "@formwright/ui/checkbox";
import { attrs, canvas, logEvents } from "../../../ui/story";

type CheckboxArgs = {
  label: string;
  checked: boolean;
  indeterminate: boolean;
  value: string;
  help: string;
  error: string;
  size: "sm" | "md" | "lg";
  required: boolean;
  disabled: boolean;
};

const meta: Meta<CheckboxArgs> = {
  title: "UI/Form Controls/Checkbox",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-checkbox>` is a yes/no choice or one of several, built on a real checkbox input, with checked, indeterminate, help and error states. `import "@formwright/ui/checkbox";`',
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    checked: { control: "boolean" },
    indeterminate: { control: "boolean" },
    value: { control: "text" },
    help: { control: "text" },
    error: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Send payment reminders by SMS",
    checked: false,
    indeterminate: false,
    value: "on",
    help: "",
    error: "",
    size: "md",
    required: false,
    disabled: false,
  },
};
export default meta;

type Story = StoryObj<CheckboxArgs>;

export const Playground: Story = {
  render: ({ label, ...rest }) =>
    logEvents(canvas(`<fw-checkbox ${attrs(rest)}>${label}</fw-checkbox>`), ["input", "change"]),
};

export const States: Story = {
  render: () =>
    canvas(
      `<fw-checkbox checked>Checked</fw-checkbox>
      <fw-checkbox>Unchecked</fw-checkbox>
      <fw-checkbox indeterminate>Indeterminate</fw-checkbox>
      <fw-checkbox checked disabled>Checked, disabled</fw-checkbox>
      <fw-checkbox help="We only use it for class reminders">Email me reminders</fw-checkbox>
      <div class="sb-ui-row">
        <fw-checkbox size="sm" checked>Small</fw-checkbox>
        <fw-checkbox size="md" checked>Medium</fw-checkbox>
        <fw-checkbox size="lg" checked>Large</fw-checkbox>
      </div>`,
    ),
};

export const SelectAll: Story = {
  name: "Select all (indeterminate)",
  render: () => {
    const host = canvas(
      `<fw-checkbox id="all">All facilities</fw-checkbox>
      <div class="sb-ui-body" id="children" style="padding-inline-start: 1.75rem; gap: 8px">
        <fw-checkbox name="facilities" value="gym" checked>Gym floor</fw-checkbox>
        <fw-checkbox name="facilities" value="pool">Swimming pool</fw-checkbox>
        <fw-checkbox name="facilities" value="sauna">Sauna</fw-checkbox>
        <fw-checkbox name="facilities" value="classes">Group classes</fw-checkbox>
      </div>`,
      {
        note: "The parent is checked when every child is, indeterminate when some are. Toggling the parent sets every child.",
      },
    );
    const all = host.querySelector<FwCheckbox>("#all")!;
    const children = [...host.querySelectorAll<FwCheckbox>("#children fw-checkbox")];
    const syncParent = () => {
      const count = children.filter((c) => c.checked).length;
      all.checked = count === children.length;
      all.indeterminate = count > 0 && count < children.length;
    };
    syncParent();
    all.addEventListener("change", () => {
      for (const child of children) child.checked = all.checked;
    });
    host.querySelector("#children")!.addEventListener("change", syncParent);
    return logEvents(host, ["change"]);
  },
};

export const Required: Story = {
  render: () => {
    const host = canvas(
      `<form>
        <div class="sb-ui-body">
          <fw-checkbox name="waiver" value="signed" required help="Members must accept before their first session">
            I accept the liability waiver
          </fw-checkbox>
          <fw-checkbox error="Confirm the member is over 16">Member is 16 or older</fw-checkbox>
          <div class="sb-ui-row"><fw-button type="submit">Continue</fw-button></div>
        </div>
      </form>`,
      {
        note: "Submitting runs validation: the required waiver blocks it until checked, and the checkbox with <code>error</code> always does.",
      },
    );
    host.querySelector("form")!.addEventListener("submit", (event) => event.preventDefault());
    return logEvents(host, ["submit", "change"]);
  },
};
