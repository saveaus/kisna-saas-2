import { ClientsView } from "@/features/clients/clients-view";
import { listClients, listStaffOptions } from "@/lib/data/records.server";
import { getSession, sessionCan } from "@/lib/session";

export default async function ClientsPage() {
  const session = await getSession();
  const canCreate = sessionCan(session, "clients_sites", "full");
  const [rows, staffOptions] = await Promise.all([
    listClients(),
    canCreate ? listStaffOptions() : Promise.resolve([]),
  ]);
  return <ClientsView rows={rows} canCreate={canCreate} staffOptions={staffOptions} />;
}
