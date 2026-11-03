/**
 * Record shapes used by the UI (camelCase, matching src/lib/fields.ts) and
 * the mapping to database columns (snake_case). Shared by the app and the
 * seed script.
 */

export type FieldValue = string | number | string[] | undefined;

export type ClientRecord = {
  id: number;
  name: string;
  status: "Active" | "Inactive";
  [key: string]: FieldValue;
};

export type StaffRecord = {
  id: number;
  name: string;
  status: "Active" | "Inactive";
  [key: string]: FieldValue;
};

export type SiteRecord = {
  id: number;
  name: string;
  [key: string]: FieldValue;
};

export type ActivityItem = { id: number; what: string; who: string; when: string };
export type NoteItem = {
  id: number;
  author: string;
  body: string;
  when: string;
  edited: boolean;
  canEdit: boolean;
  canDelete: boolean;
};
export type ContactItem = {
  id: number;
  name: string;
  contactType: string;
  relationship?: string;
  phone?: string;
  email?: string;
  notes?: string;
};
export type FileItem = {
  id: number;
  name: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  when: string;
};
export type StaffOption = { id: number; name: string };

/** UI key → clients column. Relations (care manager, scheduler) are handled separately. */
export const CLIENT_COLUMNS = {
  name: "name",
  status: "status",
  email: "email",
  phone: "phone",
  address: "address",
  language: "language",
  secondaryLanguages: "secondary_languages",
  gender: "gender",
  dateOfBirth: "date_of_birth",
  startDate: "start_date",
  fundingType: "funding_type",
  ndisType: "ndis_type",
  classification: "classification",
  ndisNumber: "ndis_number",
  level: "level",
  referralCode: "referral_code",
  acn: "acn",
  paymentNumber: "payment_number",
  careRecipientId: "care_recipient_id",
  pensionStatus: "pension_status",
  crn: "crn",
  reference: "reference",
  everydayLiving: "everyday_living",
  independence: "independence",
  shiftNotesTemplate: "shift_notes_template",
  allergies: "allergies",
  generalNotes: "general_notes",
} as const;

export const CLIENT_FINANCIAL_COLUMNS = {
  bankName: "bank_name",
  bsb: "bsb",
  accountNumber: "account_number",
  itfStatus: "itf_status",
  itfValue: "itf_value",
} as const;

export const CONTACT_COLUMNS = {
  name: "name",
  contactType: "contact_type",
  relationship: "relationship",
  phone: "phone",
  email: "email",
  notes: "notes",
} as const;

export const STAFF_COLUMNS = {
  name: "name",
  status: "status",
  role: "role",
  employmentType: "employment_type",
  email: "email",
  phone: "phone",
  address: "address",
  preferredName: "preferred_name",
  gender: "gender",
  nationality: "nationality",
  dateOfBirth: "date_of_birth",
  ecName: "ec_name",
  ecRelationship: "ec_relationship",
  ecPrimaryPhone: "ec_primary_phone",
  ecAltPhone: "ec_alt_phone",
  ecEmail: "ec_email",
  ecAddress: "ec_address",
  abn: "abn",
  tradingName: "trading_name",
} as const;

export const SITE_COLUMNS = {
  name: "name",
  email: "email",
  phone: "phone",
  address: "address",
  siteType: "site_type",
  capacity: "capacity",
  maximumStaff: "maximum_staff",
  splitCount: "split_count",
  lastInspection: "last_inspection",
  nextInspection: "next_inspection",
  tags: "tags",
} as const;

type Row = Record<string, unknown>;

function clean(value: unknown): FieldValue {
  if (value === null || value === undefined || value === "") return undefined;
  if (Array.isArray(value)) return value.length ? value.map(String) : undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return value;
  return String(value);
}

/** Database row → UI record. */
export function fromRow(row: Row, columns: Record<string, string>) {
  const out: Record<string, FieldValue> = {};
  for (const [key, column] of Object.entries(columns)) {
    const v = clean(row[column]);
    if (v !== undefined) out[key] = v;
  }
  return out;
}

/** UI record → database row (only keys present in the input). */
export function toRow(record: Record<string, FieldValue>, columns: Record<string, string>) {
  const out: Row = {};
  for (const [key, column] of Object.entries(columns)) {
    if (key in record) {
      const v = record[key];
      out[column] = v === undefined || v === "" ? null : v;
    }
  }
  return out;
}

export function ageFrom(dateOfBirth: FieldValue, today = new Date()) {
  if (typeof dateOfBirth !== "string") return undefined;
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
