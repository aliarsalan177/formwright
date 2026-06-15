import type { FormOptions, FormSchema } from "@formwright/core";
import { Form } from "@formwright/core";
import "@formwright/dom";

export type StoryHost = HTMLElement & { __storyDispose?: () => void };

/** Mount a Form into a story container; returns the wrapper with a dispose hook. */
export function mountFormStory(
  schema: FormSchema,
  initialValues: Record<string, unknown> = {},
  options: FormOptions = {},
): StoryHost {
  const wrap = document.createElement("div") as StoryHost;
  wrap.className = "sb-form-story";

  const host = document.createElement("div");
  host.className = "form-host";
  wrap.appendChild(host);

  const persistKey = schema.persist ? `storybook-${schema.id}` : options.persistKey;
  const form = new Form(schema, initialValues, {
    ...options,
    ...(persistKey ? { persistKey } : {}),
    send:
      options.send ??
      (async (payload) => {
        const p = payload as {
          wizard?: { account?: { email?: string }; preferences?: { plan?: string } };
          email?: string;
        };
        return {
          referenceId: `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          email: p.wizard?.account?.email ?? p.email ?? "demo@example.com",
          plan: p.wizard?.preferences?.plan ?? "free",
        };
      }),
    handlers: {
      closeSuccess: (_data, form) => form.dismissSuccess(),
      ...options.handlers,
    },
  });

  form.mount(host);
  wrap.__storyDispose = () => form.destroy();
  return wrap;
}

/** Grid / app story shell with optional toolbar and footer. */
export function mountAppStory(
  title: string,
  subtitle?: string,
): {
  wrap: StoryHost;
  body: HTMLElement;
  toolbar: HTMLElement;
  foot: HTMLElement;
  setDispose: (fn: () => void) => void;
} {
  const wrap = document.createElement("div") as StoryHost;
  wrap.className = "sb-app-story";

  const head = document.createElement("div");
  head.className = "sb-app-head";
  const h = document.createElement("h3");
  h.textContent = title;
  head.appendChild(h);
  if (subtitle) {
    const p = document.createElement("p");
    p.textContent = subtitle;
    head.appendChild(p);
  }

  const toolbar = document.createElement("div");
  toolbar.className = "sb-toolbar grid-actions";

  const body = document.createElement("div");
  body.className = "sb-app-body grid-host";

  const foot = document.createElement("p");
  foot.className = "sb-foot grid-foot";

  wrap.append(head, toolbar, body, foot);

  let dispose: (() => void) | undefined;
  wrap.__storyDispose = () => dispose?.();

  return {
    wrap,
    body,
    toolbar,
    foot,
    setDispose: (fn) => {
      dispose = fn;
    },
  };
}
