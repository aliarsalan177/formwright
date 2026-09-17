import type { Meta, StoryObj } from "@storybook/html";
import type { ComboboxFilter, FwCombobox } from "@formwright/ui/combobox";
import { attrs, canvas, logEvents } from "../../../ui/story";

interface ComboboxArgs {
  label: string;
  placeholder: string;
  help: string;
  error: string;
  size: "sm" | "md" | "lg";
  filter: ComboboxFilter;
  allowCustom: boolean;
  clearable: boolean;
  loading: boolean;
  minChars: number;
  debounce: number;
  disabled: boolean;
  required: boolean;
}

const EVENTS = ["input", "change", "fw-search", "fw-show", "fw-hide"];

const PLANS = `
  <fw-option value="basic">Basic — PKR 4,500 / month</fw-option>
  <fw-option value="standard">Standard — PKR 7,000 / month</fw-option>
  <fw-option value="premium">Premium — PKR 12,000 / month</fw-option>
  <fw-option value="student">Student — PKR 3,500 / month</fw-option>
  <fw-option value="couple">Couple — PKR 11,000 / month</fw-option>
  <fw-option value="corporate" disabled>Corporate (by invitation)</fw-option>`;

const meta: Meta<ComboboxArgs> = {
  title: "UI/Inputs/Combobox",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'A text input that suggests `<fw-option>`s as you type — filtered locally, or by the app from a server with `filter="none"` and `fw-search`. Use it when the list is long enough that typing beats scrolling. `import "@formwright/ui/combobox";`',
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    help: { control: "text" },
    error: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    filter: { control: "select", options: ["contains", "starts-with", "none"] },
    allowCustom: { control: "boolean" },
    clearable: { control: "boolean" },
    loading: { control: "boolean" },
    minChars: { control: { type: "number", min: 0, step: 1 } },
    debounce: { control: { type: "number", min: 0, step: 50 } },
    disabled: { control: "boolean" },
    required: { control: "boolean" },
  },
  args: {
    label: "Membership plan",
    placeholder: "Search plans",
    help: "",
    error: "",
    size: "md",
    filter: "contains",
    allowCustom: false,
    clearable: true,
    loading: false,
    minChars: 0,
    debounce: 0,
    disabled: false,
    required: false,
  },
};
export default meta;

type Story = StoryObj<ComboboxArgs>;

export const Playground: Story = {
  render: (args) =>
    logEvents(
      canvas(`<fw-combobox name="plan" ${attrs({ ...args })}>${PLANS}
        <span slot="empty">No plan by that name</span>
      </fw-combobox>`),
      EVENTS,
    ),
};

export const FilterModes: Story = {
  name: "Filter modes",
  render: () =>
    logEvents(
      canvas(
        `<fw-combobox label="contains (default)" placeholder="Try “PKR 7”" clearable>${PLANS}</fw-combobox>
         <fw-combobox label="starts-with" filter="starts-with" placeholder="Try “st”" clearable>${PLANS}</fw-combobox>`,
        {
          note: "<code>contains</code> matches anywhere in the option text; <code>starts-with</code> only at the start — type “st” in both to compare.",
        },
      ),
      ["change"],
    ),
};

export const AllowCustom: Story = {
  name: "Allow custom value",
  render: () =>
    logEvents(
      canvas(
        `<fw-combobox label="Referral source" name="source" allow-custom clearable placeholder="Pick or type your own">
          <fw-option value="instagram">Instagram</fw-option>
          <fw-option value="friend">A friend or member</fw-option>
          <fw-option value="walk-in">Walked past the gym</fw-option>
          <fw-option value="google">Google search</fw-option>
        </fw-combobox>`,
        {
          note: "With <code>allow-custom</code>, Enter keeps whatever was typed — “Billboard on Shahrah-e-Faisal” becomes the value.",
        },
      ),
      ["change"],
    ),
};

const MEMBERS: readonly (readonly [string, string])[] = [
  ["m-1001", "Ayesha Khan"],
  ["m-1002", "Bilal Ahmed"],
  ["m-1003", "Fatima Siddiqui"],
  ["m-1004", "Hamza Qureshi"],
  ["m-1005", "Hira Malik"],
  ["m-1006", "Imran Sheikh"],
  ["m-1007", "Mahnoor Raza"],
  ["m-1008", "Omar Farooq"],
  ["m-1009", "Sana Iqbal"],
  ["m-1010", "Usman Tariq"],
  ["m-1011", "Zainab Hussain"],
];

export const AsyncSearch: Story = {
  name: "Async search",
  render: () => {
    const host = canvas(
      `<fw-combobox label="Member" name="member" filter="none" min-chars="2" debounce="250"
          placeholder="Type at least 2 letters" clearable>
        <span slot="empty">No member found</span>
      </fw-combobox>`,
      {
        note: '<code>filter="none"</code> leaves filtering to the app: each <code>fw-search</code> shows the loading row, then swaps in results after a fake 400 ms request.',
      },
    );
    const combo = host.querySelector<FwCombobox>("fw-combobox")!;
    let timer: ReturnType<typeof setTimeout> | undefined;

    combo.addEventListener("fw-search", (event) => {
      const { query } = (event as CustomEvent<{ query: string }>).detail;
      clearTimeout(timer);
      combo.loading = true;
      for (const option of combo.querySelectorAll("fw-option")) option.remove();
      timer = setTimeout(() => {
        const needle = query.trim().toLowerCase();
        const options = MEMBERS.filter(([, name]) => name.toLowerCase().includes(needle)).map(
          ([id, name]) => {
            const option = document.createElement("fw-option");
            option.setAttribute("value", id);
            option.textContent = `${name} · ${id}`;
            return option;
          },
        );
        combo.append(...options);
        combo.loading = false;
      }, 400);
    });

    host.__storyDispose = () => clearTimeout(timer);
    return logEvents(host, ["fw-search", "change"]);
  },
};

export const SizesAndStates: Story = {
  name: "Sizes and states",
  render: () =>
    canvas(`
      <fw-combobox size="sm" label="Small" placeholder="Search plans">${PLANS}</fw-combobox>
      <fw-combobox size="md" label="Medium" placeholder="Search plans">${PLANS}</fw-combobox>
      <fw-combobox size="lg" label="Large" placeholder="Search plans">${PLANS}</fw-combobox>
      <fw-combobox label="Disabled" value="standard" disabled>${PLANS}</fw-combobox>
      <fw-combobox label="With error" required error="Choose a plan before saving the member.">${PLANS}</fw-combobox>
      <fw-combobox label="Loading" loading placeholder="Fetching trainers…"></fw-combobox>
    `),
};
