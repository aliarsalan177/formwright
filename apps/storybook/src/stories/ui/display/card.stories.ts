import type { Meta, StoryObj } from "@storybook/html";
import { attrs, canvas, logEvents } from "../../../ui/story";

type Args = {
  variant: "outline" | "elevated" | "ghost";
  padding: "none" | "sm" | "md" | "lg";
  href: string;
  target: string;
};

const BANNER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f59e0b"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="320" height="120" fill="url(#g)"/><text x="20" y="72" font-family="system-ui,sans-serif" font-size="32" font-weight="700" fill="#fff">GOLD</text></svg>`,
  );

const meta: Meta<Args> = {
  title: "UI/Display/Card",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'A surface grouping related content, with media, header, body, footer and actions areas. Give it an `href` and the whole card becomes one real link while buttons in the footer and actions keep working. `import "@formwright/ui/card";`',
      },
    },
  },
  argTypes: {
    variant: { control: "select", options: ["outline", "elevated", "ghost"] },
    padding: { control: "select", options: ["none", "sm", "md", "lg"] },
    href: { control: "text", description: "Makes the card a link" },
    target: { control: "text" },
  },
  args: {
    variant: "outline",
    padding: "md",
    href: "",
    target: "",
  },
};
export default meta;

type Story = StoryObj<Args>;

export const Playground: Story = {
  render: (args) =>
    logEvents(
      canvas(
        `<fw-card ${attrs(args)}>
          <strong slot="header">Sara Khan</strong>
          Basic plan · expires 12 October.
          <span slot="footer">Last check-in: today, 6:42 pm</span>
          <fw-button slot="actions" size="sm" variant="secondary">Message</fw-button>
        </fw-card>`,
        { width: "22rem" },
      ),
      ["click"],
    ),
};

export const Variants: Story = {
  render: () =>
    canvas(
      `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:16px;padding:8px">
        ${(["outline", "elevated", "ghost"] as const)
          .map(
            (variant) =>
              `<fw-card variant="${variant}"><strong slot="header">${variant}</strong>Today's check-ins: 132</fw-card>`,
          )
          .join("")}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:16px;padding:8px">
        ${(["none", "sm", "md", "lg"] as const)
          .map((padding) => `<fw-card padding="${padding}">padding="${padding}"</fw-card>`)
          .join("")}
      </div>`,
      { width: "40rem" },
    ),
};

export const AllSlots: Story = {
  name: "Media, header, footer & actions",
  render: () => {
    const host = canvas(
      `<fw-card variant="elevated">
        <img slot="media" src="${BANNER}" alt="">
        <h3 slot="header">Gold plan</h3>
        Unlimited classes, locker access and 4 personal training sessions a month.
        <span slot="footer">PKR 12,000 / month · 248 members</span>
        <fw-button slot="actions" size="sm" data-plan="gold">Choose Gold</fw-button>
        <fw-button slot="actions" size="sm" variant="ghost">Compare plans</fw-button>
      </fw-card>`,
      { width: "22rem" },
    );
    const choose = host.querySelector<HTMLElement>("[data-plan]")!;
    choose.addEventListener("click", () => {
      choose.textContent = "Selected ✓";
    });
    return host;
  },
};

export const LinkedCard: Story = {
  name: "Whole-card link",
  render: () => {
    const host = canvas(
      `<div style="display:grid;gap:12px">
        <fw-card href="#member-42" variant="elevated" padding="sm">
          <strong slot="header">Ali Arsalan</strong>
          Gold plan · membership expires in 3 days.
          <fw-button slot="actions" size="sm" variant="secondary" data-action="renew">Renew</fw-button>
        </fw-card>
        <fw-card href="#member-57" padding="sm">
          <strong slot="header">Omar Farooq</strong>
          Basic plan · PKR 3,500 overdue.
          <fw-button slot="actions" size="sm" variant="secondary" data-action="remind">Send reminder</fw-button>
        </fw-card>
      </div>
      <p data-status style="margin:0;color:var(--fw-muted)">Click a card, or one of its buttons.</p>`,
      {
        note: "Anywhere on the card follows the link (a real <code>&lt;a&gt;</code> — try middle click). The buttons sit above the link overlay and get their own clicks.",
        width: "24rem",
      },
    );
    const status = host.querySelector<HTMLElement>("[data-status]")!;
    for (const card of host.querySelectorAll<HTMLElement>("fw-card")) {
      card.addEventListener("click", (event) => {
        const button = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
        if (button) {
          status.textContent = `Button: ${button.textContent?.trim() ?? ""} (link not followed)`;
          return;
        }
        // Keep the story on the page; a real app would let the link navigate.
        event.preventDefault();
        status.textContent = `Link: ${card.getAttribute("href") ?? ""}`;
      });
    }
    return host;
  },
};
