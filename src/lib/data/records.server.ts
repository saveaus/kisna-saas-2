import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSession, sessionCan } from "@/lib/session";
import { ROLE_LABELS, type RoleKey } from "@/lib/permissions";
import {
  CLIENT_COLUMNS,
  CLIENT_FINANCIAL_COLUMNS,
  SITE_COLUMNS,
  STAFF_COLUMNS,
  ageFrom,
  fromRow,
  type ClientRecord,
  type SiteRecord,
  type StaffOption,
  type StaffRecord,
} from "@/lib/records";

/**
 * Data access for Clients, Staff and Sites. Every query runs as the
 * signed-in user, so the database's row level security decides what comes
 * back. Keep all reads here rather than in pages.
 */

const CLIENT_SELECT = `
  id, ${Object.values(CLIENT_COLUMNS).join(", ")},
  care_manager:staff!clients_care_manager_id_fkey(id, name),
  scheduler:staff!clients_scheduler_id_fkey(id, name)
`;

type Named = { id: number; name: string } | null;

function toClient(row: Record<string, unknown>): ClientRecord {
  const careManager = row.care_manager as Named;
  const scheduler = row.scheduler as Named;
  return {
    ...fromRow(row, CLIENT_COLUMNS),
    id: Number(row.id),
    name: String(row.name),
    status: row.status as ClientRecord["status"],
    careManager: careManager?.name,
    scheduler: scheduler?.name,
    business: undefined,
  };
}

function toStaff(row: Record<string, unknown>): StaffRecord {
  const record = fromRow(row, STAFF_COLUMNS);
  return {
    ...record,
    id: Number(row.id),
    name: String(row.name),
    status: row.status as StaffRecord["status"],
    role: ROLE_LABELS[row.role as RoleKey],
    age: ageFrom(record.dateOfBirth),
    hasLogin: row.user_id ? "Linked" : "No login",
  };
}

export async function listClients() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_SELECT)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toClient(r as unknown as Record<string, unknown>));
}

export async function getClient(id: number) {
  const session = await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const client = toClient(data as unknown as Record<string, unknown>);

  // Bank details only for finance roles (the database also enforces this).
  if (sessionCan(session, "finance", "read")) {
    const { data: fin } = await supabase
      .from("client_financials")
      .select(Object.values(CLIENT_FINANCIAL_COLUMNS).join(", "))
      .eq("client_id", id)
      .maybeSingle();
    if (fin) Object.assign(client, fromRow(fin as unknown as Record<string, unknown>, CLIENT_FINANCIAL_COLUMNS));
  }
  client.business = session.workspaceName;
  return client;
}

export async function listStaff() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff")
    .select(`id, user_id, ${Object.values(STAFF_COLUMNS).join(", ")}`)
    .order("name");
  if (error) throw new Error(error.message);
  const session = await getSession();
  return (data ?? []).map((r) => ({
    ...toStaff(r as unknown as Record<string, unknown>),
    accessBusiness: session.workspaceName,
  }));
}

export async function getStaff(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff")
    .select(`id, user_id, ${Object.values(STAFF_COLUMNS).join(", ")}`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const session = await getSession();
  return {
    ...toStaff(data as unknown as Record<string, unknown>),
    accessBusiness: session.workspaceName,
  };
}

/** Active staff for pickers (care manager, scheduler). */
export async function listStaffOptions(): Promise<StaffOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff")
    .select("id, name")
    .eq("status", "Active")
    .order("name");
  return (data ?? []).map((s) => ({ id: Number(s.id), name: s.name }));
}

export async function listSites(): Promise<SiteRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites")
    .select(`id, ${Object.values(SITE_COLUMNS).join(", ")}, manager:staff!sites_manager_id_fkey(name)`)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const r = row as unknown as Record<string, unknown>;
    const manager = r.manager as { name: string } | null;
    return {
      ...fromRow(r, SITE_COLUMNS),
      id: Number(r.id),
      name: String(r.name),
      manager: manager?.name,
    };
  });
}
