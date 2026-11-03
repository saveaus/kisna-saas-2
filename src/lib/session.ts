import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, type AreaKey, type Level, type PermissionMap, type RoleKey } from "@/lib/permissions";

export type SessionContext = {
  userId: string;
  email: string;
  staffId: number;
  name: string;
  role: RoleKey;
  workspaceId: string;
  workspaceName: string;
  permissions: PermissionMap;
};

/**
 * The signed-in user, their staff record, workspace and permissions.
 * Cached per request. Redirects to /login or /onboarding when needed.
 */
export const getSession = cache(async (): Promise<SessionContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("staff")
    .select("id, name, role, workspace_id, workspaces(name)")
    .eq("user_id", user.id)
    .eq("status", "Active")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (!me) redirect("/onboarding");

  const role = me.role as RoleKey;
  const permissions: PermissionMap = {};
  // Superadmin always has full access, so the matrix only matters for other roles.
  if (role !== "superadmin") {
    const { data: perms } = await supabase
      .from("role_permissions")
      .select("area, level")
      .eq("workspace_id", me.workspace_id)
      .eq("role", role);
    for (const p of perms ?? []) permissions[p.area as AreaKey] = p.level as Level;
  }

  const workspace = me.workspaces as unknown as { name: string } | null;
  return {
    userId: user.id,
    email: user.email ?? "",
    staffId: Number(me.id),
    name: me.name,
    role,
    workspaceId: me.workspace_id,
    workspaceName: workspace?.name ?? "Workspace",
    permissions,
  };
});

export function sessionCan(
  session: SessionContext,
  area: AreaKey,
  needed: Exclude<Level, "none">,
) {
  return can(session.role, session.permissions, area, needed);
}

/**
 * For server actions. Call it OUTSIDE any try/catch: when the session has
 * expired it redirects to /login, which works by throwing.
 * Returns the session, or an error message if this role isn't allowed.
 */
export async function checkPermission(
  area: AreaKey,
  needed: Exclude<Level, "none">,
): Promise<{ session: SessionContext; error?: undefined } | { session?: undefined; error: string }> {
  const session = await getSession();
  if (!sessionCan(session, area, needed)) {
    return { error: "You don't have permission to do that." };
  }
  return { session };
}
