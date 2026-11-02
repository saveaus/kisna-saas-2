/**
 * Record fields, taken from Imploy (Settings → Objects, and the record
 * Details panels), Nov 2026. Full notes: docs/imploy-fields.md.
 *
 * These definitions drive the Details panel today and become the database
 * schema in Phase 1, Steps 3–4. Options marked TODO were not visible in
 * Imploy and need confirming.
 */

export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "address"
  | "select"
  | "multiselect"
  | "date"
  | "number"
  | "percent"
  | "longtext"
  | "relation";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: readonly string[];
  /** Only shown when another field has one of these values. */
  showWhen?: { field: string; in: readonly string[] };
  calculated?: boolean;
  placeholder?: string;
};

export type FieldSection = { title: string; fields: FieldDef[] };

export const GENDERS = [
  "Male",
  "Female",
  "Other",
  "Non-Binary",
  "Prefer not to say",
] as const;

/* ---------- Clients (37 attributes in Imploy) ---------- */

export const FUNDING_TYPES = [
  "NDIS",
  "HCP",
  "Support at Home",
  "Transitioned HCP",
  "Grandfathered HCP",
  "Private",
] as const;

export const NDIS_TYPES = [
  "NDIS Self Managed",
  "NDIS Agency Managed",
  "NDIS Plan Managed",
  "Private Client",
] as const;

export const CLASSIFICATIONS = [
  "Remote",
  "Non-Remote",
  "Remote Aboriginal or Torres Strait Islander",
  "Non-Remote Aboriginal or Torres Strait Islander",
] as const;

/** TODO: confirm Support at Home levels; Imploy's HCP clients use Level 1–4. */
export const LEVELS = ["Level 1", "Level 2", "Level 3", "Level 4"] as const;

const NON_NDIS = [
  "HCP",
  "Support at Home",
  "Transitioned HCP",
  "Grandfathered HCP",
] as const;

export const CLIENT_SECTIONS: FieldSection[] = [
  {
    title: "Client Information",
    fields: [
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "phone" },
      { key: "address", label: "Address", type: "address" },
      { key: "language", label: "Language", type: "select" },
      { key: "secondaryLanguages", label: "Secondary", type: "multiselect" },
      { key: "gender", label: "Gender", type: "select", options: GENDERS },
      { key: "dateOfBirth", label: "Date of Birth", type: "date" },
      { key: "startDate", label: "Start Date", type: "date" },
    ],
  },
  {
    title: "Funding Information",
    fields: [
      {
        key: "fundingType",
        label: "Funding Type",
        type: "select",
        required: true,
        options: FUNDING_TYPES,
      },
      {
        key: "ndisType",
        label: "NDIS Type",
        type: "select",
        options: NDIS_TYPES,
        showWhen: { field: "fundingType", in: ["NDIS"] },
      },
      {
        key: "classification",
        label: "Classification",
        type: "select",
        options: CLASSIFICATIONS,
      },
      {
        key: "ndisNumber",
        label: "NDIS Number",
        type: "text",
        showWhen: { field: "fundingType", in: ["NDIS"] },
      },
      {
        key: "level",
        label: "Level",
        type: "select",
        options: LEVELS,
        showWhen: { field: "fundingType", in: NON_NDIS },
      },
      {
        key: "referralCode",
        label: "Referral Code",
        type: "text",
        showWhen: { field: "fundingType", in: NON_NDIS },
      },
      {
        key: "acn",
        label: "ACN",
        type: "text",
        showWhen: { field: "fundingType", in: NON_NDIS },
      },
      {
        key: "paymentNumber",
        label: "Payment Number",
        type: "text",
        showWhen: { field: "fundingType", in: NON_NDIS },
      },
      {
        key: "careRecipientId",
        label: "Care Recipient ID",
        type: "text",
        showWhen: { field: "fundingType", in: NON_NDIS },
      },
      {
        key: "pensionStatus",
        label: "Pension Status",
        type: "select",
        options: [], // TODO: options not visible in Imploy
        showWhen: { field: "fundingType", in: NON_NDIS },
      },
      {
        key: "crn",
        label: "CRN",
        type: "text",
        showWhen: { field: "fundingType", in: NON_NDIS },
      },
      { key: "reference", label: "Reference", type: "text" },
      {
        key: "everydayLiving",
        label: "Everyday Living (%)",
        type: "percent",
        showWhen: { field: "fundingType", in: NON_NDIS },
      },
      {
        key: "independence",
        label: "Independence (%)",
        type: "percent",
        showWhen: { field: "fundingType", in: NON_NDIS },
      },
    ],
  },
  {
    title: "Team and Preferences",
    fields: [
      { key: "business", label: "Business", type: "relation" },
      { key: "careManager", label: "Care Manager", type: "relation" },
      { key: "scheduler", label: "Scheduler", type: "relation" },
      { key: "preferredStaff", label: "Preferred Staff", type: "relation" },
      { key: "doNotSend", label: "Do Not Send", type: "relation" },
      { key: "compliance", label: "Compliance", type: "relation" },
      {
        key: "shiftNotesTemplate",
        label: "Shift Notes Template",
        type: "select",
      },
    ],
  },
  {
    title: "Medical Information",
    fields: [{ key: "allergies", label: "Allergies", type: "multiselect" }],
  },
  {
    title: "General Notes",
    fields: [{ key: "generalNotes", label: "General Notes", type: "longtext" }],
  },
  {
    title: "Client Financial Details",
    fields: [
      { key: "bankName", label: "Bank Name", type: "text" },
      { key: "bsb", label: "BSB", type: "text" },
      { key: "accountNumber", label: "Account Number", type: "text" },
      {
        key: "itfStatus",
        label: "ITF Status",
        type: "select",
        options: [], // TODO: options not visible in Imploy
        showWhen: { field: "fundingType", in: NON_NDIS },
      },
      {
        key: "itfValue",
        label: "ITF Value",
        type: "text",
        showWhen: { field: "fundingType", in: NON_NDIS },
      },
    ],
  },
];

