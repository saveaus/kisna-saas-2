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
import { Avatar, Chip, EmptyState } from "@/components/ui/primitives";
import { initials } from "@/lib/cn";
import type {
  ActivityItem,
  ClientRecord,
  ContactItem,
  FileItem,
  NoteItem,
  StaffOption,
} from "@/lib/records";
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
import { ClientContacts, ContactPopup } from "./client-contacts";
import { ClientFiles } from "./client-files";
import { ClientNotes, NoteCard } from "./client-notes";
import { buildStaffPicker } from "./staff-picker";

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

function ActivityList({ items }: { items: ActivityItem[] }) {
  if (!items.length) return <div className="text-[13px] text-ink-5">No recent activity</div>;
  return (
    <div className="flex flex-col">
      {items.map((a) => (
        <div key={a.id} className="flex items-center gap-2 border-b-[0.5px] border-line py-2 text-[13px] last:border-0">
          <Activity size={13} className="shrink-0 text-ink-4" />
          <span className="min-w-0 truncate font-medium text-ink">{a.what}</span>
          <span className="shrink-0 text-ink-4">· {a.who}</span>
          <span className="ml-auto shrink-0 text-[12px] text-ink-4">{a.when}</span>
        </div>
      ))}
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
  notes,
  contacts,
  files,
  activity,
}: {
  client: ClientRecord;
  canSeeFinance: boolean;
  canEdit: boolean;
  canEditFinance: boolean;
  staffOptions: StaffOption[];
  notes: NoteItem[];
  contacts: ContactItem[];
  files: FileItem[];
  activity: ActivityItem[];
}) {
  const [noteDraft, setNoteDraft] = useState("");
  // Null when closed. An empty object adds a contact; a contact edits it.
  const [contactPopup, setContactPopup] = useState<{ contact?: ContactItem } | null>(null);

  const allergies = Array.isArray(client.allergies) ? client.allergies.join(", ") : undefined;
  const funding = client.fundingType ? String(client.fundingType) : undefined;

  const picker = buildStaffPicker(client, staffOptions);
  const staffNames = picker.labels;

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
                  staffId: picker.idFor(value) ?? null,
                });
              }
              if (field.key === "preferredStaff" || field.key === "doNotSend") {
                const labels = Array.isArray(value) ? value : [];
                return setClientStaffListAction({
                  clientId: client.id,
                  key: field.key,
                  staffIds: labels
                    .map(picker.idFor)
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
    <>
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
        record={picker.record}
        editing={editing}
        createItems={
          canEdit
            ? [
                { label: "Note", icon: StickyNote, tab: "notes" },
                { label: "Contact", icon: Users, tab: "contacts", onSelect: () => setContactPopup({}) },
                { label: "File", icon: Files, tab: "files" },
              ]
            : []
        }
        related={[
          {
            title: "Contacts",
            tab: "contacts",
            empty: "No contacts yet",
            items: contacts.slice(0, 3).map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 text-[13px] text-ink">
                <Avatar label={initials(c.name)} size={16} />
                <span className="truncate">{c.name}</span>
                <span className="ml-auto shrink-0 text-[12px] text-ink-4">{c.contactType}</span>
              </div>
            )),
          },
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
                  <ActivityList items={activity.slice(0, 10)} />
                </section>
                <section>
                  <h2 className="mb-2 text-[13px] font-medium text-ink">Latest notes</h2>
                  {notes.length === 0 ? (
                    <div className="text-[13px] text-ink-5">No notes yet</div>
                  ) : (
                    <div className="flex max-w-[720px] flex-col gap-2">
                      {notes.slice(0, 3).map((note) => (
                        <NoteCard key={note.id} note={note} />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ),
          },
          {
            key: "notes",
            label: "Notes",
            icon: StickyNote,
            content: (
              <ClientNotes
                clientId={client.id}
                notes={notes}
                canAdd={canEdit}
                draft={noteDraft}
                onDraftChange={setNoteDraft}
              />
            ),
          },
          {
            key: "files",
            label: "Files",
            icon: Files,
            content: <ClientFiles clientId={client.id} files={files} canEdit={canEdit} />,
          },
          {
            key: "contacts",
            label: "Contacts",
            icon: Users,
            content: (
              <ClientContacts
                clientId={client.id}
                contacts={contacts}
                canEdit={canEdit}
                onAdd={() => setContactPopup({})}
                onEdit={(contact) => setContactPopup({ contact })}
              />
            ),
          },
          { key: "budget", label: "Budget", icon: Wallet, more: true, content: soon(Wallet, "Budget and billables", "Phase 4 (Finance)") },
          { key: "careplan", label: "Care Plan", icon: ClipboardList, more: true, content: soon(ClipboardList, "Care plans", "Phase 3") },
          { key: "observe", label: "Observe", icon: Eye, more: true, content: soon(Eye, "Incidents and AI cautions", "Phase 3") },
          { key: "tasks", label: "Tasks", icon: ListChecks, more: true, content: soon(ListChecks, "Tasks", "Phase 6") },
          { key: "orders", label: "Orders", icon: Package, more: true, content: soon(Package, "Orders and consumables", "Phase 4") },
          { key: "roster", label: "Roster", icon: CalendarDays, more: true, content: soon(CalendarDays, "This client's shifts", "Phase 2") },
        ]}
      />
      {contactPopup && (
        <ContactPopup
          clientId={client.id}
          contact={contactPopup.contact}
          onClose={() => setContactPopup(null)}
        />
      )}
    </>
  );
}
