import type { Meta, StoryObj } from "@storybook/html";
import { mountFormStory } from "../../helpers/mount";
import { WIZARD, wizardWithLayout } from "../../fixtures/forms";

const meta: Meta = {
  title: "Formwright/Wizard UX",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Multi-step wizards with fill/bar/tabs/numbers progress, URL sync, consent-based draft cache, resume banner, and post-submit success screens.",
      },
    },
  },
};
export default meta;

type Story = StoryObj;

export const FullUX: Story = {
  name: "Full UX (fill + URL + cache + success)",
  render: () => mountFormStory(WIZARD),
};

export const BarProgress: Story = {
  name: "Bar progress",
  render: () => mountFormStory(wizardWithLayout("bar")),
};

export const TabProgress: Story = {
  name: "Tab progress",
  render: () => mountFormStory(wizardWithLayout("tabs")),
};

export const NumberedProgress: Story = {
  name: "Numbered progress",
  render: () => mountFormStory(wizardWithLayout("numbers")),
};
