import { validateField } from "@/lib/field-validation";
import { STAFF_FIELDS } from "@/lib/fields";
import type { FieldValue } from "@/lib/records";

export function validateStaffField(key: string, value: FieldValue, today = new Date()) {
  return validateField(STAFF_FIELDS, key, value, today);
}
