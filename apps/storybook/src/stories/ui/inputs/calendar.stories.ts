import type { Meta, StoryObj } from "@storybook/html";
import type { FwCalendar } from "@formwright/ui/calendar";
import { attrs, canvas, logEvents } from "../../../ui/story";

interface CalendarArgs {
  mode: "single" | "range";
  value: string;
  min: string;
  max: string;
  locale: string;
  firstDayOfWeek: number | undefined;
  months: number;
  showOutsideDays: boolean;
  today: string;
  disabled: boolean;
}

const EVENTS = ["change", "fw-select"];

const meta: Meta<CalendarArgs> = {
  title: "UI/Inputs/Calendar",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'An inline month grid for picking a date or a range, with full keyboard support and locale-aware names. Use it on its own for schedules and booking screens; for a form field, use the date picker. `import "@formwright/ui/calendar";`',
      },
    },
  },
  argTypes: {
    mode: { control: "select", options: ["single", "range"] },
    value: { control: "text", description: "ISO date (single mode)." },
    min: { control: "text" },
    max: { control: "text" },
    locale: { control: "text" },
    firstDayOfWeek: { control: { type: "number", min: 0, max: 6, step: 1 } },
    months: { control: { type: "number", min: 1, max: 3, step: 1 } },
    showOutsideDays: { control: "boolean" },
    today: { control: "text" },
    disabled: { control: "boolean" },
  },
  args: {
    mode: "single",
    value: "2026-09-17",
    min: "",
    max: "",
    locale: "",
    firstDayOfWeek: undefined,
    months: 1,
    showOutsideDays: true,
    today: "2026-09-17",
    disabled: false,
  },
};
export default meta;

type Story = StoryObj<CalendarArgs>;

export const Playground: Story = {
  render: ({ showOutsideDays, ...rest }) =>
    logEvents(
      canvas(
        `<fw-calendar show-outside-days="${String(showOutsideDays)}" ${attrs({ ...rest })}></fw-calendar>`,
        { width: "48rem" },
      ),
      EVENTS,
    ),
};

export const Range: Story = {
  name: "Range over two months",
  render: () =>
    logEvents(
      canvas(
        `<fw-calendar mode="range" months="2" today="2026-09-17"
            value-start="2026-09-20" value-end="2026-10-04"></fw-calendar>`,
        {
          width: "48rem",
          note: "A trainer's leave: pick the start, hover to preview, pick the end. <code>fw-select</code> carries <code>{ start, end }</code>.",
        },
      ),
      EVENTS,
    ),
};

export const MinAndMax: Story = {
  name: "Min and max",
  render: () =>
    logEvents(
      canvas(
        `<fw-calendar today="2026-09-17" value="2026-09-22" min="2026-09-17" max="2026-10-10"></fw-calendar>`,
        { note: "Trial class booking: only 17 September to 10 October 2026 can be picked." },
      ),
      EVENTS,
    ),
};

export const FridaysDisabled: Story = {
  name: "Disabled dates (Fridays)",
  render: () => {
    const host = canvas(`<fw-calendar today="2026-09-17" value="2026-09-17"></fw-calendar>`, {
      note: "The gym is closed on Fridays: <code>isDateDisabled</code> is a property, set from script.",
    });
    const calendar = host.querySelector<FwCalendar>("fw-calendar")!;
    calendar.isDateDisabled = (iso) => new Date(`${iso}T12:00`).getDay() === 5;
    return logEvents(host, EVENTS);
  },
};

export const FirstDayOfWeek: Story = {
  name: "First day of week",
  render: () =>
    canvas(
      `<div class="sb-ui-row" style="align-items: flex-start">
        <fw-calendar today="2026-09-17" value="2026-09-17" first-day-of-week="0"></fw-calendar>
        <fw-calendar today="2026-09-17" value="2026-09-17" first-day-of-week="1"></fw-calendar>
        <fw-calendar today="2026-09-17" value="2026-09-17" first-day-of-week="6"></fw-calendar>
      </div>`,
      {
        width: "72rem",
        note: "Sunday (0), Monday (1) and Saturday (6). Without the attribute the week starts on the locale's first day.",
      },
    ),
};
