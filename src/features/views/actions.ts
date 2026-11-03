"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { VIEW_OBJECTS, cleanFilters, cleanViewName, type ViewObject } from "@/lib/views";

type Result = { ok: true; id: number } | { ok: false; error: string };

/** Save the current filters as a named view. Views are personal. */
export async function createViewAction(
  object: ViewObject,
  name: string,
  filters: unknown,
): Promise<Result> {
  const session = await getSession();
  const clean = cleanViewName(name);
  const cleanF = cleanFilters(filters);
  if (!VIEW_OBJECTS.includes(object)) return { ok: false, error: "Unknown table." };
  if (!clean) return { ok: false, error: "Give the view a name." };
  if (!cleanF) return { ok: false, error: "Those filters can't be saved." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_views")
    .insert({ workspace_id: session.workspaceId, object, name: clean, filters: cleanF })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${object}`);
  return { ok: true, id: Number(data.id) };
}

/** Rename a view and/or replace its filters. */
export async function updateViewAction(
  id: number,
  changes: { name?: string; filters?: unknown },
): Promise<Result> {
  const session = await getSession();
  const update: Record<string, unknown> = {};
  if (changes.name !== undefined) {
    const clean = cleanViewName(changes.name);
    if (!clean) return { ok: false, error: "Give the view a name." };
    update.name = clean;
  }
  if (changes.filters !== undefined) {
    const cleanF = cleanFilters(changes.filters);
    if (!cleanF) return { ok: false, error: "Those filters can't be saved." };
    update.filters = cleanF;
  }

  const supabase = await createClient();
  // Row level security also limits this to your own views.
  const { data, error } = await supabase
    .from("saved_views")
    .update(update)
    .eq("id", id)
    .eq("user_id", session.userId)
    .select("id, object")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "View not found." };
  revalidatePath(`/${data.object}`);
  return { ok: true, id };
}

export async function deleteViewAction(id: number): Promise<Result> {
  const session = await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_views")
    .delete()
    .eq("id", id)
    .eq("user_id", session.userId)
    .select("id, object")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "View not found." };
  revalidatePath(`/${data.object}`);
  return { ok: true, id };
}
