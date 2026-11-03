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
  const { data: perms } = await supabase
    .from("role_permissions")
    .select("area, level")
    .eq("workspace_id", me.workspace_id)
    .eq("role", role === "superadmin" ? "service_manager" : role); // superadmin ignores the matrix

  const permissions: PermissionMap = {};
  if (role !== "superadmin") {
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

/** For server actions: the session, or a thrown error if not allowed. */
export async function requirePermission(area: AreaKey, needed: Exclude<Level, "none">) {
  const session = await getSession();
  if (!sessionCan(session, area, needed)) {
    throw new Error("You don't have permission to do that.");
  }
  return session;
}
