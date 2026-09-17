import type { Meta, StoryObj } from "@storybook/html";
import type { FwDialog } from "@formwright/ui/dialog";
import { showToast, type ToastHandle } from "@formwright/ui/toast";
import { attrs, canvas, logEvents } from "../../../ui/story";

type DialogArgs = {
  heading: string;
  size: "sm" | "md" | "lg" | "xl" | "full";
  dismissible: boolean;
  noHeader: boolean;
  open: boolean;
};

const meta: Meta<DialogArgs> = {
  title: "UI/Overlays/Dialog",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          '`<fw-dialog>` is a modal dialog on a native `<dialog>`: the page behind goes inert, focus moves in and back, and Escape, the backdrop and the close button all go through a cancelable `fw-request-close`. Use it for focused tasks and confirmations. `import "@formwright/ui/dialog";`',
      },
    },
  },
  argTypes: {
    heading: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg", "xl", "full"] },
    dismissible: { control: "boolean" },
    noHeader: { control: "boolean" },
    open: { control: "boolean" },
  },
  args: {
    heading: "Renew membership",
    size: "md",
    dismissible: true,
    noHeader: false,
    open: false,
  },
};
export default meta;

type Story = StoryObj<DialogArgs>;

const EVENTS = ["fw-show", "fw-after-show", "fw-request-close", "fw-hide", "fw-after-hide"];

/** `[data-open="x"]` buttons open `fw-dialog[data-dialog="x"]`; `[data-close]` inside a dialog asks it to close. */
function wire(host: HTMLElement): void {
  for (const button of host.querySelectorAll<HTMLElement>("[data-open]")) {
    const dialog = host.querySelector<FwDialog>(`fw-dialog[data-dialog="${button.dataset.open}"]`);
    button.addEventListener("click", () => dialog?.show());
  }
  for (const button of host.querySelectorAll<HTMLElement>("fw-dialog [data-close]")) {
    button.addEventListener("click", () => button.closest("fw-dialog")?.hide());
  }
}

export const Playground: Story = {
  render: ({ dismissible, ...rest }) => {
    const host = canvas(
      `<fw-button data-open="main">Open dialog</fw-button>
      <fw-dialog data-dialog="main" ${attrs({ ...rest, dismissible: dismissible ? undefined : "false" })}>
        <p style="margin-top:0">Extend Sara Khan's Gold plan by one month for <strong>PKR 12,000</strong>?</p>
        <p style="margin-bottom:0">The new end date will be 12 November.</p>
        <fw-button slot="footer" variant="secondary" data-close>Cancel</fw-button>
        <fw-button slot="footer" data-close>Renew</fw-button>
      </fw-dialog>`,
    );
    wire(host);
    return logEvents(host, EVENTS);
  },
};

export const SizesWithFooter: Story = {
  name: "Sizes and footer",
  render: () => {
    const sizes = ["sm", "md", "lg", "xl", "full"] as const;
    const host = canvas(
      `<div class="sb-ui-row">
        ${sizes.map((size) => `<fw-button variant="secondary" data-open="${size}">Open ${size}</fw-button>`).join("")}
      </div>
      ${sizes
        .map(
          (
            size,
          ) => `<fw-dialog data-dialog="${size}" size="${size}" heading="Payment history (${size})">
            <p style="margin-top:0">Last three payments for Bilal Ahmed:</p>
            <ul style="margin:0;padding-inline-start:1.25rem">
              <li>12 Sep · Gold plan · PKR 12,000 · Cash</li>
              <li>12 Aug · Gold plan · PKR 12,000 · JazzCash</li>
              <li>12 Jul · Personal training · PKR 4,500 · Card</li>
            </ul>
            <fw-button slot="footer" variant="ghost" data-close>Close</fw-button>
            <fw-button slot="footer" data-close>Download receipt</fw-button>
          </fw-dialog>`,
        )
        .join("")}`,
      { width: "40rem", note: "Header and footer stay pinned while the body scrolls." },
    );
    wire(host);
    return logEvents(host, EVENTS);
  },
};

