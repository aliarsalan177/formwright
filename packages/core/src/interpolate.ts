/** Replace `{{key}}` tokens with values from a plain object (e.g. submit response). */
export function interpolateTemplate(
  template: string,
  data: unknown,
  extra: Record<string, string | number> = {},
): string {
  const dict: Record<string, unknown> =
    data !== null && typeof data === "object" && !Array.isArray(data)
      ? { ...extra, ...(data as Record<string, unknown>) }
      : { ...extra };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = dict[key];
    return v === undefined || v === null ? "" : String(v);
  });
}
