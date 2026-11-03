import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { cleanFilters, type View, type ViewObject } from "@/lib/views";

/** The signed-in person's saved views for one table, oldest first. */
export async function listViews(object: ViewObject): Promise<View[]> {
  const session = await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_views")
    .select("id, name, filters")
    .eq("workspace_id", session.workspaceId)
    .eq("user_id", session.userId)
    .eq("object", object)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((v) => ({
    id: Number(v.id),
    key: `saved-${v.id}`,
    label: v.name,
    filters: cleanFilters(v.filters) ?? [],
  }));
}
