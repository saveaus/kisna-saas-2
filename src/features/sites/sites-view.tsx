"use client";

import { Calendar, Hash, MapPin, Tag, User, Users } from "lucide-react";
import { DataTable, type Column } from "@/components/table/data-table";
import { Chip } from "@/components/ui/primitives";
import { formatDate } from "@/components/popup/popup";
import type { SiteRecord } from "@/lib/records";

const columns: Column<SiteRecord>[] = [
  { key: "name", label: "Site Name", icon: MapPin, width: 220 },
  { key: "id", label: "ID", icon: Hash, width: 70 },
  {
    key: "siteType",
    label: "Site Type",
    icon: Tag,
    width: 220,
    render: (r) => (r.siteType ? <Chip>{String(r.siteType)}</Chip> : null),
  },
  { key: "address", label: "Address", icon: MapPin, width: 240 },
  { key: "capacity", label: "Capacity", icon: Users, width: 100 },
  { key: "occupancy", label: "Occupancy", icon: Users, width: 110 },
  { key: "maximumStaff", label: "Maximum Staff", icon: User, width: 130 },
  { key: "manager", label: "Manager", icon: User, width: 180 },
  {
    key: "nextInspection",
    label: "Next Inspection",
    icon: Calendar,
    width: 140,
    render: (r) => formatDate(r.nextInspection as string | undefined),
  },
];

/** Sites list. Site records and Create site arrive in Step 3. */
export function SitesView({ rows }: { rows: SiteRecord[] }) {
  return <DataTable title="Sites" icon={MapPin} noun="site" columns={columns} rows={rows} />;
}
