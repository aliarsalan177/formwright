import type { Meta, StoryObj } from "@storybook/html";
import { canvas, logEvents } from "../../../ui/story";

const meta: Meta = {
  title: "UI/Form Controls/Complete form",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Every form control is form-associated, so they work inside a plain `<form>`: they submit through `FormData`, take part in constraint validation and reset with the form. `import "@formwright/ui";`',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

/** FormData as a plain object, keeping every value of a repeated name. */
function formToObject(
  form: HTMLFormElement,
): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const data = new FormData(form);
  const result: Record<string, FormDataEntryValue | FormDataEntryValue[]> =
    Object.fromEntries(data);
  for (const key of new Set(data.keys())) {
    const all = data.getAll(key);
    if (all.length > 1) result[key] = all;
  }
  return result;
}

export const MemberRegistration: Story = {
  name: "Member registration",
  render: () => {
    const host = canvas(
      `<form>
        <div class="sb-ui-body">
          <fw-input label="Full name" name="name" required autocomplete="name"></fw-input>
          <fw-input type="email" label="Email" name="email" help="Receipts are sent here"></fw-input>
          <fw-input type="tel" label="Phone" name="phone" required placeholder="300 1234567">
            <span slot="prefix">+92</span>
          </fw-input>
          <fw-input type="date" label="Date of birth" name="dob"></fw-input>
          <fw-select label="Branch" name="branch" placeholder="Select a branch" required>
            <fw-option value="dha">DHA Phase 5</fw-option>
            <fw-option value="gulberg">Gulberg III</fw-option>
            <fw-option value="johar" disabled>Johar Town (opening soon)</fw-option>
          </fw-select>
          <fw-radio-group label="Plan" name="plan" value="standard" orientation="horizontal">
            <fw-radio value="basic">Basic</fw-radio>
            <fw-radio value="standard">Standard</fw-radio>
            <fw-radio value="premium">Premium</fw-radio>
          </fw-radio-group>
          <fw-input type="number" label="Admission fee" name="fee" value="3000" min="0" step="500">
            <span slot="prefix">PKR</span>
          </fw-input>
          <fieldset style="border: 0; padding: 0; margin: 0; min-width: 0">
            <legend style="padding: 0; margin-bottom: 8px; font-size: var(--fw-font-size); font-weight: 500">Goals</legend>
            <div class="sb-ui-row">
              <fw-checkbox name="goals" value="weight-loss" checked>Weight loss</fw-checkbox>
              <fw-checkbox name="goals" value="strength">Strength</fw-checkbox>
              <fw-checkbox name="goals" value="cardio" checked>Cardio</fw-checkbox>
            </div>
          </fieldset>
          <fw-slider label="Sessions per week" name="sessions" min="1" max="7" value="3" show-value></fw-slider>
          <fw-textarea label="Medical notes" name="notes" maxlength="200" counter autoresize></fw-textarea>
          <fw-switch name="sms" value="yes" checked>SMS payment reminders</fw-switch>
          <fw-checkbox name="waiver" value="accepted" required>I accept the liability waiver</fw-checkbox>
          <div class="sb-ui-row">
            <fw-button type="submit">Register member</fw-button>
            <fw-button type="reset" variant="secondary">Reset</fw-button>
            <fw-button id="check" variant="ghost">Check validity</fw-button>
          </div>
        </div>
      </form>
      <pre class="sb-ui-log" id="output">Submit the form to see its FormData.</pre>`,
      {
        width: "36rem",
        note: "Press <b>Register member</b> with the required fields empty: validation blocks the submit and the browser points at the first invalid field. <b>Check validity</b> calls <code>form.reportValidity()</code> directly. Once valid, the submitted <code>FormData</code> is printed below; repeated names such as <code>goals</code> are collected with <code>getAll</code>.",
      },
    );
    const form = host.querySelector("form")!;
    const output = host.querySelector("#output")!;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      output.textContent = JSON.stringify(formToObject(form), null, 2);
    });
    form.addEventListener("reset", () => {
      output.textContent = "Form reset to its initial values.";
    });
    host.querySelector("#check")!.addEventListener("click", () => {
      const valid = form.reportValidity();
      output.textContent = valid
        ? "form.reportValidity() → true: the form can be submitted."
        : "form.reportValidity() → false: a required or invalid field blocks submission.";
    });
    return logEvents(host, ["submit", "reset"]);
  },
};
