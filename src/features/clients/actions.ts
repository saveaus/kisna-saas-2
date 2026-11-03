"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkPermission } from "@/lib/session";
import {
  CLIENT_COLUMNS,
  CLIENT_FINANCIAL_COLUMNS,
  CONTACT_COLUMNS,
  toRow,
  type FieldValue,
} from "@/lib/records";
import { CLIENT_FILES_BUCKET, FUNDING_TYPES } from "@/lib/fields";
import {
  isClientFilePath,
  validateClientField,
  validateContact,
  validateNote,
  validateUpload,
} from "./validate";

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

export type SaveResult = { ok: true } | { ok: false; error: string };

const isId = (id: unknown): id is number =>
  typeof id === "number" && Number.isSafeInteger(id) && id > 0;

/** Plain words for the database's refusals; anything else passes through. */
function friendly(error: { code?: string; message: string }) {
  return error.code === "42501" ? "You don't have permission to do that." : error.message;
}

function refreshClient(clientId: number) {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

/** Save one field from the Details panel. Bank details need Finance: full access. */
export async function updateClientFieldAction(input: {
  clientId: number;
  key: string;
  value: FieldValue;
}): Promise<SaveResult> {
  const isFinancial = Object.hasOwn(CLIENT_FINANCIAL_COLUMNS, input.key);
  // Outside try/catch so an expired session can redirect to /login.
  const check = await checkPermission(isFinancial ? "finance" : "clients_sites", "full");
  if (!check.session) return { ok: false, error: check.error ?? "Not allowed." };
  const { workspaceId } = check.session;

  if (!isId(input.clientId)) return { ok: false, error: "Client not found." };
  const valid = validateClientField(input.key, input.value);
  if (!valid.ok) return valid;

  const supabase = await createClient();
  const write = { [input.key]: valid.value };

  if (isFinancial) {
    const { error } = await supabase.from("client_financials").upsert(
      {
        ...toRow(write, CLIENT_FINANCIAL_COLUMNS),
        client_id: input.clientId,
        workspace_id: workspaceId,
      },
      { onConflict: "client_id" },
    );
    if (error) return { ok: false, error: friendly(error) };
  } else {
    const { data, error } = await supabase
      .from("clients")
      .update(toRow(write, CLIENT_COLUMNS))
      .eq("workspace_id", workspaceId)
      .eq("id", input.clientId)
      .select("id");
    if (error) return { ok: false, error: friendly(error) };
    if (!data.length) return { ok: false, error: "Client not found." };
  }

  refreshClient(input.clientId);
  return { ok: true };
}

/** Set or clear the care manager or scheduler. */
export async function updateClientStaffAction(input: {
  clientId: number;
  key: "careManager" | "scheduler";
  staffId: number | null;
}): Promise<SaveResult> {
  const check = await checkPermission("clients_sites", "full");
  if (!check.session) return { ok: false, error: check.error ?? "Not allowed." };

  const column = { careManager: "care_manager_id", scheduler: "scheduler_id" }[input.key];
  if (!column || !isId(input.clientId)) return { ok: false, error: "Client not found." };
  if (input.staffId !== null && !isId(input.staffId)) {
    return { ok: false, error: "Choose someone from the list." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update({ [column]: input.staffId })
    .eq("workspace_id", check.session.workspaceId)
    .eq("id", input.clientId)
    .select("id");
  if (error) return { ok: false, error: friendly(error) };
  if (!data.length) return { ok: false, error: "Client not found." };

  refreshClient(input.clientId);
  return { ok: true };
}

/**
 * Set the preferred or do-not-send staff. Each person has one row per client,
 * so adding someone here moves them from any other list. Removing someone
 * deletes the row, which also ends their access to this client: if in doubt,
 * access is taken away rather than left behind.
 */
export async function setClientStaffListAction(input: {
  clientId: number;
  key: "preferredStaff" | "doNotSend";
  staffIds: number[];
}): Promise<SaveResult> {
  const check = await checkPermission("clients_sites", "full");
  if (!check.session) return { ok: false, error: check.error ?? "Not allowed." };
  const { workspaceId } = check.session;

  const kind = { preferredStaff: "preferred", doNotSend: "do_not_send" }[input.key];
  if (!kind || !isId(input.clientId)) return { ok: false, error: "Client not found." };
  if (!Array.isArray(input.staffIds) || !input.staffIds.every(isId)) {
    return { ok: false, error: "Choose people from the list." };
  }
  const wanted = [...new Set(input.staffIds)];

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("client_team")
    .select("staff_id")
    .eq("workspace_id", workspaceId)
    .eq("client_id", input.clientId)
    .eq("kind", kind);
  if (readError) return { ok: false, error: friendly(readError) };

  const currentIds = (current ?? []).map((row) => Number(row.staff_id));
  const removed = currentIds.filter((id) => !wanted.includes(id));
  const added = wanted.filter((id) => !currentIds.includes(id));

  if (removed.length) {
    const { error } = await supabase
      .from("client_team")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("client_id", input.clientId)
      .eq("kind", kind)
      .in("staff_id", removed);
    if (error) return { ok: false, error: friendly(error) };
  }
  if (added.length) {
    const { error } = await supabase.from("client_team").upsert(
      added.map((staffId) => ({
        client_id: input.clientId,
        staff_id: staffId,
        workspace_id: workspaceId,
        kind,
      })),
      { onConflict: "client_id,staff_id" },
    );
    if (error) return { ok: false, error: friendly(error) };
  }

  refreshClient(input.clientId);
  return { ok: true };
}

/* ---------- Notes ---------- */

export async function addClientNoteAction(input: { clientId: number; body: string }): Promise<SaveResult> {
  const check = await checkPermission("clients_sites", "full");
  if (!check.session) return { ok: false, error: check.error ?? "Not allowed." };

  if (!isId(input.clientId)) return { ok: false, error: "Client not found." };
  const valid = validateNote(input.body);
  if (!valid.ok) return valid;

  const supabase = await createClient();
  // The database stamps who wrote it, from the session.
  const { error } = await supabase.from("client_notes").insert({
    workspace_id: check.session.workspaceId,
    client_id: input.clientId,
    body: valid.body,
  });
  if (error) return { ok: false, error: friendly(error) };

  revalidatePath(`/clients/${input.clientId}`);
  return { ok: true };
}

export async function updateClientNoteAction(input: {
  clientId: number;
  noteId: number;
  body: string;
}): Promise<SaveResult> {
  const check = await checkPermission("clients_sites", "full");
  if (!check.session) return { ok: false, error: check.error ?? "Not allowed." };

  if (!isId(input.clientId) || !isId(input.noteId)) return { ok: false, error: "Note not found." };
  const valid = validateNote(input.body);
  if (!valid.ok) return valid;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notes")
    .update({ body: valid.body })
    .eq("workspace_id", check.session.workspaceId)
    .eq("client_id", input.clientId)
    .eq("id", input.noteId)
    .select("id");
  if (error) return { ok: false, error: friendly(error) };
  if (!data.length) return { ok: false, error: "You can only edit your own notes." };

  revalidatePath(`/clients/${input.clientId}`);
  return { ok: true };
}

/** Authors can delete their own notes, and a superadmin can delete any (the database decides). */
export async function deleteClientNoteAction(input: { clientId: number; noteId: number }): Promise<SaveResult> {
  const check = await checkPermission("clients_sites", "full");
  if (!check.session) return { ok: false, error: check.error ?? "Not allowed." };

  if (!isId(input.clientId) || !isId(input.noteId)) return { ok: false, error: "Note not found." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notes")
    .delete()
    .eq("workspace_id", check.session.workspaceId)
    .eq("client_id", input.clientId)
    .eq("id", input.noteId)
    .select("id");
  if (error) return { ok: false, error: friendly(error) };
  if (!data.length) return { ok: false, error: "You can only delete your own notes." };

  revalidatePath(`/clients/${input.clientId}`);
  return { ok: true };
}

/* ---------- Contacts ---------- */

/** Add a contact, or update one when contactId is given. */
export async function saveClientContactAction(input: {
  clientId: number;
  contactId?: number;
  record: Record<string, FieldValue>;
}): Promise<SaveResult> {
  const check = await checkPermission("clients_sites", "full");
  if (!check.session) return { ok: false, error: check.error ?? "Not allowed." };
  const { workspaceId } = check.session;

  if (!isId(input.clientId)) return { ok: false, error: "Client not found." };
  if (input.contactId !== undefined && !isId(input.contactId)) {
    return { ok: false, error: "Contact not found." };
  }
  const valid = validateContact(input.record);
  if (!valid.ok) return valid;
  const row = toRow(valid.record, CONTACT_COLUMNS);

  const supabase = await createClient();
  if (input.contactId === undefined) {
    const { error } = await supabase
      .from("client_contacts")
      .insert({ ...row, workspace_id: workspaceId, client_id: input.clientId });
    if (error) return { ok: false, error: friendly(error) };
  } else {
    const { data, error } = await supabase
      .from("client_contacts")
      .update(row)
      .eq("workspace_id", workspaceId)
      .eq("client_id", input.clientId)
      .eq("id", input.contactId)
      .select("id");
    if (error) return { ok: false, error: friendly(error) };
    if (!data.length) return { ok: false, error: "Contact not found." };
  }

  revalidatePath(`/clients/${input.clientId}`);
  return { ok: true };
}

export async function deleteClientContactAction(input: {
  clientId: number;
  contactId: number;
}): Promise<SaveResult> {
  const check = await checkPermission("clients_sites", "full");
  if (!check.session) return { ok: false, error: check.error ?? "Not allowed." };

  if (!isId(input.clientId) || !isId(input.contactId)) return { ok: false, error: "Contact not found." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_contacts")
    .delete()
    .eq("workspace_id", check.session.workspaceId)
    .eq("client_id", input.clientId)
    .eq("id", input.contactId)
    .select("id");
  if (error) return { ok: false, error: friendly(error) };
  if (!data.length) return { ok: false, error: "Contact not found." };

  revalidatePath(`/clients/${input.clientId}`);
  return { ok: true };
}

/* ---------- Files ----------
 * Uploads go straight from the browser to private storage, because server
 * actions only take small requests. Step one checks access and returns a
 * one-time upload ticket. Step two, after the upload, records the file.
 */

type UploadInput = { clientId: number; name: string; size: number; type: string };

export async function startClientFileUploadAction(
  input: UploadInput,
): Promise<
  { ok: true; path: string; token: string; name: string; contentType: string } | { ok: false; error: string }
> {
  const check = await checkPermission("clients_sites", "full");
  if (!check.session) return { ok: false, error: check.error ?? "Not allowed." };
  const { workspaceId } = check.session;

  if (!isId(input.clientId)) return { ok: false, error: "Client not found." };
  const valid = validateUpload(input);
  if (!valid.ok) return valid;

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("id", input.clientId)
    .maybeSingle();
  if (!client) return { ok: false, error: "Client not found." };

  const path = `${workspaceId}/${input.clientId}/${randomUUID()}`;
  const { data, error } = await supabase.storage.from(CLIENT_FILES_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: error?.message ?? "Couldn't start the upload." };

  return { ok: true, path, token: data.token, name: valid.name, contentType: valid.contentType };
}

export async function finishClientFileUploadAction(input: UploadInput & { path: string }): Promise<SaveResult> {
  const check = await checkPermission("clients_sites", "full");
  if (!check.session) return { ok: false, error: check.error ?? "Not allowed." };
  const { workspaceId } = check.session;

  if (!isId(input.clientId)) return { ok: false, error: "Client not found." };
  const valid = validateUpload(input);
  if (!valid.ok) return valid;
  if (!isClientFilePath(input.path, workspaceId, input.clientId)) {
    return { ok: false, error: "That upload isn't valid." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("client_files").insert({
    workspace_id: workspaceId,
    client_id: input.clientId,
    name: valid.name,
    storage_path: input.path,
    size_bytes: valid.size,
    mime_type: valid.contentType,
  });
  if (error) {
    // Don't keep a stored file that nothing points to.
    await supabase.storage.from(CLIENT_FILES_BUCKET).remove([input.path]);
    return { ok: false, error: friendly(error) };
  }

  revalidatePath(`/clients/${input.clientId}`);
  return { ok: true };
}

/** Share a file with support workers on this client's team, or make it private again. */
export async function setClientFileSharedAction(input: {
  clientId: number;
  fileId: number;
  shared: boolean;
}): Promise<SaveResult> {
  const check = await checkPermission("clients_sites", "full");
  if (!check.session) return { ok: false, error: check.error ?? "Not allowed." };

  if (!isId(input.clientId) || !isId(input.fileId) || typeof input.shared !== "boolean") {
    return { ok: false, error: "File not found." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_files")
    .update({ shared_with_team: input.shared })
    .eq("workspace_id", check.session.workspaceId)
    .eq("client_id", input.clientId)
    .eq("id", input.fileId)
    .select("id");
  if (error) return { ok: false, error: friendly(error) };
  if (!data.length) return { ok: false, error: "File not found." };

  revalidatePath(`/clients/${input.clientId}`);
  return { ok: true };
}

export async function deleteClientFileAction(input: { clientId: number; fileId: number }): Promise<SaveResult> {
  const check = await checkPermission("clients_sites", "full");
  if (!check.session) return { ok: false, error: check.error ?? "Not allowed." };

  if (!isId(input.clientId) || !isId(input.fileId)) return { ok: false, error: "File not found." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_files")
    .delete()
    .eq("workspace_id", check.session.workspaceId)
    .eq("client_id", input.clientId)
    .eq("id", input.fileId)
    .select("storage_path");
  if (error) return { ok: false, error: friendly(error) };
  if (!data.length) return { ok: false, error: "File not found." };

  // The row is gone, so nobody can reach this file now. If removing it fails
  // it's only left taking up space, so the person isn't told it failed.
  const { error: removeError } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .remove(data.map((file) => file.storage_path));
  if (removeError) console.error("Couldn't remove a stored client file:", removeError.message);

  revalidatePath(`/clients/${input.clientId}`);
  return { ok: true };
}
