"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { AREAS, LEVELS, ROLE_KEYS, type AreaKey, type Level, type RoleKey } from "@/lib/permissions";

/** Change one cell of the permission matrix. Superadmin only. */
export async function updatePermissionAction(
  role: RoleKey,
  area: AreaKey,
  level: Level,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (session.role !== "superadmin") {
    return { ok: false, error: "Only a superadmin can change permissions." };
  }
  if (
    role === "superadmin" ||
    !ROLE_KEYS.includes(role) ||
    !AREAS.some((a) => a.key === area) ||
    !LEVELS.includes(level)
  ) {
    return { ok: false, error: "That permission doesn't exist." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("role_permissions")
    .upsert({ workspace_id: session.workspaceId, role, area, level });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/permissions");
  return { ok: true };
}