/** Fields that mark a client "Incomplete" when empty (Imploy shows this flag). */
export const CLIENT_COMPLETENESS_KEYS = [
  "email",
  "phone",
  "startDate",
  "careManager",
  "scheduler",
] as const;

/* ---------- Staff (22 attributes in Imploy) ---------- */

export const ROLES = [
  "Superadmin",
  "Service Manager",
  "Scheduler",
  "Service Delivery Worker",
] as const;

export const EMPLOYMENT_TYPES = ["Employee", "Contractor"] as const;

export const STAFF_SECTIONS: FieldSection[] = [
  {
    title: "Contact & Employment",
    fields: [
      { key: "employeeId", label: "Employee ID", type: "text", calculated: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "phone", required: true },
      { key: "address", label: "Address", type: "address", required: true },
      {
        key: "role",
        label: "Role",
        type: "select",
        required: true,
        options: ROLES,
      },
      {
        key: "employmentType",
        label: "Employment Type",
        type: "select",
        required: true,
        options: EMPLOYMENT_TYPES,
      },
      {
        key: "accessBusiness",
        label: "Access Business",
        type: "relation",
        required: true,
      },
    ],
  },
  {
    title: "Basic Information",
    fields: [
      { key: "preferredName", label: "Preferred Name", type: "text" },
      { key: "gender", label: "Gender", type: "select", options: GENDERS },
      { key: "nationality", label: "Nationality", type: "multiselect" },
      {
        key: "dateOfBirth",
        label: "Date Of Birth",
        type: "date",
        required: true,
      },
      { key: "age", label: "Age", type: "number", calculated: true },
    ],
  },
  {
    title: "Emergency Contact",
    fields: [
      { key: "ecName", label: "Name", type: "text" },
      { key: "ecRelationship", label: "Relationship", type: "text" },
      { key: "ecPrimaryPhone", label: "Primary Phone", type: "phone" },
      { key: "ecAltPhone", label: "Alt Phone", type: "phone" },
      { key: "ecEmail", label: "Email", type: "email" },
      { key: "ecAddress", label: "Address", type: "address" },
    ],
  },
  {
    title: "Account Information",
    fields: [
      { key: "abn", label: "ABN", type: "text" },
      { key: "tradingName", label: "Trading Name", type: "text" },
      { key: "payGroup", label: "Pay group", type: "relation" },
    ],
  },
];

/** Staff record → Employment tab (Imploy). */
export const STAFF_EMPLOYMENT_FIELDS: FieldDef[] = [
  { key: "taxFileNumber", label: "Taxfile Number", type: "text" },
  { key: "employingEntity", label: "Employing Entity", type: "text" },
  { key: "location", label: "Location", type: "relation" },
  { key: "primaryCostCentre", label: "Primary Cost Centre", type: "text" },
  { key: "additionalCostCentres", label: "Additional Cost Centres", type: "text" },
  { key: "employmentTypeDetail", label: "Employment Type", type: "text" },
  { key: "contractType", label: "Contract Type", type: "text" },
  { key: "jobTitle", label: "Job Title", type: "text" },
  { key: "basePayRate", label: "Base Pay Rate", type: "number" },
  { key: "weeklyHours", label: "Actual Weekly Hours/Days", type: "text" },
  { key: "fteWeeklyHours", label: "Full-Time Equivalent Weekly Hours/Days", type: "text" },
  { key: "maxDailyHours", label: "Maximum Daily Hours", type: "number" },
];

/** Compliance documents Imploy asks staff for (Settings → Objects → Staff → Documents). */
export const STAFF_DOCUMENT_TYPES = [
  "Certificate III in Aged Care / Community Care",
  "Comprehensive Vehicle Insurance",
  "CPR Certificate",
  "Drivers License",
  "Employment Contract",
  "First Aid Certificate",
  "Identification",
  "Infection Control Certificate",
  "Manual Handling Certificate",
  "Medication Training Certificate",
  "NDIS Clearance Check",
  "Police Clearance",
  "Profile Picture",
  "RRHAN-EC Certificate",
  "Safe Environments Training",
  "Vehicle Registration",
  "Working With Children Check",
] as const;

/* ---------- Sites (13 attributes in Imploy) ---------- */

export const SITE_SECTIONS: FieldSection[] = [
  {
    title: "Site Information",
    fields: [
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "phone" },
      { key: "address", label: "Address", type: "address" },
      { key: "siteType", label: "Site Type", type: "select" },
      { key: "capacity", label: "Capacity", type: "number" },
      { key: "maximumStaff", label: "Maximum Staff", type: "number" },
      { key: "splitCount", label: "Split Count", type: "number" },
      { key: "occupancy", label: "Occupancy", type: "number", calculated: true },
      { key: "manager", label: "Manager", type: "relation" },
      { key: "lastInspection", label: "Last Inspection", type: "date" },
      { key: "nextInspection", label: "Next Inspection", type: "date" },
      { key: "tags", label: "Tags", type: "multiselect" },
    ],
  },
];

/** Is this field visible for the given record? */
export function isFieldVisible(
  field: FieldDef,
  record: Record<string, unknown>,
) {
  if (!field.showWhen) return true;
  const value = record[field.showWhen.field];
  return typeof value === "string" && field.showWhen.in.includes(value);
}
