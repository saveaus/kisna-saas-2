import { notFound } from "next/navigation";
import { ClientRecordView } from "@/features/clients/client-record";
import { getClient, listStaffOptions } from "@/lib/data/records.server";
import {
  listClientActivity,
  listClientContacts,
  listClientFiles,
  listClientNotes,
} from "@/lib/data/client-records.server";
import { getSession, sessionCan } from "@/lib/session";

export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isInteger(clientId)) notFound();

  const session = await getSession();
  const canEdit = sessionCan(session, "clients_sites", "full");

  // All at once: each trip to the database adds up when it's far away.
  const [client, staffOptions, notes, contacts, files, activity] = await Promise.all([
    getClient(clientId),
    canEdit ? listStaffOptions() : Promise.resolve([]),
    listClientNotes(clientId),
    listClientContacts(clientId),
    listClientFiles(clientId),
    listClientActivity(clientId),
  ]);
  // Not found also covers "not allowed": the database hides clients you can't see.
  if (!client) notFound();

  return (
    <ClientRecordView
      client={client}
      canSeeFinance={sessionCan(session, "finance", "read")}
      canEdit={canEdit}
      canEditFinance={sessionCan(session, "finance", "full")}
      staffOptions={staffOptions}
      notes={notes}
      contacts={contacts}
      files={files}
      activity={activity}
    />
  );
}
