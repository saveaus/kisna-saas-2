"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  Cake,
  Calendar,
  Globe,
  Hash,
  KeyRound,
  ListChecks,
  Mail,
  Phone,
  ShieldCheck,
  User,
  UserRound,
} from "lucide-react";
import { DataTable, type Column, type View } from "@/components/table/data-table";
import { Chip, StatusPill, type Tone } from "@/components/ui/primitives";
import { ChipSelect, DateChip, Popup, TextChip, formatDate } from "@/components/popup/popup";
import type { FieldValue, StaffRecord } from "@/lib/records";
import { createStaffAction } from "./actions";
import { EMPLOYMENT_TYPES, GENDERS, ROLES } from "@/lib/fields";

export const roleTone: Record<string, Tone> = {
  Superadmin: "purple",
  "Service Manager": "blue",
  Scheduler: "orange",
  "Service Delivery Worker": "green",
};

const columns: Column<StaffRecord>[] = [
  { key: "name", label: "Staff Name", icon: User, width: 220 },
  { key: "id", label: "ID", icon: Hash, width: 80 },
  {
    key: "role",
    label: "Role",
    icon: ShieldCheck,
    width: 190,
    filterOptions: ROLES,
    render: (r) => <Chip tone={roleTone[String(r.role)]}>{String(r.role)}</Chip>,
  },
  { key: "gender", label: "Gender", icon: UserRound, width: 120, filterOptions: GENDERS },
  { key: "nationality", label: "Nationality", icon: Globe, width: 170 },
  {
    key: "employmentType",
    label: "Type",
    icon: Briefcase,
    width: 120,
    filterOptions: EMPLOYMENT_TYPES,
  },
  { key: "email", label: "Email", icon: Mail, width: 230 },
  { key: "phone", label: "Phone Number", icon: Phone, width: 140 },
  {
    key: "dateOfBirth",
    label: "Date of Birth",
    icon: Cake,
    width: 130,
    render: (r) => formatDate(r.dateOfBirth as string | undefined),
  },
  { key: "age", label: "Age", width: 70 },
  { key: "pendingLeave", label: "Pending Leave", icon: Calendar, width: 130, defaultHidden: true },
  { key: "checklist", label: "Checklist", icon: ListChecks, width: 110, defaultHidden: true },
  { key: "accessBusiness", label: "Associated business", icon: Building2, width: 180 },
  {
    key: "hasLogin",
    label: "Login",
    icon: KeyRound,
    width: 110,
    filterOptions: ["Linked", "No login"],
  },
  {
    key: "status",
    label: "Status",
    width: 110,
    filterOptions: ["Active", "Inactive"],
    render: (r) => <StatusPill status={r.status} />,
  },
];

/** Quick picks offered when saving a new view. */
const presets: View[] = [
  {
    key: "workers",
    label: "Support workers",
    filters: [{ column: "role", values: ["Service Delivery Worker"] }],
  },
  {
    key: "contractors",
    label: "Contractors",
    filters: [{ column: "employmentType", values: ["Contractor"] }],
  },
];

export function StaffView({
  rows,
  savedViews,
  canCreate,
  canCreateSuperadmin,
}: {
  rows: StaffRecord[];
  savedViews: View[];
  canCreate: boolean;
  canCreateSuperadmin: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState<Record<string, FieldValue>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const set = (key: string) => (value: FieldValue) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const close = () => {
    setCreating(false);
    setName("");
    setDraft({});
    setError(undefined);
  };
  // Imploy requires name, email, phone, role and type
  const canSubmit = Boolean(
    !busy && name.trim() && draft.email && draft.phone && draft.role && draft.employmentType,
  );
  const roleOptions = canCreateSuperadmin ? ROLES : ROLES.filter((r) => r !== "Superadmin");

  return (
    <>
      <DataTable
        title="Staff"
        icon={User}
        noun="staff"
        columns={columns}
        rows={rows}
        presets={presets}
        savedViews={savedViews}
        viewObject="staff"
        rowHref={(r) => `/staff/${r.id}`}
        onCreate={canCreate ? () => setCreating(true) : undefined}
      />
      <Popup
        open={creating}
        onClose={close}
        icon={User}
        label="Staff"
        title={name}
        onTitleChange={setName}
        titlePlaceholder="Staff name"
        submitLabel={busy ? "Creating…" : "Create staff"}
        canSubmit={canSubmit}
        error={error}
        onSubmit={async () => {
          setBusy(true);
          const result = await createStaffAction({ ...draft, name: name.trim() });
          setBusy(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          close();
          router.push(`/staff/${result.id}`);
        }}
        chips={
          <>
            <ChipSelect icon={ShieldCheck} placeholder="Role" value={draft.role as string | undefined} options={roleOptions} onChange={set("role")} />
            <ChipSelect icon={Briefcase} placeholder="Employment type" value={draft.employmentType as string | undefined} options={EMPLOYMENT_TYPES} onChange={set("employmentType")} />
            <TextChip icon={Mail} placeholder="Email" type="email" value={draft.email as string | undefined} onChange={set("email")} />
            <TextChip icon={Phone} placeholder="Phone" type="tel" value={draft.phone as string | undefined} onChange={set("phone")} />
            <ChipSelect icon={UserRound} placeholder="Gender" value={draft.gender as string | undefined} options={GENDERS} onChange={set("gender")} />
            <DateChip placeholder="Date of birth" value={draft.dateOfBirth as string | undefined} onChange={set("dateOfBirth")} />
          </>
        }
      />
    </>
  );
}
