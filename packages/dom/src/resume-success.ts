import type { Form } from "@formwright/core";
import { resolve } from "@formwright/core";
import { h, on, Scope } from "./internal.js";
import { renderActionBar } from "./render-shared.js";

/** Resume-draft banner when `persistKey` restored a previous session. */
export function renderResumeBanner(form: Form, scope: Scope): HTMLElement {
  const providers = form.options.providers;
  const cfg = form.schema.persist;
  const banner = h("div", { class: "fw-resume-banner", role: "status", hidden: "" });
  banner.hidden = true;
  banner.style.display = "none";

  const text = h("span", { class: "fw-resume-text" });
  const resumeBtn = h("button", { type: "button", class: "fw-resume-continue" });
  const discardBtn = h("button", { type: "button", class: "fw-resume-discard" });

  const msg = resolve(cfg?.resumeMessage, providers);
  text.textContent =
    typeof msg === "string" ? msg : "You have a saved draft. Continue where you left off?";
  const resumeLabel = resolve(cfg?.resumeLabel, providers);
  resumeBtn.textContent = typeof resumeLabel === "string" ? resumeLabel : "Continue";
  const discardLabel = resolve(cfg?.discardLabel, providers);
  discardBtn.textContent = typeof discardLabel === "string" ? discardLabel : "Start over";

  on(scope, resumeBtn, "click", () => form.dismissResumeBanner());
  on(scope, discardBtn, "click", () => form.discardDraft());

  banner.append(text, resumeBtn, discardBtn);

  scope.bind(() => {
    const show = form.showResumeBanner.get();
    banner.hidden = !show;
    banner.style.display = show ? "" : "none";
  });

  return banner;
}

/** Opt-in banner before writing to `localStorage` (`persist.mode: "consent"`). */
export function renderPersistConsentBanner(form: Form, scope: Scope): HTMLElement {
  const providers = form.options.providers;
  const cfg = form.schema.persist;
  const banner = h("div", { class: "fw-persist-consent", role: "status", hidden: "" });
  banner.hidden = true;
  banner.style.display = "none";

  const text = h("span", { class: "fw-persist-consent-text" });
  const acceptBtn = h("button", { type: "button", class: "fw-persist-consent-accept" });
  const declineBtn = h("button", { type: "button", class: "fw-persist-consent-decline" });

  const msg = resolve(cfg?.consentMessage, providers);
  text.textContent =
    typeof msg === "string"
      ? msg
      : "Save your progress on this device? We'll restore it if you refresh before submitting.";
  const acceptLabel = resolve(cfg?.consentLabel, providers);
  acceptBtn.textContent = typeof acceptLabel === "string" ? acceptLabel : "Save my progress";
  const declineLabel = resolve(cfg?.declineLabel, providers);
  declineBtn.textContent = typeof declineLabel === "string" ? declineLabel : "Not now";

  on(scope, acceptBtn, "click", () => form.grantPersistConsent());
  on(scope, declineBtn, "click", () => form.declinePersistConsent());

  banner.append(text, acceptBtn, declineBtn);

  scope.bind(() => {
    const show = form.showPersistConsent.get();
    banner.hidden = !show;
    banner.style.display = show ? "" : "none";
  });

  return banner;
}

/** Built-in post-submit success screen from `schema.success`. */
export function renderSuccessScreen(form: Form, scope: Scope): HTMLElement {
  const providers = form.options.providers;
  const cfg = form.schema.success;
  const panel = h("section", { class: "fw-success", role: "status", hidden: "" });
  panel.hidden = true;
  panel.style.display = "none";

  const heading = h("h2", { class: "fw-success-heading" });
  const message = h("p", { class: "fw-success-message" });
  const details = h("ul", { class: "fw-success-details" });
  const actionsHost = h("div", { class: "fw-success-actions" });

  panel.append(heading, message, details, actionsHost);

  scope.bind(() => {
    const show = form.showSuccessScreen.get();
    form.successData.get(); // re-render when the submit response arrives
    panel.hidden = !show;
    panel.style.display = show ? "" : "none";
    if (!show || !cfg) return;

    const ctx = form.successContext();
    const head = resolve(cfg.heading, providers);
    heading.textContent =
      typeof head === "string" ? ctx.interpolate(head) : "Submitted successfully";
    heading.hidden = !heading.textContent;

    const msg = resolve(cfg.message, providers);
    message.textContent =
      typeof msg === "string" ? ctx.interpolate(msg) : "Thank you — your response was received.";
    message.hidden = !message.textContent;

    details.replaceChildren();
    if (cfg.details?.length) {
      for (const line of cfg.details) {
        const resolved = resolve(line, providers);
        if (typeof resolved !== "string") continue;
        const li = h("li");
        li.textContent = ctx.interpolate(resolved);
        details.appendChild(li);
      }
    }
    details.hidden = details.childElementCount === 0;

    actionsHost.replaceChildren();
    if (cfg.actions?.length) {
      const bar = renderActionBar(form, scope, cfg.actions);
      actionsHost.appendChild(bar);
    }
  });

  return panel;
}
