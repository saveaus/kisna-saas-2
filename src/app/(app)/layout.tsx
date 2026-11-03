import { Sidebar } from "@/components/shell/sidebar";
import { AskBar } from "@/components/shell/ask-bar";
import { SetupNotice } from "@/components/auth/setup-notice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSession, sessionCan } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/permissions";

// Every page depends on who is signed in.
export const dynamic = "force-dynamic";

/** App shell: Lightfield sidebar on the left, page on the right, Ask bar floating over the page. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const session = await getSession();

  // Hide what this role can't open. The database enforces the same rules.
  const hidden: string[] = [];
  if (!sessionCan(session, "clients_sites", "read")) hidden.push("/sites");
  if (!sessionCan(session, "staff", "read")) hidden.push("/staff");

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        workspaceName={session.workspaceName}
        userName={session.name}
        roleLabel={ROLE_LABELS[session.role]}
        hiddenHrefs={hidden}
        canOpenSettings={session.role === "superadmin" || sessionCan(session, "settings", "read")}
      />
      <main className="relative min-w-0 flex-1 bg-canvas">
        {children}
        <AskBar />
      </main>
    </div>
  );
}
