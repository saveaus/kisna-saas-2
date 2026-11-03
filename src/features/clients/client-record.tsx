"use client";

import { useState } from "react";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  Eye,
  Files,
  LayoutGrid,
  ListChecks,
  Package,
  StickyNote,
  Users,
  Wallet,
} from "lucide-react";
import { RecordView, type RecordEditing } from "@/components/record/record-view";
import { Button, Chip, EmptyState } from "@/components/ui/primitives";
import type { ClientRecord, FieldValue, NoteItem, StaffOption } from "@/lib/records";
import {
  CLIENT_SECTIONS,
  clientTypeLevel,
  isFieldEditable,
  missingClientFields,
  type FieldDef,
} from "@/lib/fields";
import { fundingTone } from "./clients-view";
import {
  setClientStaffListAction,
  updateClientFieldAction,
  updateClientStaffAction,
} from "./actions";

function Highlight({ label, value, missing }: { label: string; value?: string; missing?: boolean }) {
  return (
    <div className="hairline rounded-[8px] bg-surface px-3 py-2.5">
      <div className="text-[12px] text-ink-4">{label}</div>
      <div className={!value && missing ? "text-[13px] text-[var(--orange-ink)]" : "text-[13px] font-medium text-ink"}>
        {value || (missing ? "Missing" : "None")}
      </div>
    </div>
  );
}

const FINANCE_SECTION = "Client Financial Details";
const FINANCE_KEYS = new Set(
  CLIENT_SECTIONS.find((s) => s.title === FINANCE_SECTION)?.fields.map((f) => f.key),
);

/** Labels for staff pickers. Two people with one name get their ID to tell them apart. */
function staffLabels(options: StaffOption[]) {
  const counts = new Map<string, number>();
  for (const s of options) counts.set(s.name, (counts.get(s.name) ?? 0) + 1);
  return options.map((s) => ({
    id: s.id,
    label: (counts.get(s.name) ?? 0) > 1 ? `${s.name} (#${s.id})` : s.name,
  }));
}

function ActivityList({ items }: { items: { what: string; who: string; when: string }[] }) {
  if (!items.length) return <div className="text-[13px] text-ink-5">No recent activity</div>;
  return (
    <div className="flex flex-col">
      {items.map((a, i) => (
        <div key={i} className="flex items-center gap-2 border-b-[0.5px] border-line py-2 text-[13px] last:border-0">
          <Activity size={13} className="text-ink-4" />
          <span className="font-medium text-ink">{a.what}</span>
          <span className="text-ink-4">· {a.who}</span>
          <span className="ml-auto text-[12px] text-ink-4">{a.when}</span>
        </div>
      ))}
    </div>
  );
}

function Notes({ initial }: { initial: NoteItem[] }) {
  const [notes, setNotes] = useState(initial);
  const [draft, setDraft] = useState("");
  return (
    <div className="flex max-w-[720px] flex-col gap-3">
      <div className="hairline rounded-[10px] bg-surface p-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Write a note…"
          className="block w-full resize-none bg-transparent px-1 text-[13px] outline-none placeholder:text-ink-5"
        />
        <div className="flex justify-end">
          <Button
            disabled={!draft.trim()}
            onClick={() => {
              setNotes([
                { id: Date.now(), author: "You", body: draft.trim(), when: "just now", edited: false, canEdit: false, canDelete: false },
                ...notes,
              ]);
              setDraft("");
            }}
          >
            Add note
          </Button>
        </div>
      </div>
      {notes.length === 0 && <div className="text-[13px] text-ink-5">No notes yet</div>}
      {notes.map((n, i) => (
        <div key={i} className="hairline rounded-[8px] bg-surface px-3 py-2.5">
          <div className="mb-1 flex items-center gap-2 text-[12px]">
            <span className="font-medium text-ink">{n.author}</span>
            <span className="text-ink-4">{n.when}</span>
          </div>
          <div className="text-[13px] whitespace-pre-wrap text-ink">{n.body}</div>
        </div>
      ))}
      <p className="text-[12px] text-ink-4">Not saved yet: notes are stored from Step 3.</p>
    </div>
  );
}

const soon = (icon: typeof Wallet, title: string, when: string) => (
  <EmptyState icon={icon} title={title} body={`Arrives in ${when}.`} />
);

