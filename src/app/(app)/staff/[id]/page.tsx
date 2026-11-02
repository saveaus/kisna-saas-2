import { notFound } from "next/navigation";
import { findStaff, staff } from "@/lib/demo-data";
import { StaffRecordView } from "@/features/staff/staff-record";

// Demo data: prerender each staff member. Step 4 replaces this with database reads.
export function generateStaticParams() {
  return staff.map((s) => ({ id: String(s.id) }));
}

export default async function StaffMemberPage({ params }: PageProps<"/staff/[id]">) {
  const { id } = await params;
  const person = findStaff(Number(id));
  if (!person) notFound();
  return <StaffRecordView person={person} />;
}
