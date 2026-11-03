import { notFound } from "next/navigation";
import { StaffRecordView } from "@/features/staff/staff-record";
import { getStaff } from "@/lib/data/records.server";
import { getSession, sessionCan } from "@/lib/session";

export default async function StaffMemberPage({ params }: PageProps<"/staff/[id]">) {
  const { id } = await params;
  const staffId = Number(id);
  if (!Number.isInteger(staffId)) notFound();

  const [session, person] = await Promise.all([getSession(), getStaff(staffId)]);
  // Not found also covers "not allowed": the database hides records you can't see.
  if (!person) notFound();

  return (
    <StaffRecordView
      person={person}
      canInvite={session.role === "superadmin"}
      canEdit={sessionCan(session, "staff", "full")}
      viewerIsSuperadmin={session.role === "superadmin"}
      viewerStaffId={session.staffId}
    />
  );
}
