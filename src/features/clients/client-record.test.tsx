/**
 * Renders the client screens to HTML, so a crash while drawing them fails the
 * tests, and checks each role sees the right controls. The database decides
 * what's really allowed (supabase/tests); this checks the screens agree.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ActivityItem, ClientRecord, ContactItem, FileItem, NoteItem } from "@/lib/records";
import { ClientContacts } from "./client-contacts";
import { ClientFiles } from "./client-files";
import { ClientNotes } from "./client-notes";
import { ClientRecordView } from "./client-record";

vi.mock("./actions", () => ({}));
vi.mock("@/features/views/actions", () => ({}));
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({}) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

const client: ClientRecord = {
  id: 7,
  name: "Margaret Doyle",
  status: "Active",
  fundingType: "HCP",
  level: "Level 4",
  email: "margaret@example.com",
  phone: "0412 100 201",
  careManager: "Sam Lee",
  careManagerId: 2,
  allergies: ["Peanuts"],
  bsb: "000-000",
  preferredStaff: ["Sam Lee"],
  preferredStaffIds: ["2"],
};

const notes: NoteItem[] = [
  { id: 1, author: "Maya Chen", body: "My note", when: "just now", edited: false, canEdit: true, canDelete: true },
  { id: 2, author: "Alex Morgan", body: "Their note", when: "2 days ago", edited: true, canEdit: false, canDelete: false },
];
const contacts: ContactItem[] = [
  { id: 1, name: "Helen Doyle", contactType: "Family", relationship: "Daughter", phone: "0412", email: "helen@example.com" },
  { id: 2, name: "Daniel Foster", contactType: "Support Coordinator" },
];
const files: FileItem[] = [
  { id: 9, name: "plan.pdf", size: 2048, mimeType: "application/pdf", uploadedBy: "Maya Chen", when: "just now", shared: false },
  { id: 10, name: "roster.pdf", size: 10, mimeType: "application/pdf", uploadedBy: "Maya Chen", when: "just now", shared: true },
];
const activity: ActivityItem[] = [{ id: 1, what: "Updated Phone", who: "Maya Chen", when: "just now" }];

const props = {
  client,
  canSeeFinance: true,
  canEdit: true,
  canEditFinance: true,
  staffOptions: [
    { id: 1, name: "Sam Lee" },
    { id: 2, name: "Sam Lee" },
    { id: 3, name: "Maya Chen" },
  ],
  notes,
  contacts,
  files,
  activity,
};

const render = (overrides = {}) =>
  renderToStaticMarkup(<ClientRecordView {...props} {...overrides} />);

describe("client record", () => {
  it("shows the overview: highlights, activity, latest notes and related contacts", () => {
    const html = render();
    expect(html).toContain("Margaret Doyle");
    expect(html).toContain("Level 4");
    expect(html).toContain("Updated Phone");
    expect(html).toContain("My note");
    expect(html).toContain("Helen Doyle");
  });

  it("flags an incomplete profile", () => {
    expect(render()).toContain("Incomplete");
    expect(
      render({
        client: { ...client, startDate: "2026-01-01", scheduler: "Sam Lee", schedulerId: 2 },
      }),
    ).not.toContain("Incomplete");
  });

  it("lets editors change fields and open the Create menu", () => {
    const html = render();
    expect(html).toContain("Set date of birth…");
    expect(html).not.toContain("don&#x27;t have permission to add");
  });

  it("is read-only without edit access", () => {
    const html = render({ canEdit: false, canEditFinance: false, staffOptions: [] });
    expect(html).toContain("don&#x27;t have permission to add");
    expect(html).not.toContain("Set date of birth");
  });

  it("hides bank details without finance access", () => {
    expect(render()).toContain("Client Financial Details");
    expect(render({ canSeeFinance: false, canEditFinance: false })).not.toContain("Client Financial Details");
  });

  it("copes with a brand-new client with nothing on it", () => {
    const html = render({
      client: { id: 8, name: "New Client", status: "Active" },
      notes: [],
      contacts: [],
      files: [],
      activity: [],
    });
    expect(html).toContain("New Client");
    expect(html).toContain("No recent activity");
    expect(html).toContain("No contacts yet");
    expect(html).toContain("Missing");
  });
});

describe("notes tab", () => {
  const renderNotes = (canAdd: boolean) =>
    renderToStaticMarkup(
      <ClientNotes clientId={7} notes={notes} canAdd={canAdd} draft="" onDraftChange={() => {}} />,
    );

  it("offers Add note only to people who can write", () => {
    expect(renderNotes(true)).toContain("Add note");
    expect(renderNotes(false)).not.toContain("Add note");
  });

  it("only offers Edit and Delete on notes this person can change", () => {
    const html = renderNotes(true);
    expect(html.match(/>Edit</g)?.length).toBe(1);
    expect(html.match(/>Delete</g)?.length).toBe(1);
    expect(html).toContain("2 days ago · edited");
  });
});

describe("contacts tab", () => {
  const renderContacts = (canEdit: boolean, list = contacts) =>
    renderToStaticMarkup(
      <ClientContacts clientId={7} contacts={list} canEdit={canEdit} onAdd={() => {}} onEdit={() => {}} />,
    );

  it("lists contacts in the table", () => {
    const html = renderContacts(true);
    expect(html).toContain("Helen Doyle");
    expect(html).toContain("Support Coordinator");
    expect(html).toContain("mailto:helen@example.com");
  });

  it("only offers changes to people with edit access", () => {
    expect(renderContacts(true)).toContain("Remove");
    expect(renderContacts(true)).toContain("Create contact");
    expect(renderContacts(false)).not.toContain("Remove");
    expect(renderContacts(false)).not.toContain("Create contact");
  });

  it("shows an empty state", () => {
    expect(renderContacts(true, [])).toContain("Add contact");
    expect(renderContacts(false, [])).not.toContain("Add contact");
  });
});

describe("files tab", () => {
  const renderFiles = (canEdit: boolean, list = files) =>
    renderToStaticMarkup(<ClientFiles clientId={7} files={list} canEdit={canEdit} />);

  it("links to the checked route, never to storage directly", () => {
    const html = renderFiles(true);
    expect(html).toContain('href="/clients/7/files/9"');
    expect(html).not.toContain("storage");
    expect(html).toContain("2 KB");
  });

  it("only offers upload and delete to people with edit access", () => {
    expect(renderFiles(true)).toContain("Upload file");
    expect(renderFiles(true)).toContain(">Delete<");
    expect(renderFiles(false)).not.toContain("Upload file");
    expect(renderFiles(false)).not.toContain(">Delete<");
    expect(renderFiles(false)).toContain("plan.pdf");
  });

  it("shows whether each file is shared, and lets editors change it", () => {
    const editor = renderFiles(true);
    expect(editor).toContain(">Private<");
    expect(editor).toContain(">Shared<");
    expect(editor).toContain(">Share<");
    expect(editor).toContain(">Make private<");

    const reader = renderFiles(false);
    expect(reader).toContain(">Private<");
    expect(reader).not.toContain(">Share<");
    expect(reader).not.toContain(">Make private<");
  });

  it("shows an empty state", () => {
    expect(renderFiles(false, [])).toContain("No files yet");
  });
});
