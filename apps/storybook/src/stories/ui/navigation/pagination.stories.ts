import type { Meta, StoryObj } from "@storybook/html";
import type { FwPagination } from "@formwright/ui/pagination";
import { attrs, canvas, logEvents } from "../../../ui/story";

interface PaginationArgs {
  page: number;
  totalPages: number | undefined;
  total: number | undefined;
  pageSize: number;
  siblings: number;
  boundaries: number;
  size: "sm" | "md" | "lg";
  compact: boolean;
  disabled: boolean;
  label: string;
}

const PAGE_EVENTS = ["fw-page-change", "change"];

const meta: Meta<PaginationArgs> = {
  title: "UI/Navigation/Pagination",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-pagination>` moves through pages of results with Previous, Next and a window of page numbers, or a compact “Page X of Y”. Use it under long tables and lists, such as the member directory.\n\n`import "@formwright/ui/pagination";`',
      },
    },
  },
  argTypes: {
    page: { control: { type: "number", min: 1, step: 1 } },
    totalPages: {
      control: { type: "number", min: 1, step: 1 },
      description: "Page count. When empty, it comes from `total` and `page-size`.",
    },
    total: {
      control: { type: "number", min: 0, step: 1 },
      description: "Total number of results.",
    },
    pageSize: { control: { type: "number", min: 1, step: 1 } },
    siblings: {
      control: { type: "number", min: 0, max: 4, step: 1 },
      description: "Pages shown either side of the current one.",
    },
    boundaries: {
      control: { type: "number", min: 0, max: 4, step: 1 },
      description: "Pages always shown at each end.",
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
    compact: { control: "boolean", description: "Show “Page X of Y” instead of numbers." },
    disabled: { control: "boolean" },
    label: { control: "text", description: "Accessible name of the `<nav>` landmark." },
  },
  args: {
    page: 5,
    totalPages: 20,
    total: undefined,
    pageSize: 10,
    siblings: 1,
    boundaries: 1,
    size: "md",
    compact: false,
    disabled: false,
    label: "Pagination",
  },
};
export default meta;

type Story = StoryObj<PaginationArgs>;

export const Playground: Story = {
  render: (args) =>
    logEvents(
      canvas(`<fw-pagination ${attrs({ ...args })}></fw-pagination>`, { width: "40rem" }),
      PAGE_EVENTS,
    ),
};

export const PageCount: Story = {
  name: "total-pages vs total + page-size",
  render: () =>
    logEvents(
      canvas(
        `<fw-pagination page="3" total-pages="12"></fw-pagination>
         <fw-pagination page="1" total="482" page-size="25"></fw-pagination>`,
        {
          width: "40rem",
          note: 'Top: `total-pages="12"`. Bottom: 482 members at 25 per page, so 20 pages.',
        },
      ),
      PAGE_EVENTS,
    ),
};

export const SiblingsAndBoundaries: Story = {
  name: "Siblings and boundaries",
  render: () =>
    logEvents(
      canvas(
        `<fw-pagination page="25" total-pages="50"></fw-pagination>
         <fw-pagination page="25" total-pages="50" siblings="2"></fw-pagination>
         <fw-pagination page="25" total-pages="50" siblings="0" boundaries="2"></fw-pagination>`,
        {
          width: "40rem",
          note: 'Default (1 sibling, 1 boundary), `siblings="2"`, and `siblings="0" boundaries="2"`. The number of buttons stays constant as the page moves.',
        },
      ),
      PAGE_EVENTS,
    ),
};

export const CompactAndSizes: Story = {
  name: "Compact + sizes",
  render: () =>
    logEvents(
      canvas(
        `<fw-pagination page="4" total-pages="9" size="sm"></fw-pagination>
         <fw-pagination page="4" total-pages="9" size="md"></fw-pagination>
         <fw-pagination page="4" total-pages="9" size="lg"></fw-pagination>
         <div class="sb-ui-row">
           <fw-pagination page="4" total-pages="9" compact size="sm"></fw-pagination>
           <fw-pagination page="4" total-pages="9" compact></fw-pagination>
           <fw-pagination page="4" total-pages="9" disabled></fw-pagination>
         </div>`,
        { width: "40rem", note: "`sm`, `md` and `lg`; then compact at two sizes, and disabled." },
      ),
      PAGE_EVENTS,
    ),
};

const MEMBERS = [
  ["Ali Arsalan", "Gold quarterly"],
  ["Sana Malik", "Monthly"],
  ["Hamza Qureshi", "Yearly"],
  ["Ayesha Khan", "Monthly"],
  ["Bilal Ahmed", "Gold quarterly"],
  ["Fatima Raza", "Yearly"],
  ["Usman Tariq", "Monthly"],
  ["Zainab Iqbal", "Student monthly"],
  ["Omar Siddiqui", "Gold quarterly"],
  ["Hina Shah", "Monthly"],
  ["Danish Butt", "Yearly"],
  ["Mehwish Ali", "Monthly"],
  ["Kamran Javed", "Student monthly"],
] as const;

export const DrivingAList: Story = {
  name: "Driving a member list",
  render: () => {
    const pageSize = 4;
    const host = canvas(
      `<ul class="members" style="margin:0;padding:0;list-style:none;min-height:9rem"></ul>
       <p class="summary" style="margin:0;color:var(--fw-muted);font-size:0.875rem"></p>
       <fw-pagination page="1" total="${MEMBERS.length}" page-size="${pageSize}" label="Members pages"></fw-pagination>`,
      { note: "`fw-page-change` re-renders the list with the members on the chosen page." },
    );
    const list = host.querySelector<HTMLUListElement>(".members")!;
    const summary = host.querySelector<HTMLParagraphElement>(".summary")!;
    const pagination = host.querySelector<FwPagination>("fw-pagination")!;

    const show = (page: number) => {
      const start = (page - 1) * pageSize;
      const rows = MEMBERS.slice(start, start + pageSize);
      list.replaceChildren(
        ...rows.map(([name, plan]) => {
          const li = document.createElement("li");
          li.style.cssText =
            "display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--fw-border)";
          const who = document.createElement("span");
          who.textContent = name;
          const what = document.createElement("span");
          what.style.color = "var(--fw-muted)";
          what.textContent = plan;
          li.append(who, what);
          return li;
        }),
      );
      summary.textContent = `Showing ${start + 1}–${start + rows.length} of ${MEMBERS.length} members`;
    };

    pagination.addEventListener("fw-page-change", (event) => {
      show((event as CustomEvent<{ page: number }>).detail.page);
    });
    show(1);
    return logEvents(host, PAGE_EVENTS);
  },
};
