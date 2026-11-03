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

  const [session, client] = await Promise.all([getSession(), getClient(clientId)]);
  // Not found also covers "not allowed": the database hides clients you can't see.
  if (!client) notFound();

  const canEdit = sessionCan(session, "clients_sites", "full");
  const [staffOptions, notes, contacts, files, activity] = await Promise.all([
    canEdit ? listStaffOptions() : Promise.resolve([]),
    listClientNotes(clientId),
    listClientContacts(clientId),
    listClientFiles(clientId),
    listClientActivity(clientId),
  ]);

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
