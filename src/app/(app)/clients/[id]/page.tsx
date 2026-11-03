import { notFound } from "next/navigation";
import { ClientRecordView } from "@/features/clients/client-record";
import { getClient } from "@/lib/data/records.server";
import { getSession, sessionCan } from "@/lib/session";

export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isInteger(clientId)) notFound();

  const [session, client] = await Promise.all([getSession(), getClient(clientId)]);
  // Not found also covers "not allowed": the database hides clients you can't see.
  if (!client) notFound();

  return (
    <ClientRecordView client={client} canSeeFinance={sessionCan(session, "finance", "read")} />
  );
}