export const Confirmation: Story = {
  name: "Non-dismissible confirmation",
  render: () => {
    const host = canvas(
      `<fw-button variant="danger" data-open="confirm">Delete member</fw-button>
      <p data-result style="margin:0"></p>
      <fw-dialog data-dialog="confirm" heading="Delete Ayesha Khan?" size="sm" dismissible="false">
        <p style="margin:0">Her attendance history and PKR 3,000 outstanding balance will be removed. This cannot be undone.</p>
        <fw-button slot="footer" variant="secondary" data-answer="kept">Keep member</fw-button>
        <fw-button slot="footer" variant="danger" data-answer="deleted">Delete</fw-button>
      </fw-dialog>`,
      {
        note: '<code>dismissible="false"</code>: no close button, Escape and the backdrop do nothing, and the dialog gets <code>role="alertdialog"</code>. It has to be answered.',
      },
    );
    wire(host);
    const dialog = host.querySelector<FwDialog>("fw-dialog")!;
    const result = host.querySelector<HTMLElement>("[data-result]")!;
    for (const button of host.querySelectorAll<HTMLElement>("[data-answer]")) {
      button.addEventListener("click", () => {
        result.textContent = `Member ${button.dataset.answer}.`;
        dialog.open = false;
      });
    }
    return logEvents(host, EVENTS);
  },
};

export const UnsavedChanges: Story = {
  name: "Unsaved changes guard",
  render: () => {
    const host = canvas(
      `<fw-button data-open="edit">Edit member</fw-button>
      <fw-dialog data-dialog="edit" heading="Edit member">
        <div style="display:grid;gap:.75rem">
          <fw-input name="name" label="Full name" value="Hamza Siddiqui"></fw-input>
          <fw-input name="phone" type="tel" label="Phone" value="0301 5557788"></fw-input>
        </div>
        <fw-button slot="footer" variant="secondary" data-close>Cancel</fw-button>
        <fw-button slot="footer" data-save>Save</fw-button>
      </fw-dialog>
      <fw-dialog data-dialog="discard" heading="Discard changes?" size="sm" dismissible="false">
        <p style="margin:0">You edited this member. Close without saving?</p>
        <fw-button slot="footer" variant="secondary" data-keep>Keep editing</fw-button>
        <fw-button slot="footer" variant="danger" data-discard>Discard</fw-button>
      </fw-dialog>`,
      {
        note: "Change a field, then press Escape, click the backdrop or Cancel. <code>fw-request-close</code> is cancelled with <code>preventDefault()</code> and a second dialog asks first.",
      },
    );
    wire(host);
    const edit = host.querySelector<FwDialog>('fw-dialog[data-dialog="edit"]')!;
    const discard = host.querySelector<FwDialog>('fw-dialog[data-dialog="discard"]')!;
    let dirty = false;
    edit.addEventListener("input", () => (dirty = true));
    edit.addEventListener("fw-show", (event) => {
      if (event.target === edit) dirty = false;
    });
    edit.addEventListener("fw-request-close", (event) => {
      if (event.target !== edit || !dirty) return;
      event.preventDefault();
      discard.show();
    });
    host.querySelector("[data-save]")!.addEventListener("click", () => {
      dirty = false;
      edit.hide();
    });
    host.querySelector("[data-keep]")!.addEventListener("click", () => {
      discard.open = false;
    });
    host.querySelector("[data-discard]")!.addEventListener("click", () => {
      discard.open = false;
      dirty = false;
      edit.open = false;
    });
    return logEvents(host, EVENTS);
  },
};

export const ToastAboveDialog: Story = {
  name: "Toast above the dialog",
  render: () => {
    const host = canvas(
      `<fw-button data-open="pay">Record payment</fw-button>
      <fw-dialog data-dialog="pay" heading="Record payment">
        <div style="display:grid;gap:.75rem">
          <fw-input name="amount" type="number" label="Amount" value="8500"><span slot="prefix">PKR</span></fw-input>
          <p style="margin:0">Press <strong>Save</strong>: the toast appears above the dialog and its Undo button is clickable while the dialog stays open.</p>
        </div>
        <fw-button slot="footer" variant="secondary" data-close>Close</fw-button>
        <fw-button slot="footer" data-save>Save</fw-button>
      </fw-dialog>
      <pre class="sb-ui-log" data-output>Toast actions will appear here.</pre>`,
    );
    wire(host);
    const output = host.querySelector<HTMLElement>("[data-output]")!;
    const handles: ToastHandle[] = [];
    host.querySelector("[data-save]")!.addEventListener("click", () => {
      handles.push(
        showToast({
          tone: "success",
          heading: "Payment recorded",
          message: "PKR 8,500 from Bilal Ahmed.",
          action: {
            label: "Undo",
            onClick: () => {
              output.textContent = "Undo clicked: payment reversed.";
            },
          },
        }),
      );
    });
    host.__storyDispose = () => handles.forEach((handle) => handle.dismiss());
    return logEvents(host, EVENTS);
  },
};
