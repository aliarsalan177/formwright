import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas, logEvents } from "../../../ui/story";

interface MultiSelectArgs {
  label: string;
  placeholder: string;
  help: string;
  error: string;
  size: "sm" | "md" | "lg";
  searchable: boolean;
  clearable: boolean;
  max: number | undefined;
  disabled: boolean;
  required: boolean;
}

const EVENTS = ["input", "change", "fw-show", "fw-hide"];

const DAYS = `
  <fw-option value="mon">Monday</fw-option>
  <fw-option value="tue">Tuesday</fw-option>
  <fw-option value="wed">Wednesday</fw-option>
  <fw-option value="thu">Thursday</fw-option>
  <fw-option value="fri">Friday</fw-option>
  <fw-option value="sat">Saturday</fw-option>
  <fw-option value="sun" disabled>Sunday (closed)</fw-option>`;

const TRAINERS = `
  <fw-option value="t-ali">Ali Raza — Strength</fw-option>
  <fw-option value="t-sara">Sara Javed — Yoga</fw-option>
  <fw-option value="t-kamran">Kamran Akhtar — Boxing</fw-option>
  <fw-option value="t-nida">Nida Shah — Pilates</fw-option>
  <fw-option value="t-faisal">Faisal Mirza — CrossFit</fw-option>
  <fw-option value="t-amna">Amna Butt — Nutrition</fw-option>
  <fw-option value="t-danish">Danish Anwar — Swimming</fw-option>
  <fw-option value="t-rabia">Rabia Noor — Zumba</fw-option>`;

const meta: Meta<MultiSelectArgs> = {
  title: "UI/Inputs/Multi-select",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Pick any number of `<fw-option>`s from a list; choices show as removable chips and the form submits one entry per value. Use it for a bounded set of known choices — for free text, use tags input. `import "@formwright/ui/multi-select";`',
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    help: { control: "text" },
    error: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    searchable: { control: "boolean" },
    clearable: { control: "boolean" },
    max: { control: { type: "number", min: 1, step: 1 } },
    disabled: { control: "boolean" },
    required: { control: "boolean" },
  },
  args: {
    label: "Training days",
    placeholder: "Choose days",
    help: "",
    error: "",
    size: "md",
    searchable: false,
    clearable: true,
    max: undefined,
    disabled: false,
    required: false,
  },
};
export default meta;

type Story = StoryObj<MultiSelectArgs>;

export const Playground: Story = {
  render: (args) =>
    logEvents(
      canvas(`<fw-multi-select name="days" ${attrs({ ...args })}>${DAYS}</fw-multi-select>`),
      EVENTS,
    ),
};

export const SearchableWithMax: Story = {
  name: "Searchable, max 3",
  render: () =>
    logEvents(
      canvas(
        `<fw-multi-select label="Assigned trainers" name="trainers" searchable max="3" clearable
            placeholder="Search trainers" help="A member can have up to three trainers.">
          ${TRAINERS}
          <span slot="empty">No trainer matches</span>
        </fw-multi-select>`,
        {
          note: "<code>searchable</code> adds a filter box; once three are chosen, <code>max</code> disables the rest until one is removed.",
        },
      ),
      ["change"],
    ),
};

export const PreselectedInForm: Story = {
  name: "Preselected value in a form",
  render: () => {
    const host = canvas(
      `<form>
        <div class="sb-ui-body">
          <fw-multi-select label="Class schedule" name="days" value="mon,wed,fri" clearable required>
            ${DAYS}
          </fw-multi-select>
          <div class="sb-ui-row">
            <fw-button type="submit" variant="primary">Save schedule</fw-button>
            <fw-button type="reset" variant="secondary">Reset</fw-button>
          </div>
        </div>
      </form>
      <pre class="sb-ui-log" data-output>Submit to see the FormData.</pre>`,
      {
        note: '<code>value="mon,wed,fri"</code> preselects; Reset returns to it. The form gets one <code>days</code> entry per choice.',
      },
    );
    const form = host.querySelector("form")!;
    const output = host.querySelector<HTMLElement>("[data-output]")!;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      output.textContent = JSON.stringify([...new FormData(form).entries()]);
    });
    return logEvents(host, ["change"]);
  },
};

export const SizesAndStates: Story = {
  name: "Sizes and states",
  render: () =>
    canvas(`
      <fw-multi-select size="sm" label="Small" value="mon,tue">${DAYS}</fw-multi-select>
      <fw-multi-select size="md" label="Medium" value="mon,tue">${DAYS}</fw-multi-select>
      <fw-multi-select size="lg" label="Large" value="mon,tue">${DAYS}</fw-multi-select>
      <fw-multi-select label="Disabled" value="sat" disabled>${DAYS}</fw-multi-select>
      <fw-multi-select label="With error" required error="Pick at least one training day.">${DAYS}</fw-multi-select>
    `),
};
