import type { Meta, StoryObj } from "@storybook/html";
import type { FwTagsInput, TagEventDetail } from "@formwright/ui/tags-input";
import { attrs, canvas, logEvents } from "../../../ui/story";

interface TagsInputArgs {
  label: string;
  placeholder: string;
  help: string;
  error: string;
  size: "sm" | "md" | "lg";
  separators: string;
  pattern: string;
  max: number | undefined;
  allowDuplicates: boolean;
  disabled: boolean;
  required: boolean;
}

const EVENTS = ["fw-tag-add", "fw-tag-remove", "input", "change"];

const meta: Meta<TagsInputArgs> = {
  title: "UI/Inputs/Tags input",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Free-text tokens — emails, goals, keywords — typed and turned into removable tags with Enter or a separator. Use it when the values are open-ended; for a fixed list, use multi-select. `import "@formwright/ui/tags-input";`',
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    help: { control: "text" },
    error: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    separators: { control: "text" },
    pattern: { control: "text" },
    max: { control: { type: "number", min: 1, step: 1 } },
    allowDuplicates: { control: "boolean" },
    disabled: { control: "boolean" },
    required: { control: "boolean" },
  },
  args: {
    label: "Fitness goals",
    placeholder: "Add a goal",
    help: "Press Enter or type a comma to add.",
    error: "",
    size: "md",
    separators: ",",
    pattern: "",
    max: undefined,
    allowDuplicates: false,
    disabled: false,
    required: false,
  },
};
export default meta;

type Story = StoryObj<TagsInputArgs>;

export const Playground: Story = {
  render: (args) =>
    logEvents(
      canvas(
        `<fw-tags-input name="goals" value="weight loss,stamina" ${attrs({ ...args })}></fw-tags-input>`,
      ),
      EVENTS,
    ),
};

export const EmailInvites: Story = {
  name: "Email invites (pattern, max, separators)",
  render: () =>
    logEvents(
      canvas(
        `<fw-tags-input label="Invite family members" name="emails" separators=", ;" max="5"
            pattern="[^@\\s]+@[^@\\s]+\\.[^@\\s]+" placeholder="name@example.com"
            help="Up to 5 addresses. Separate with comma, space or semicolon."></fw-tags-input>`,
        {
          note: "Text that is not an email, a duplicate, or a sixth address stays in the box and the field says why.",
        },
      ),
      EVENTS,
    ),
};

export const PasteToSplit: Story = {
  name: "Paste to split",
  render: () =>
    logEvents(
      canvas(
        `<fw-tags-input label="Equipment to order" name="equipment" separators=",;"
            placeholder="Paste a list here"></fw-tags-input>`,
        {
          note: "Copy this and paste it into the field — it splits on the separators and on new lines:<br><code>Kettlebell 16kg, Resistance bands; Yoga mats<br>Foam roller</code>",
        },
      ),
      ["fw-tag-add", "change"],
    ),
};

export const CancelableAdd: Story = {
  name: "Refusing a tag (cancelable event)",
  render: () => {
    const host = canvas(
      `<fw-tags-input label="Class keywords" name="keywords" value="hiit,cardio"
          help="“admin” and “staff” are reserved."></fw-tags-input>`,
      {
        note: "<code>fw-tag-add</code> is cancelable: this story calls <code>preventDefault()</code> for reserved words.",
      },
    );
    const tags = host.querySelector<FwTagsInput>("fw-tags-input")!;
    tags.addEventListener("fw-tag-add", (event) => {
      const { value } = (event as CustomEvent<TagEventDetail>).detail;
      if (["admin", "staff"].includes(value.toLowerCase())) event.preventDefault();
    });
    return logEvents(host, EVENTS);
  },
};

export const SizesAndStates: Story = {
  name: "Sizes and states",
  render: () =>
    canvas(`
      <fw-tags-input size="sm" label="Small" value="yoga,pilates"></fw-tags-input>
      <fw-tags-input size="md" label="Medium" value="yoga,pilates"></fw-tags-input>
      <fw-tags-input size="lg" label="Large" value="yoga,pilates"></fw-tags-input>
      <fw-tags-input label="Disabled" value="boxing" disabled></fw-tags-input>
      <fw-tags-input label="With error" required error="Add at least one specialty for this trainer."></fw-tags-input>
    `),
};
