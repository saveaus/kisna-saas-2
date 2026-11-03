import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSession, sessionCan } from "@/lib/session";
import { describeActivity, timeAgo, type ActivityRow } from "@/lib/activity";
import { CLIENT_FILES_BUCKET } from "@/lib/fields";
import {
  CONTACT_COLUMNS,
  fromRow,
  type ActivityItem,
  type ContactItem,
  type FileItem,
  type NoteItem,
} from "@/lib/records";

/**
 * What hangs off a client record. Every query runs as the signed-in user, so
 * row level security decides what comes back.
 */

const ACTIVITY_ROWS = 50;

/** How long a link to a stored file works. The app makes a new one per click. */
const FILE_LINK_SECONDS = 60;

/** Opened in the browser rather than downloaded. All are safe to display. */
const SHOWN_INLINE = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export async function listClientNotes(clientId: number): Promise<NoteItem[]> {
  const session = await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notes")
    .select("id, body, created_by, created_by_name, created_at, updated_at")
    .eq("workspace_id", session.workspaceId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);

  const canWrite = sessionCan(session, "clients_sites", "full");
  return (data ?? []).map((note) => {
    const mine = canWrite && note.created_by === session.userId;
    return {
      id: Number(note.id),
      author: note.created_by_name,
      body: note.body,
      when: timeAgo(note.created_at),
      edited: note.updated_at !== note.created_at,
      canEdit: mine,
      canDelete: mine || session.role === "superadmin",
    };
  });
}

export async function listClientContacts(clientId: number): Promise<ContactItem[]> {
  const session = await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_contacts")
    .select(`id, ${Object.values(CONTACT_COLUMNS).join(", ")}`)
    .eq("workspace_id", session.workspaceId)
    .eq("client_id", clientId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const r = row as unknown as Record<string, unknown>;
    return { ...fromRow(r, CONTACT_COLUMNS), id: Number(r.id) } as ContactItem;
  });
}

export async function listClientFiles(clientId: number): Promise<FileItem[]> {
  const session = await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_files")
    .select("id, name, size_bytes, mime_type, created_by_name, created_at")
    .eq("workspace_id", session.workspaceId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((file) => ({
    id: Number(file.id),
    name: file.name,
    size: Number(file.size_bytes),
    mimeType: file.mime_type,
    uploadedBy: file.created_by_name,
    when: timeAgo(file.created_at),
  }));
}

export async function listClientActivity(clientId: number): Promise<ActivityItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("client_activity", {
    cid: clientId,
    max_rows: ACTIVITY_ROWS,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ActivityRow[]).map((row) => ({
    id: Number(row.id),
    what: describeActivity(row),
    who: row.actor_name,
    when: timeAgo(row.happened_at),
  }));
}

/**
 * A short-lived link to a stored file, or null if this person can't see it.
 * The database checks both the file's row and the stored file itself.
 */
export async function getClientFileLink(clientId: number, fileId: number) {
  const session = await getSession();
  const supabase = await createClient();
  const { data: file, error } = await supabase
    .from("client_files")
    .select("name, storage_path, mime_type")
    .eq("workspace_id", session.workspaceId)
    .eq("client_id", clientId)
    .eq("id", fileId)
    .maybeSingle();
  if (error || !file) return null;

  const { data: link } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .createSignedUrl(
      file.storage_path,
      FILE_LINK_SECONDS,
      SHOWN_INLINE.includes(file.mime_type) ? undefined : { download: file.name },
    );
  return link?.signedUrl ?? null;
}
