import { notFound } from "next/navigation";
import { StaffView } from "@/features/staff/staff-view";
import { listStaff } from "@/lib/data/records.server";
import { getSession, sessionCan } from "@/lib/session";

export default async function StaffPage() {
  const session = await getSession();
  if (!sessionCan(session, "staff", "read")) notFound();
  const rows = await listStaff();
  return (
    <StaffView
      rows={rows}
      canCreate={sessionCan(session, "staff", "full")}
      canCreateSuperadmin={session.role === "superadmin"}
    />
  );
}
