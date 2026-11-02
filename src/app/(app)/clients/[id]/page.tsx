import { notFound } from "next/navigation";
import { clients, findClient } from "@/lib/demo-data";
import { ClientRecordView } from "@/features/clients/client-record";

// Demo data: prerender each client. Step 3 replaces this with database reads.
export function generateStaticParams() {
  return clients.map((c) => ({ id: String(c.id) }));
}

export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const client = findClient(Number(id));
  if (!client) notFound();
  return <ClientRecordView client={client} />;
}
