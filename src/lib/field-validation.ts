/**
 * Checks one field's value against its definition in src/lib/fields.ts. Server
 * actions can be called directly, so nothing here trusts the screen. The database
 * has its own rules as well; these exist to give people clear messages.
 */
import { isFieldEditable, type FieldDef } from "@/lib/fields";
import type { FieldValue } from "@/lib/records";

const MAX_TEXT = 500;
const MAX_LONG_TEXT = 10000;
const MAX_NAME = 120;
const MAX_LIST_ITEMS = 50;
const MAX_LIST_ITEM = 100;

export type FieldFail = { ok: false; error: string };

const fail = (error: string): FieldFail => ({ ok: false, error });

function checkDate(field: FieldDef, text: string, today: Date) {
  const date = new Date(`${text}T00:00:00Z`);
  // Also catches dates that don't exist: 2026-02-31 rolls over to March.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(date.getTime()) || !date.toISOString().startsWith(text)) {
    return `${field.label} isn't a valid date.`;
  }
  if (field.key === "dateOfBirth" && date > today) return "Date of birth can't be in the future.";
  return undefined;
}

export function checkEmail(text: string) {
  return /^[^\s@]+@[^\s@]+$/.test(text) && text.length <= 254;
}

/** One field from a Details panel. Relations have their own actions. */
export function validateField(
  fields: FieldDef[],
  key: string,
  value: FieldValue,
  today = new Date(),
): { ok: true; value: FieldValue } | FieldFail {
  const field = fields.find((f) => f.key === key);
  if (!field || !isFieldEditable(field) || field.type === "relation") {
    return fail("That field can't be changed.");
  }

  if (field.type === "multiselect") {
    if (value === undefined) return { ok: true, value: [] };
    if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
      return fail(`${field.label} isn't valid.`);
    }
    const items = [...new Set(value.map((v) => v.trim()).filter(Boolean))];
    if (items.length > MAX_LIST_ITEMS || items.some((v) => v.length > MAX_LIST_ITEM)) {
      return fail(`${field.label} is too long.`);
    }
    return { ok: true, value: items };
  }

  if (Array.isArray(value)) return fail(`${field.label} isn't valid.`);
  const text = value === undefined ? "" : String(value).trim();

  if (!text) {
    if (field.required) return fail(`${field.label} can't be empty.`);
    return { ok: true, value: undefined };
  }

  switch (field.type) {
    case "select":
      if (field.options?.length && !field.options.includes(text)) {
        return fail(`Choose a ${field.label.toLowerCase()} from the list.`);
      }
      break;
    case "email":
      if (!checkEmail(text)) return fail("That doesn't look like an email address.");
      break;
    case "date": {
      const problem = checkDate(field, text, today);
      if (problem) return fail(problem);
      break;
    }
    case "percent": {
      const percent = Number(text);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        return fail(`${field.label} must be between 0 and 100.`);
      }
      return { ok: true, value: percent };
    }
    case "number":
      if (!Number.isFinite(Number(text))) return fail(`${field.label} must be a number.`);
      return { ok: true, value: Number(text) };
    default:
      break;
  }

  if (key === "name" && text.length > MAX_NAME) return fail("Name is too long.");
  if (text.length > (field.type === "longtext" ? MAX_LONG_TEXT : MAX_TEXT)) {
    return fail(`${field.label} is too long.`);
  }
  return { ok: true, value: text };
}
