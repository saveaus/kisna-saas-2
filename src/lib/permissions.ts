/**
 * Roles and permission areas, matching the database (staff_role,
 * role_permissions) and Imploy's Settings → Permissions.
 */

export const ROLE_KEYS = [
  "superadmin",
  "service_manager",
  "scheduler",
  "support_worker",
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  superadmin: "Superadmin",
  service_manager: "Service Manager",
  scheduler: "Scheduler",
  support_worker: "Service Delivery Worker",
};

export function roleKeyFromLabel(label: string): RoleKey | undefined {
  return ROLE_KEYS.find((k) => ROLE_LABELS[k] === label);
}

export const AREAS = [
  { key: "clients_sites", label: "Clients & Sites", help: "Access client records and sites" },
  { key: "staff", label: "Manage Users", help: "Invite users, assign roles and manage staff" },
  { key: "scheduler", label: "Scheduler", help: "Plan shifts, visits and coverage" },
  { key: "finance", label: "Finance", help: "Invoices, claims, billing and client bank details" },
  { key: "compliance", label: "Compliance", help: "Credentials, policies, audits and evidence" },
  { key: "incidents", label: "Incidents", help: "Record and follow up incidents" },
  { key: "reports", label: "Reports", help: "Run operational and management reports" },
  { key: "settings", label: "Settings", help: "Organisation settings, billing and integrations" },
  { key: "tasks", label: "Tasks", help: "Create, assign and track tasks" },
  { key: "prospects", label: "Prospects", help: "Enquiries and pipeline" },
  { key: "documents", label: "Company Documents", help: "Shared documents for the organisation" },
  { key: "forms", label: "Forms", help: "Build operational and compliance forms" },
  { key: "suppliers", label: "Suppliers", help: "Supplier records" },
  { key: "chat", label: "Chat", help: "Team chat and the assistant" },
] as const;
export type AreaKey = (typeof AREAS)[number]["key"];

export const LEVELS = ["none", "read", "full"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  none: "No access",
  read: "Read only",
  full: "Full access",
};

export type PermissionMap = Partial<Record<AreaKey, Level>>;

/** UI check only. The database enforces the same rule for every query. */
export function can(
  role: RoleKey,
  permissions: PermissionMap,
  area: AreaKey,
  needed: Exclude<Level, "none">,
) {
  if (role === "superadmin") return true;
  const have = permissions[area] ?? "none";
  return LEVELS.indexOf(have) >= LEVELS.indexOf(needed);
}
