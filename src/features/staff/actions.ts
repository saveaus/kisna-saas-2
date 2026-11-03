"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPermission, getSession } from "@/lib/session";
import { roleKeyFromLabel } from "@/lib/permissions";
import { STAFF_COLUMNS, toRow, type FieldValue } from "@/lib/records";
import { EMPLOYMENT_TYPES } from "@/lib/fields";
import { siteUrl } from "@/lib/site-url";
import { validateStaffField } from "./validate";

export type ActionResult = { ok: true; id: number } | { ok: false; error: string };
export type SaveResult = { ok: true } | { ok: false; error: string };

const isId = (id: unknown): id is number =>
  typeof id === "number" && Number.isSafeInteger(id) && id > 0;

/** Add a staff member. Needs Manage Users: full access. */
export async function createStaffAction(
  record: Record<string, FieldValue>,
): Promise<ActionResult> {
  // Outside try/catch so an expired session can redirect to /login.
  const check = await checkPermission("staff", "full");
  if (!check.session) return { ok: false, error: check.error ?? "Not allowed." };
  const session = check.session;

  const name = String(record.name ?? "").trim();
  const email = String(record.email ?? "").trim().toLowerCase();
  const role = roleKeyFromLabel(String(record.role ?? ""));
  const employmentType = String(record.employmentType ?? "");
  if (!name) return { ok: false, error: "Add the staff member's name." };
  if (!role) return { ok: false, error: "Choose a role." };
  if (role === "superadmin" && session.role !== "superadmin") {
    return { ok: false, error: "Only a superadmin can add another superadmin." };
  }
  if (!(EMPLOYMENT_TYPES as readonly string[]).includes(employmentType)) {
    return { ok: false, error: "Choose an employment type." };
  }
  if (!email.includes("@")) return { ok: false, error: "Add a valid email address." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff")
    .insert({
      ...toRow({ ...record, name, email, status: "Active" }, STAFF_COLUMNS),
      role,
      workspace_id: session.workspaceId,
    })
    .select("id")
    .single();
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Someone in this workspace already uses that email." : error.message,
    };
  }
  revalidatePath("/staff");
  return { ok: true, id: Number(data.id) };
}

/**
 * Save one field from a staff member's Details panel. Needs Manage Users: full.
 * The database also stops anyone but a superadmin changing a superadmin.
 */
export async function updateStaffFieldAction(input: {
  staffId: number;
  key: string;
  value: FieldValue;
}): Promise<SaveResult> {
  // Outside try/catch so an expired session can redirect to /login.
  const check = await checkPermission("staff", "full");
  if (!check.session) return { ok: false, error: check.error ?? "Not allowed." };
  const session = check.session;

  if (!isId(input.staffId)) return { ok: false, error: "Staff member not found." };
  const valid = validateStaffField(input.key, input.value);
  if (!valid.ok) return valid;

  const supabase = await createClient();
  const { data: person } = await supabase
    .from("staff")
    .select("role, user_id")
    .eq("workspace_id", session.workspaceId)
    .eq("id", input.staffId)
    .maybeSingle();
  if (!person) return { ok: false, error: "Staff member not found." };

  if (person.role === "superadmin" && session.role !== "superadmin") {
    return { ok: false, error: "Only a superadmin can change a superadmin's record." };
  }
  if ((input.key === "role" || input.key === "status") && input.staffId === session.staffId) {
    return { ok: false, error: "You can't change your own role or status." };
  }
  if (input.key === "email" && person.user_id) {
    return { ok: false, error: "This person signs in with this email, so it can't be changed here yet." };
  }

  let value = valid.value;
  if (input.key === "email") value = String(value).toLowerCase();
  if (input.key === "role") {
    const role = roleKeyFromLabel(String(value));
    if (!role) return { ok: false, error: "Choose a role." };
    if (role === "superadmin" && session.role !== "superadmin") {
      return { ok: false, error: "Only a superadmin can add another superadmin." };
    }
    value = role;
  }

  const { data, error } = await supabase
    .from("staff")
    .update(toRow({ [input.key]: value }, STAFF_COLUMNS))
    .eq("workspace_id", session.workspaceId)
    .eq("id", input.staffId)
    .select("id");
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Someone in this workspace already uses that email." : error.message,
    };
  }
  if (!data.length) return { ok: false, error: "Staff member not found." };

  revalidatePath(`/staff/${input.staffId}`);
  revalidatePath("/staff");
  return { ok: true };
}

/**
 * Email a staff member an invite to sign in, and link the new login to
 * their staff record. Superadmin only (the database enforces this too).
 */
export async function inviteStaffAction(staffId: number): Promise<ActionResult> {
  // Outside try/catch so an expired session can redirect to /login.
  const session = await getSession();
  if (session.role !== "superadmin") {
    return { ok: false, error: "Only a superadmin can send invites." };
  }
  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error: "Invites need SUPABASE_SERVICE_ROLE_KEY in .env.local (see README).",
    };
  }

  // Only staff in the workspace you're signed in to. Checked before the
  // service-role key is used, because that key bypasses the database rules.
  const supabase = await createClient();
  const { data: person, error: readError } = await supabase
    .from("staff")
    .select("id, email, user_id")
    .eq("workspace_id", session.workspaceId)
    .eq("id", staffId)
    .maybeSingle();
  if (readError || !person) return { ok: false, error: "Staff member not found." };
  if (person.user_id) return { ok: false, error: "This person already has a login." };

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    person.email,
    { redirectTo: `${await siteUrl()}/set-password` },
  );
  if (inviteError || !invited.user) {
    return {
      ok: false,
      error: /already/i.test(inviteError?.message ?? "")
        ? "That email already has a login. Linking existing logins arrives in a later step."
        : inviteError?.message ?? "Couldn't send the invite.",
    };
  }

  // Link with the superadmin's own session so the database checks it.
  const { error: linkError } = await supabase
    .from("staff")
    .update({ user_id: invited.user.id })
    .eq("workspace_id", session.workspaceId)
    .eq("id", staffId);
  if (linkError) {
    // Don't leave a login that belongs to nobody.
    await admin.auth.admin.deleteUser(invited.user.id);
    return { ok: false, error: linkError.message };
  }

  revalidatePath(`/staff/${staffId}`);
  revalidatePath("/staff");
  return { ok: true, id: staffId };
}
