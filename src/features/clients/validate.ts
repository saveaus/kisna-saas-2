/**
 * Checks on what's sent to the client server actions. Those actions can be
 * called directly, so nothing here trusts the screen. The database has its own
 * rules as well; these exist to give people clear messages.
 */
import { checkEmail, validateField, type FieldFail as Fail } from "@/lib/field-validation";
import {
  CLIENT_FIELDS,
  CLIENT_FILE_MAX_BYTES,
  CONTACT_TYPES,
  clientFileType,
} from "@/lib/fields";
import type { FieldValue } from "@/lib/records";

export const MAX_NOTE_LENGTH = 10000;

const fail = (error: string): Fail => ({ ok: false, error });

const isText = (value: unknown): value is string => typeof value === "string";

/** One field from the Details panel. Relations have their own actions. */
export function validateClientField(key: string, value: FieldValue, today = new Date()) {
  return validateField(CLIENT_FIELDS, key, value, today);
}

export function validateNote(body: unknown): { ok: true; body: string } | Fail {
  const text = isText(body) ? body.trim() : "";
  if (!text) return fail("Write something first.");
  if (text.length > MAX_NOTE_LENGTH) return fail("That note is too long.");
  return { ok: true, body: text };
}

export function validateContact(
  record: Record<string, FieldValue>,
): { ok: true; record: Record<string, FieldValue> } | Fail {
  const name = isText(record.name) ? record.name.trim() : "";
  if (!name) return fail("Add the contact's name.");
  if (name.length > 120) return fail("Name is too long.");

  const contactType = record.contactType;
  if (!isText(contactType) || !(CONTACT_TYPES as readonly string[]).includes(contactType)) {
    return fail("Choose a contact type.");
  }

  const optional = (key: string, max: number) => {
    const value = record[key];
    if (value === undefined) return undefined;
    if (!isText(value)) throw new Error(`${key} isn't valid.`);
    const text = value.trim();
    if (text.length > max) throw new Error(`${key} is too long.`);
    return text || undefined;
  };

  try {
    const email = optional("email", 254);
    if (email && !checkEmail(email)) return fail("That doesn't look like an email address.");
    return {
      ok: true,
      record: {
        name,
        contactType,
        relationship: optional("relationship", 120),
        phone: optional("phone", 40),
        email,
        notes: optional("notes", 2000),
      },
    };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "That contact isn't valid.");
  }
}

/** Removes anything that could be read as a folder or break a download name. */
export function cleanFileName(name: string) {
  return (
    name
      .split(/[\\/]/)
      .pop()!
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(-255)
  );
}

export function validateUpload(input: {
  name: unknown;
  size: unknown;
  type: unknown;
}): { ok: true; name: string; size: number; contentType: string } | Fail {
  const name = isText(input.name) ? cleanFileName(input.name) : "";
  if (!name) return fail("That file needs a name.");
  const size = input.size;
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 0) {
    return fail("That file isn't valid.");
  }
  if (size > CLIENT_FILE_MAX_BYTES) return fail(`${name} is over the 25 MB limit.`);
  const contentType = clientFileType(name, isText(input.type) ? input.type : "");
  if (!contentType) {
    return fail(`${name} can't be uploaded. Use a PDF, photo, Word, Excel, CSV or text file.`);
  }
  return { ok: true, name, size, contentType };
}

/**
 * A finished upload must point inside this workspace and client's folder, at
 * the random name the start step made. Stops a forged request attaching
 * someone else's file.
 */
export function isClientFilePath(path: unknown, workspaceId: string, clientId: number) {
  if (!isText(path)) return false;
  const prefix = `${workspaceId}/${clientId}/`;
  return (
    path.startsWith(prefix) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(path.slice(prefix.length))
  );
}
