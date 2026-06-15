import type { Meta, StoryObj } from "@storybook/html";
import { mountThemeBuilderMini } from "../../mounts/theme-builder";

const meta: Meta = {
  title: "Apps/Theme Builder",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Mini: Story = {
  name: "Theme builder (mini)",
  render: () => mountThemeBuilderMini(),
};
