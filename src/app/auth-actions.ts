"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** First sign-in with no workspace yet: create one and become its superadmin. */
export async function createWorkspaceAction(
  workspaceName: string,
  myName: string,
): Promise<{ ok: boolean; error?: string }> {
  const name = workspaceName.trim();
  const me = myName.trim();
  if (!name || !me) return { ok: false, error: "Add your business name and your name." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_workspace", {
    workspace_name: name,
    my_name: me,
  });
  if (error) return { ok: false, error: error.message };
  redirect("/");
}