export function ClientRecordView({
  client,
  canSeeFinance,
  canEdit,
  canEditFinance,
  staffOptions,
}: {
  client: ClientRecord;
  canSeeFinance: boolean;
  canEdit: boolean;
  canEditFinance: boolean;
  staffOptions: StaffOption[];
}) {
  // Replaced below as each part of Step 3 lands.
  const activity: { what: string; who: string; when: string }[] = [];
  const notes: NoteItem[] = [];
  const allergies = Array.isArray(client.allergies) ? client.allergies.join(", ") : undefined;
  const funding = client.fundingType ? String(client.fundingType) : undefined;

  const staff = staffLabels(staffOptions);
  const staffNames = staff.map((s) => s.label);
  const staffId = (label: FieldValue) => staff.find((s) => s.label === label)?.id;

  const editing: RecordEditing | undefined =
    canEdit || canEditFinance
      ? {
          options: {
            careManager: staffNames,
            scheduler: staffNames,
            preferredStaff: staffNames,
            doNotSend: staffNames,
          },
          canEdit: (field: FieldDef) => {
            if (!isFieldEditable(field)) return false;
            if (FINANCE_KEYS.has(field.key)) return canEditFinance;
            if (field.type === "relation" && staffNames.length === 0) return false;
            return canEdit;
          },
          onSave: async (field, value) => {
            const result = await (async () => {
              if (field.key === "careManager" || field.key === "scheduler") {
                return updateClientStaffAction({
                  clientId: client.id,
                  key: field.key,
                  staffId: staffId(value) ?? null,
                });
              }
              if (field.key === "preferredStaff" || field.key === "doNotSend") {
                const labels = Array.isArray(value) ? value : [];
                return setClientStaffListAction({
                  clientId: client.id,
                  key: field.key,
                  staffIds: labels
                    .map(staffId)
                    .filter((id): id is number => id !== undefined),
                });
              }
              return updateClientFieldAction({ clientId: client.id, key: field.key, value });
            })();
            return result.ok ? undefined : result.error;
          },
        }
      : undefined;

  return (
    <RecordView
      backHref="/clients"
      backLabel="Clients"
      name={client.name}
      status={client.status}
      idLabel={`ID: ${client.id}`}
      incomplete={missingClientFields(client)}
      detailsTitle="Client details"
      sections={
        canSeeFinance
          ? CLIENT_SECTIONS
          : CLIENT_SECTIONS.filter((sec) => sec.title !== FINANCE_SECTION)
      }
      record={client}
      editing={editing}
      related={[
        { title: "Contacts", items: [], empty: "No contacts yet (Step 3)" },
        { title: "Upcoming shifts", items: [], empty: "Roster arrives in Phase 2" },
        { title: "Lists", items: [], empty: "Not in any lists" },
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
                    <div className="mb-0.5 text-[12px] text-ink-4">Funding</div>
                    {funding ? (
                      <Chip tone={fundingTone[funding]}>{funding}</Chip>
                    ) : (
                      <span className="text-[13px] text-[var(--orange-ink)]">Missing</span>
                    )}
                  </div>
                  <Highlight label="Classification" value={client.classification as string} />
                  <Highlight label="Level / Type" value={clientTypeLevel(client)} />
                  <Highlight label="Care Manager" value={client.careManager as string} missing />
                  <Highlight label="Scheduler" value={client.scheduler as string} missing />
                  <Highlight label="Allergies" value={allergies} />
                </div>
              </section>
              <section>
                <h2 className="mb-1 text-[13px] font-medium text-ink">Activity</h2>
                <ActivityList items={activity} />
              </section>
            </div>
          ),
        },
        { key: "notes", label: "Notes", icon: StickyNote, content: <Notes initial={notes} /> },
        { key: "budget", label: "Budget", icon: Wallet, content: soon(Wallet, "Budget and billables", "Phase 4 (Finance)") },
        { key: "careplan", label: "Care Plan", icon: ClipboardList, content: soon(ClipboardList, "Care plans", "Phase 3") },
        { key: "observe", label: "Observe", icon: Eye, content: soon(Eye, "Incidents and AI cautions", "Phase 3") },
        { key: "tasks", label: "Tasks", icon: ListChecks, content: soon(ListChecks, "Tasks", "Phase 6") },
        { key: "files", label: "Files", icon: Files, content: soon(Files, "Files", "Step 3") },
        { key: "contacts", label: "Contacts", icon: Users, content: soon(Users, "Family, coordinators and plan managers", "Step 3") },
        { key: "orders", label: "Orders", icon: Package, content: soon(Package, "Orders and consumables", "Phase 4") },
        { key: "roster", label: "Roster", icon: CalendarDays, content: soon(CalendarDays, "This client's shifts", "Phase 2") },
      ]}
    />
  );
}
