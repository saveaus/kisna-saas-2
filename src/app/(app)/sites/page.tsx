import { notFound } from "next/navigation";
import { SitesView } from "@/features/sites/sites-view";
import { listSites } from "@/lib/data/records.server";
import { listViews } from "@/lib/data/views.server";
import { getSession, sessionCan } from "@/lib/session";

export default async function SitesPage() {
  const session = await getSession();
  if (!sessionCan(session, "clients_sites", "read")) notFound();
  const [rows, savedViews] = await Promise.all([listSites(), listViews("sites")]);
  return <SitesView rows={rows} savedViews={savedViews} />;
}
