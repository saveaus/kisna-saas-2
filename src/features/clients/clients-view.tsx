"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cake,
  Calendar,
  Hash,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Tag,
  TriangleAlert,
  User,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { DataTable, type Column, type View } from "@/components/table/data-table";
import { Chip, StatusPill, type Tone } from "@/components/ui/primitives";
import { formatDate } from "@/components/popup/popup";
import type { ClientRecord, StaffOption } from "@/lib/records";
import {
  CLASSIFICATIONS,
  FUNDING_TYPES,
  GENDERS,
  clientTypeLevel,
  missingClientFields,
} from "@/lib/fields";
import { CreateClientPopup } from "./create-client-popup";
import { createClientAction } from "./actions";

export const fundingTone: Record<string, Tone> = {
  NDIS: "purple",
  HCP: "blue",
  "Support at Home": "green",
  "Transitioned HCP": "blue",
  "Grandfathered HCP": "blue",
  Private: "neutral",
};

const columns: Column<ClientRecord>[] = [
  { key: "name", label: "Client Name", icon: User, width: 220 },
  { key: "id", label: "ID", icon: Hash, width: 70 },
  {
    key: "fundingType",
    label: "Funding",
    icon: Wallet,
    width: 150,
    filterOptions: FUNDING_TYPES,
    render: (r) =>
      r.fundingType ? (
        <Chip tone={fundingTone[String(r.fundingType)]}>{String(r.fundingType)}</Chip>
      ) : null,
  },
  {
    key: "typeLevel",
    label: "Type / Level",
    icon: Tag,
    width: 170,
    value: (r) => clientTypeLevel(r) ?? "",
    render: (r) => {
      const typeLevel = clientTypeLevel(r);
      return typeLevel ? <Chip>{typeLevel}</Chip> : null;
    },
  },
  {
    key: "classification",
    label: "Classification",
    icon: MapPin,
    width: 150,
    filterOptions: CLASSIFICATIONS,
    defaultHidden: true,
  },
  {
    key: "dateOfBirth",
    label: "Date of Birth",
    icon: Cake,
    width: 130,
    render: (r) => formatDate(r.dateOfBirth as string | undefined),
  },
  { key: "phone", label: "Phone Number", icon: Phone, width: 140 },
  { key: "email", label: "Email Address", icon: Mail, width: 200 },
  { key: "address", label: "Address", icon: MapPin, width: 240 },
  { key: "gender", label: "Gender", icon: UserRound, width: 120, filterOptions: GENDERS },
  {
    key: "startDate",
    label: "Start Date",
    icon: Calendar,
    width: 120,
    render: (r) => formatDate(r.startDate as string | undefined),
  },
  { key: "reference", label: "Reference No.", icon: Hash, width: 130, defaultHidden: true },
  { key: "careManager", label: "Care Manager", icon: Users, width: 170 },
  { key: "scheduler", label: "Scheduler", icon: Calendar, width: 160 },
  {
    key: "allergies",
    label: "Allergies",
    icon: ShieldCheck,
    width: 180,
    defaultHidden: true,
  },
  {
    key: "status",
    label: "Status",
    width: 110,
    filterOptions: ["Active", "Inactive"],
    render: (r) => <StatusPill status={r.status} />,
  },
  {
    key: "profile",
    label: "Profile",
    icon: TriangleAlert,
    width: 120,
    filterOptions: ["Complete", "Incomplete"],
    value: (r) => (missingClientFields(r).length ? "Incomplete" : "Complete"),
    render: (r) => {
      const missing = missingClientFields(r);
      return missing.length ? (
        <span title={`Missing: ${missing.join(", ")}`}>
          <Chip tone="orange">Incomplete</Chip>
        </span>
      ) : null;
    },
  },
];

/** Quick picks offered when saving a new view. */
const presets: View[] = [
  { key: "ndis", label: "NDIS participants", filters: [{ column: "fundingType", values: ["NDIS"] }] },
  { key: "allergies", label: "Participants with allergies", filters: [{ column: "allergies", values: ["__any__"] }] },
  { key: "incomplete", label: "Incomplete profiles", filters: [{ column: "profile", values: ["Incomplete"] }] },
];

export function ClientsView({
  rows,
  savedViews,
  canCreate,
  staffOptions,
}: {
  rows: ClientRecord[];
  savedViews: View[];
  canCreate: boolean;
  staffOptions: StaffOption[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <DataTable
        title="Clients"
        icon={Users}
        noun="client"
        columns={columns}
        rows={rows}
        presets={presets}
        savedViews={savedViews}
        viewObject="clients"
        rowHref={(r) => `/clients/${r.id}`}
        onCreate={canCreate ? () => setCreating(true) : undefined}
      />
      {canCreate && (
        <CreateClientPopup
          open={creating}
          staffOptions={staffOptions}
          onClose={() => setCreating(false)}
          onCreate={async (input) => {
            const result = await createClientAction(input);
            if (!result.ok) return result.error;
            setCreating(false);
            router.push(`/clients/${result.id}`);
            return undefined;
          }}
        />
      )}
    </>
  );
}
