import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas, logEvents } from "../../../ui/story";

interface AccordionArgs {
  multiple: boolean;
  headingLevel: number;
}

const ACCORDION_EVENTS = ["change", "fw-show", "fw-hide"];

const meta: Meta<AccordionArgs> = {
  title: "UI/Navigation/Accordion",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-accordion>` stacks `<fw-accordion-item>`s whose headers show and hide a section, following the WAI-ARIA accordion pattern. Use it for FAQs, settings groups, or long content readers only need part of.\n\n`import "@formwright/ui/accordion";`',
      },
    },
  },
  argTypes: {
    multiple: { control: "boolean", description: "Let several items stay open at once." },
    headingLevel: {
      control: { type: "number", min: 2, max: 6, step: 1 },
      description: "Heading level (2–6) every item header is announced at.",
    },
  },
  args: {
    multiple: false,
    headingLevel: 3,
  },
};
export default meta;

type Story = StoryObj<AccordionArgs>;

export const Playground: Story = {
  render: (args) =>
    logEvents(
      canvas(
        `<fw-accordion ${attrs({ ...args })}>
          <fw-accordion-item heading="Membership plans" open>
            Monthly PKR 8,000, quarterly PKR 22,000 or yearly PKR 80,000.
          </fw-accordion-item>
          <fw-accordion-item heading="Opening hours">
            Monday to Saturday 6:00–23:00, Sunday 8:00–20:00.
          </fw-accordion-item>
          <fw-accordion-item heading="Personal training">
            Sessions with a certified trainer from PKR 2,500 each.
          </fw-accordion-item>
        </fw-accordion>`,
      ),
      ACCORDION_EVENTS,
    ),
};

export const SingleVsMultiple: Story = {
  name: "Single vs multiple",
  render: () => {
    const items = `
      <fw-accordion-item heading="Monthly plan" open>PKR 8,000 · gym floor and lockers.</fw-accordion-item>
      <fw-accordion-item heading="Quarterly plan">PKR 22,000 · adds group classes.</fw-accordion-item>
      <fw-accordion-item heading="Yearly plan">PKR 80,000 · adds 4 personal training sessions.</fw-accordion-item>`;
    return logEvents(
      canvas(
        `<h4 style="margin:0">Single (default)</h4>
         <fw-accordion>${items}</fw-accordion>
         <h4 style="margin:0">Multiple</h4>
         <fw-accordion multiple>${items}</fw-accordion>`,
        { note: "By default opening one item closes the others; with `multiple` they stay open." },
      ),
      ACCORDION_EVENTS,
    );
  },
};

export const DisabledItem: Story = {
  name: "Disabled item",
  render: () =>
    logEvents(
      canvas(
        `<fw-accordion>
          <fw-accordion-item heading="Contact details" open>
            Ali Arsalan · ali@example.com · +92 300 1234567
          </fw-accordion-item>
          <fw-accordion-item heading="Payment history">
            3 payments this year, PKR 24,000 in total.
          </fw-accordion-item>
          <fw-accordion-item heading="Body composition (trainer only)" disabled>
            Only visible to the assigned trainer.
          </fw-accordion-item>
        </fw-accordion>`,
        {
          note: "Disabled headers can't be opened and are skipped by Arrow Up/Down, Home and End.",
        },
      ),
      ACCORDION_EVENTS,
    ),
};

export const Faq: Story = {
  name: "FAQ (heading level 2)",
  render: () =>
    logEvents(
      canvas(
        `<fw-accordion heading-level="2">
          <fw-accordion-item heading="Can I freeze my membership?">
            Yes. Plans can be frozen once a year for up to 30 days at no charge — ask at the front desk.
          </fw-accordion-item>
          <fw-accordion-item heading="Which payment methods do you accept?">
            Cash, debit and credit cards, JazzCash and Easypaisa. Receipts are emailed automatically.
          </fw-accordion-item>
          <fw-accordion-item>
            <span slot="heading">Is there a <strong>registration fee</strong>?</span>
            A one-time PKR 2,000 fee, waived on yearly plans.
          </fw-accordion-item>
          <fw-accordion-item heading="Can I bring a guest?">
            Members on quarterly and yearly plans get two guest passes a month.
          </fw-accordion-item>
        </fw-accordion>`,
        {
          note: "Headers are announced as level-2 headings. The third item uses the `heading` slot for rich text.",
        },
      ),
      ACCORDION_EVENTS,
    ),
};
