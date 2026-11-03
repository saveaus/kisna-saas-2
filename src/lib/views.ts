/** Saved table views: shared types and validation (used by the app and the server actions). */

export const VIEW_OBJECTS = ["clients", "staff", "sites"] as const;
export type ViewObject = (typeof VIEW_OBJECTS)[number];

export type Filter = { column: string; values: string[] };

/** A view tab. `id` is set for views saved in the database. */
export type View = { key: string; label: string; filters: Filter[]; id?: number };

export const VIEW_NAME_MAX = 60;

export function cleanViewName(name: string) {
  return name.replace(/\s+/g, " ").trim().slice(0, VIEW_NAME_MAX);
}

/** Accept only the filter shape the table produces, within sensible limits. */
export function cleanFilters(input: unknown): Filter[] | null {
  if (!Array.isArray(input) || input.length > 20) return null;
  const out: Filter[] = [];
  for (const f of input) {
    if (!f || typeof f !== "object") return null;
    const { column, values } = f as Record<string, unknown>;
    if (typeof column !== "string" || column.length === 0 || column.length > 60) return null;
    if (!Array.isArray(values) || values.length === 0 || values.length > 50) return null;
    if (!values.every((v) => typeof v === "string" && v.length <= 120)) return null;
    out.push({ column, values: values as string[] });
  }
  return out;
}
