"use client";

import {
  Activity,
  Briefcase,
  CalendarDays,
  CalendarOff,
  Files,
  LayoutGrid,
  ShieldCheck,
  StickyNote,
  Wallet,
} from "lucide-react";
import { RecordView, type RecordEditing } from "@/components/record/record-view";
import { Chip, EmptyState } from "@/components/ui/primitives";
import type { StaffRecord } from "@/lib/records";
import { InviteButton } from "./invite-button";
import {
  ROLES,
  STAFF_DOCUMENT_TYPES,
  STAFF_EMPLOYMENT_FIELDS,
  STAFF_SECTIONS,
  isFieldEditable,
} from "@/lib/fields";
import { updateStaffFieldAction } from "./actions";
import { roleTone } from "./staff-view";

function Highlight({ label, value }: { label: string; value?: string }) {
  return (
    <div className="hairline rounded-[8px] bg-surface px-3 py-2.5">
      <div className="text-[12px] text-ink-4">{label}</div>
      <div className={value ? "text-[13px] font-medium text-ink" : "text-[13px] text-[var(--orange-ink)]"}>
        {value || "Missing"}
      </div>
    </div>
  );
}

const soon = (icon: typeof Wallet, title: string, when: string) => (
  <EmptyState icon={icon} title={title} body={`Arrives in ${when}.`} />
);

export function StaffRecordView({
  person,
  canInvite,
  canEdit,
  viewerIsSuperadmin,
  viewerStaffId,
}: {
  person: StaffRecord;
  canInvite: boolean;
  /** Manage Users: full. */
  canEdit: boolean;
  viewerIsSuperadmin: boolean;
  viewerStaffId: number;
}) {
  const nationality = Array.isArray(person.nationality) ? person.nationality.join(", ") : undefined;

  // Matches the rules in updateStaffFieldAction and the database.
  const isSelf = person.id === viewerStaffId;
  const editing: RecordEditing | undefined =
    canEdit && (viewerIsSuperadmin || person.role !== "Superadmin")
      ? {
          options: { role: viewerIsSuperadmin ? ROLES : ROLES.filter((r) => r !== "Superadmin") },
          canEdit: (field) => {
            if (!isFieldEditable(field)) return false;
            if (field.key === "email" && person.hasLogin === "Linked") return false;
            if ((field.key === "role" || field.key === "status") && isSelf) return false;
            return true;
          },
          onSave: async (field, value) => {
            const result = await updateStaffFieldAction({ staffId: person.id, key: field.key, value });
            return result.ok ? undefined : result.error;
          },
        }
      : undefined;

  return (
    <RecordView
      backHref="/staff"
      backLabel="Staff"
      name={person.name}
      status={person.status}
      idLabel={`ID: ${person.id}`}
      detailsTitle="Staff details"
      sections={STAFF_SECTIONS}
      record={{ ...person, employeeId: String(person.id) }}
      editing={editing}
      related={[
        { title: "Upcoming shifts", items: [], empty: "Roster arrives in Phase 2" },
        { title: "Clients", items: [], empty: "Client assignments arrive in Step 4" },
      ]}
      tabs={[
        {
          key: "overview",
          label: "Overview",
          icon: LayoutGrid,
          content: (
            <div className="flex max-w-[880px] flex-col gap-5">
              <section>
                <h2 className="mb-2 text-[13px] font-medium text-ink">Highlights</h2>
                <div className="grid grid-cols-3 gap-2">
                  <div className="hairline rounded-[8px] bg-surface px-3 py-2.5">
                    <div className="mb-0.5 text-[12px] text-ink-4">Role</div>
                    <Chip tone={roleTone[String(person.role)]}>{String(person.role)}</Chip>
                  </div>
                  <Highlight label="Nationality" value={nationality} />
                  <Highlight label="Type" value={person.employmentType as string} />
                  <Highlight label="Employee ID" value={String(person.id)} />
                  <Highlight label="Login" value={person.hasLogin as string} />
                  <Highlight label="Access Business" value={person.accessBusiness as string} />
                </div>
              </section>
              {canInvite && person.hasLogin !== "Linked" && (
                <InviteButton staffId={person.id} email={person.email as string} />
              )}
            </div>
          ),
        },
        {
          key: "compliance",
          label: "Compliance",
          icon: ShieldCheck,
          content: (
            <div className="max-w-[720px]">
              <p className="mb-2 text-[12px] text-ink-4">
                Document types from Imploy. Uploads, expiry tracking and per-team requirements arrive in Phase 3.
              </p>
              <div className="hairline rounded-[8px] bg-surface">
                {STAFF_DOCUMENT_TYPES.map((d) => (
                  <div key={d} className="flex h-10 items-center justify-between border-b-[0.5px] border-line px-3 text-[13px] last:border-0">
                    <span className="text-ink">{d}</span>
                    <span className="text-ink-5">Not on file</span>
                  </div>
                ))}
              </div>
            </div>
          ),
        },
        {
          key: "employment",
          label: "Employment",
          icon: Briefcase,
          content: (
            <div className="hairline max-w-[720px] rounded-[8px] bg-surface">
              {STAFF_EMPLOYMENT_FIELDS.map((f) => (
                <div key={f.key} className="flex h-10 items-center border-b-[0.5px] border-line px-3 text-[13px] last:border-0">
                  <span className="w-[300px] text-ink-4">{f.label}</span>
                  <span className="text-ink-5">{String(person[f.key] ?? "—")}</span>
                </div>
              ))}
            </div>
          ),
        },
        { key: "notes", label: "Notes", icon: StickyNote, more: true, content: soon(StickyNote, "Staff notes", "Step 4") },
        { key: "files", label: "Files", icon: Files, more: true, content: soon(Files, "Files", "Step 4") },
        { key: "activity", label: "Activity", icon: Activity, more: true, content: soon(Activity, "Activity history", "Step 4") },
        { key: "leave", label: "Leave", icon: CalendarOff, more: true, content: soon(CalendarOff, "Leave requests", "Phase 2") },
        { key: "availability", label: "Availability", icon: CalendarDays, more: true, content: soon(CalendarDays, "Availability", "Phase 2") },
        { key: "finance", label: "Finance", icon: Wallet, more: true, content: soon(Wallet, "Pay and claims", "Phase 4") },
      ]}
    />
  );
}
