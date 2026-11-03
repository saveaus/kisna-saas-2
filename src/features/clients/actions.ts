"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkPermission } from "@/lib/session";
import { CLIENT_COLUMNS, toRow, type FieldValue } from "@/lib/records";
import { FUNDING_TYPES } from "@/lib/fields";

export type ActionResult = { ok: true; id: number } | { ok: false; error: string };

/** Create a client. Needs Clients & Sites: full access (checked here and in the database). */
export async function createClientAction(input: {
  record: Record<string, FieldValue>;
  careManagerId?: number;
  schedulerId?: number;
}): Promise<ActionResult> {
  // Outside try/catch so an expired session can redirect to /login.
  const check = await checkPermission("clients_sites", "full");
  if (!check.session) return { ok: false, error: check.error ?? "Not allowed." };
  const session = check.session;

  const name = String(input.record.name ?? "").trim();
  const funding = String(input.record.fundingType ?? "");
  if (!name) return { ok: false, error: "Add the client's name." };
  if (!(FUNDING_TYPES as readonly string[]).includes(funding)) {
    return { ok: false, error: "Choose a funding type." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      ...toRow({ ...input.record, name, status: "Active" }, CLIENT_COLUMNS),
      workspace_id: session.workspaceId,
      care_manager_id: input.careManagerId ?? null,
      scheduler_id: input.schedulerId ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/clients");
  return { ok: true, id: Number(data.id) };
}
