import { ClientsView } from "@/features/clients/clients-view";
import { listClients, listStaffOptions } from "@/lib/data/records.server";
import { listViews } from "@/lib/data/views.server";
import { getSession, sessionCan } from "@/lib/session";

export default async function ClientsPage() {
  const session = await getSession();
  const canCreate = sessionCan(session, "clients_sites", "full");
  const [rows, staffOptions, savedViews] = await Promise.all([
    listClients(),
    canCreate ? listStaffOptions() : Promise.resolve([]),
    listViews("clients"),
  ]);
  return <ClientsView rows={rows} savedViews={savedViews} canCreate={canCreate} staffOptions={staffOptions} />;
}
