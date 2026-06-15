import type { Meta, StoryObj } from "@storybook/html";
import { mountFormStory } from "../../helpers/mount";
import { CHECKOUT, SHOWCASE, SIGNUP } from "../../fixtures/forms";

const meta: Meta = {
  title: "Formwright/Forms/Basic",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Core field types, validation, and conditional visibility.",
      },
    },
  },
};
export default meta;

type Story = StoryObj;

export const SignUpWithConsentCache: Story = {
  name: "Sign up + consent cache",
  render: () => mountFormStory(SIGNUP),
};

export const CheckoutGroupAndCollection: Story = {
  name: "Checkout — group + collection",
  render: () => mountFormStory(CHECKOUT),
};

export const ShowcaseLayout: Story = {
  name: "Showcase — layout & conditions",
  render: () => mountFormStory(SHOWCASE),
};
