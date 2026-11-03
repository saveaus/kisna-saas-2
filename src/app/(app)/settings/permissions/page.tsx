import { notFound } from "next/navigation";
import { PermissionsMatrix, type Matrix } from "@/features/settings/permissions-matrix";
import { createClient } from "@/lib/supabase/server";
import { getSession, sessionCan } from "@/lib/session";
import type { Level } from "@/lib/permissions";

export default async function PermissionsPage() {
  const session = await getSession();
  const isSuperadmin = session.role === "superadmin";
  if (!isSuperadmin && !sessionCan(session, "settings", "read")) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("role_permissions")
    .select("role, area, level")
    .eq("workspace_id", session.workspaceId);

  const matrix: Matrix = {};
  for (const row of data ?? []) {
    matrix[row.role] ??= {};
    matrix[row.role][row.area] = row.level as Level;
  }

  return <PermissionsMatrix initial={matrix} editable={isSuperadmin} />;
}
