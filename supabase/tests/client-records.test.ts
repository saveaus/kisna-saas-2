/**
 * Step 3 access rules, per role: client notes, contacts, files (table and
 * private storage), the activity history and client editing.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { addUser, as, asAdmin, asServiceRole, createTestDb, type Db } from "./test-db";

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const MANAGER = "00000000-0000-0000-0000-00000000000b";
const SCHEDULER = "00000000-0000-0000-0000-00000000000c";
const WORKER = "00000000-0000-0000-0000-00000000000d";
const OUTSIDER = "00000000-0000-0000-0000-00000000000e";

let db: Db;
let ws: string;
let otherWs: string;
let schedulerStaffId: number;
let workerStaffId: number;
let outsiderStaffId: number;
let clientA: number; // the worker is on this client's team
let clientB: number; // the worker isn't
let secretClient: number; // in the other workspace

beforeAll(async () => {
  db = await createTestDb();
  for (const [id, email] of [
    [ADMIN, "admin@example.com"],
    [MANAGER, "manager@example.com"],
    [SCHEDULER, "scheduler@example.com"],
    [WORKER, "worker@example.com"],
    [OUTSIDER, "outsider@example.com"],
  ]) {
    await addUser(db, id, email);
  }

  ws = await as(db, ADMIN, async (q) => {
    const [row] = await q<{ create_workspace: string }>(
      "select public.create_workspace('Demo Provider', 'Alex Morgan')",
    );
    return row.create_workspace;
  });

  [schedulerStaffId, workerStaffId] = await as(db, ADMIN, async (q) => {
    await q(
      `insert into public.staff (workspace_id, user_id, name, role, email)
       values ($1, $2, 'Maya Chen', 'service_manager', 'manager@example.com')`,
      [ws, MANAGER],
    );
    const [s] = await q<{ id: number }>(
      `insert into public.staff (workspace_id, user_id, name, role, email)
       values ($1, $2, 'Sam Okonkwo', 'scheduler', 'scheduler@example.com') returning id`,
      [ws, SCHEDULER],
    );
    const [w] = await q<{ id: number }>(
      `insert into public.staff (workspace_id, user_id, name, role, email)
       values ($1, $2, 'Jordan Hale', 'support_worker', 'worker@example.com') returning id`,
      [ws, WORKER],
    );
    return [Number(s.id), Number(w.id)];
  });

  [clientA, clientB] = await as(db, ADMIN, async (q) => {
    const rows = await q<{ id: number }>(
      `insert into public.clients (workspace_id, name, funding_type) values
        ($1, 'Client A', 'NDIS'), ($1, 'Client B', 'HCP') returning id`,
      [ws],
    );
    const [a, b] = rows.map((r) => Number(r.id));
    await q(
      "insert into public.client_team (client_id, staff_id, workspace_id) values ($1, $2, $3)",
      [a, workerStaffId, ws],
    );
    return [a, b];
  });

  [otherWs, secretClient, outsiderStaffId] = await as(db, OUTSIDER, async (q) => {
    const [row] = await q<{ create_workspace: string }>(
      "select public.create_workspace('Other Provider', 'Sam Other')",
    );
    const [client] = await q<{ id: number }>(
      `insert into public.clients (workspace_id, name, funding_type)
       values ($1, 'Secret Client', 'NDIS') returning id`,
      [row.create_workspace],
    );
    const [me] = await q<{ id: number }>("select id from public.staff where user_id = $1", [OUTSIDER]);
    return [row.create_workspace, Number(client.id), Number(me.id)] as const;
  });
});

type ActivityRow = {
  id: number;
  actor_name: string;
  table_name: string;
  action: string;
  changed_fields: string[];
  label: string | null;
};

const activity = (client: number) => (
  q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>,
) => q<ActivityRow>("select * from public.client_activity($1)", [client]);

const addNote = (client: number, body: string, workspace = ws) => async (
  q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>,
) => {
  const [row] = await q<{ id: number; created_by: string; created_by_name: string }>(
    `insert into public.client_notes (workspace_id, client_id, body)
     values ($1, $2, $3) returning id, created_by, created_by_name`,
    [workspace, client, body],
  );
  return row;
};

describe("client notes", () => {
  it("superadmins and managers can add them, stamped with who they are", async () => {
    const mine = await as(db, MANAGER, addNote(clientA, "Prefers morning visits."));
    expect(mine.created_by).toBe(MANAGER);
    expect(mine.created_by_name).toBe("Maya Chen");
    const admins = await as(db, ADMIN, addNote(clientA, "Call the day before."));
    expect(admins.created_by_name).toBe("Alex Morgan");
  });

  it("can't be written in someone else's name", async () => {
    const row = await as(db, MANAGER, async (q) => {
      const [r] = await q<{ created_by: string; created_by_name: string }>(
        `insert into public.client_notes (workspace_id, client_id, body, created_by, created_by_name)
         values ($1, $2, 'Sneaky', $3, 'Alex Morgan') returning created_by, created_by_name`,
        [ws, clientA, ADMIN],
      );
      return r;
    });
    expect(row.created_by).toBe(MANAGER);
    expect(row.created_by_name).toBe("Maya Chen");
  });

  it("schedulers can read them but not add them", async () => {
    await as(db, SCHEDULER, async (q) => {
      expect((await q("select id from public.client_notes")).length).toBeGreaterThan(0);
    });
    await expect(as(db, SCHEDULER, addNote(clientA, "No"))).rejects.toThrow(/row-level security/);
  });

  it("support workers read notes on their own clients only, and can't add them", async () => {
    await as(db, ADMIN, addNote(clientB, "About client B"));
    await as(db, WORKER, async (q) => {
      const rows = await q<{ client_id: number }>("select client_id from public.client_notes");
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => Number(r.client_id) === clientA)).toBe(true);
    });
    await expect(as(db, WORKER, addNote(clientA, "No"))).rejects.toThrow(/row-level security/);
  });

  it("can only be edited by their author, who stays the author", async () => {
    const note = await as(db, MANAGER, addNote(clientA, "Original"));
    await as(db, ADMIN, async (q) => {
      const rows = await q("update public.client_notes set body = 'Hijacked' where id = $1 returning id", [note.id]);
      expect(rows.length).toBe(0);
    });
    await as(db, MANAGER, async (q) => {
      const [row] = await q<{ body: string; created_by: string; created_by_name: string }>(
        `update public.client_notes set body = 'Fixed', created_by = $2, created_by_name = 'Alex Morgan'
         where id = $1 returning body, created_by, created_by_name`,
        [note.id, ADMIN],
      );
      expect(row.body).toBe("Fixed");
      expect(row.created_by).toBe(MANAGER);
      expect(row.created_by_name).toBe("Maya Chen");
    });
  });

  it("can be deleted by their author or a superadmin, but no one else", async () => {
    const byAdmin = await as(db, ADMIN, addNote(clientA, "Admin's note"));
    const byManager = await as(db, MANAGER, addNote(clientA, "Manager's note"));
    const another = await as(db, MANAGER, addNote(clientA, "Another note"));
    const del = (id: number) => (q: <R>(sql: string, params?: unknown[]) => Promise<R[]>) =>
      q("delete from public.client_notes where id = $1 returning id", [id]);

    expect((await as(db, MANAGER, del(byAdmin.id))).length).toBe(0);
    expect((await as(db, SCHEDULER, del(byManager.id))).length).toBe(0);
    expect((await as(db, WORKER, del(byManager.id))).length).toBe(0);
    expect((await as(db, MANAGER, del(byManager.id))).length).toBe(1);
    expect((await as(db, ADMIN, del(another.id))).length).toBe(1);
  });

  it("need some text", async () => {
    await expect(as(db, MANAGER, addNote(clientA, "   "))).rejects.toThrow(/check constraint/);
  });

  it("stay on their client", async () => {
    const note = await as(db, MANAGER, addNote(clientA, "Stays put"));
    await expect(
      as(db, MANAGER, (q) =>
        q("update public.client_notes set client_id = $1 where id = $2", [clientB, note.id]),
      ),
    ).rejects.toThrow(/cannot move/);
  });

  it("keep workspaces separate", async () => {
    await as(db, OUTSIDER, async (q) => {
      expect((await q("select id from public.client_notes")).length).toBe(0);
    });
    await expect(as(db, OUTSIDER, addNote(clientA, "No"))).rejects.toThrow(/row-level security/);
    // A client from another workspace can't be attached, even by a superadmin.
    await expect(as(db, ADMIN, addNote(secretClient, "No"))).rejects.toThrow(/not in this workspace/);
  });

  it("give anonymous visitors nothing", async () => {
    await expect(as(db, null, (q) => q("select id from public.client_notes"))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("client contacts", () => {
  const addContact = (client: number, name: string) => async (
    q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>,
  ) => {
    const [row] = await q<{ id: number }>(
      `insert into public.client_contacts (workspace_id, client_id, name, contact_type, phone)
       values ($1, $2, $3, 'Family', '0400 000 000') returning id`,
      [ws, client, name],
    );
    return row;
  };

  it("managers can add, edit and remove them", async () => {
    const contact = await as(db, MANAGER, addContact(clientA, "Helen Doyle"));
    await as(db, MANAGER, async (q) => {
      const edited = await q(
        "update public.client_contacts set relationship = 'Daughter' where id = $1 returning id",
        [contact.id],
      );
      expect(edited.length).toBe(1);
    });
    const temp = await as(db, MANAGER, addContact(clientA, "Temporary"));
    await as(db, MANAGER, async (q) => {
      expect(
        (await q("delete from public.client_contacts where id = $1 returning id", [temp.id])).length,
      ).toBe(1);
    });
  });

  it("schedulers read them but can't change them", async () => {
    await as(db, SCHEDULER, async (q) => {
      expect((await q("select id from public.client_contacts")).length).toBeGreaterThan(0);
      expect((await q("update public.client_contacts set phone = 'x' returning id")).length).toBe(0);
      expect((await q("delete from public.client_contacts returning id")).length).toBe(0);
    });
    await expect(as(db, SCHEDULER, addContact(clientA, "No"))).rejects.toThrow(/row-level security/);
  });

  it("support workers read them on their own clients only, and can't change them", async () => {
    await as(db, ADMIN, addContact(clientB, "Client B's contact"));
    await as(db, WORKER, async (q) => {
      const rows = await q<{ client_id: number }>("select client_id from public.client_contacts");
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => Number(r.client_id) === clientA)).toBe(true);
      expect((await q("update public.client_contacts set phone = 'x' returning id")).length).toBe(0);
    });
    await expect(as(db, WORKER, addContact(clientA, "No"))).rejects.toThrow(/row-level security/);
  });

  it("must be a known type, with a name", async () => {
    await expect(
      as(db, MANAGER, (q) =>
        q(
          `insert into public.client_contacts (workspace_id, client_id, name, contact_type)
           values ($1, $2, 'X', 'Nemesis')`,
          [ws, clientA],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      as(db, MANAGER, (q) =>
        q(
          `insert into public.client_contacts (workspace_id, client_id, name, contact_type)
           values ($1, $2, '  ', 'Family')`,
          [ws, clientA],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("are hidden from other workspaces and anonymous visitors", async () => {
    await as(db, OUTSIDER, async (q) => {
      expect((await q("select id from public.client_contacts")).length).toBe(0);
    });
    await expect(as(db, null, (q) => q("select id from public.client_contacts"))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("client files", () => {
  const path = (client: number, id: string, workspace = ws) => `${workspace}/${client}/${id}`;

  const addFile = (client: number, id: string, workspace = ws) => async (
    q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>,
  ) => {
    const [row] = await q<{ id: number; created_by_name: string }>(
      `insert into public.client_files (workspace_id, client_id, name, storage_path, size_bytes, mime_type)
       values ($1, $2, 'care plan.pdf', $3, 1024, 'application/pdf') returning id, created_by_name`,
      [workspace, client, path(client, id, workspace)],
    );
    return row;
  };

  const upload = (name: string) => (
    q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>,
  ) => q("insert into storage.objects (bucket_id, name) values ('client-files', $1) returning name", [name]);

  const visible = (name: string) => (
    q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>,
  ) => q("select name from storage.objects where bucket_id = 'client-files' and name = $1", [name]);

  it("the bucket is private, size-limited and refuses web pages", async () => {
    const [bucket] = await asAdmin<{ public: boolean; file_size_limit: string; allowed_mime_types: string[] }>(
      db,
      "select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'client-files'",
    );
    expect(bucket.public).toBe(false);
    expect(Number(bucket.file_size_limit)).toBe(25 * 1024 * 1024);
    expect(bucket.allowed_mime_types).toContain("application/pdf");
    expect(bucket.allowed_mime_types).not.toContain("text/html");
    expect(bucket.allowed_mime_types).not.toContain("image/svg+xml");
  });

  it("managers can upload and record them; schedulers and workers can't", async () => {
    const row = await as(db, MANAGER, addFile(clientA, "file-1"));
    expect(row.created_by_name).toBe("Maya Chen");
    await as(db, MANAGER, upload(path(clientA, "file-1")));
    await expect(as(db, SCHEDULER, addFile(clientA, "no-1"))).rejects.toThrow(/row-level security/);
    await expect(as(db, WORKER, addFile(clientA, "no-2"))).rejects.toThrow(/row-level security/);
    await expect(as(db, SCHEDULER, upload(path(clientA, "no-3")))).rejects.toThrow(/row-level security/);
    await expect(as(db, WORKER, upload(path(clientA, "no-4")))).rejects.toThrow(/row-level security/);
  });

  it("schedulers can open files but not delete them", async () => {
    await as(db, MANAGER, upload(path(clientB, "file-b")));
    await as(db, SCHEDULER, async (q) => {
      expect((await visible(path(clientB, "file-b"))(q)).length).toBe(1);
      expect((await q("select id from public.client_files")).length).toBeGreaterThan(0);
      expect((await q("delete from public.client_files returning id")).length).toBe(0);
      expect(
        (await q("delete from storage.objects where name = $1 returning name", [path(clientB, "file-b")])).length,
      ).toBe(0);
    });
  });

  const setShared = (id: string, shared: boolean) => (
    q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>,
  ) =>
    q("update public.client_files set shared_with_team = $1 where storage_path = $2 returning id", [shared, id]);

  describe("sharing with support workers", () => {
    it("new files start private, even on the worker's own client", async () => {
      await as(db, WORKER, async (q) => {
        expect((await q("select id from public.client_files where storage_path = $1", [path(clientA, "file-1")])).length).toBe(0);
        expect((await visible(path(clientA, "file-1"))(q)).length).toBe(0);
      });
    });

    it("managers and schedulers see private files regardless", async () => {
      for (const user of [ADMIN, MANAGER, SCHEDULER]) {
        await as(db, user, async (q) => {
          expect((await q("select id from public.client_files where storage_path = $1", [path(clientA, "file-1")])).length).toBe(1);
          expect((await visible(path(clientA, "file-1"))(q)).length).toBe(1);
        });
      }
    });

    it("sharing opens both the record and the stored file; unsharing closes them", async () => {
      expect((await as(db, MANAGER, setShared(path(clientA, "file-1"), true))).length).toBe(1);
      await as(db, WORKER, async (q) => {
        expect((await q("select id from public.client_files where storage_path = $1", [path(clientA, "file-1")])).length).toBe(1);
        expect((await visible(path(clientA, "file-1"))(q)).length).toBe(1);
      });
      await as(db, MANAGER, setShared(path(clientA, "file-1"), false));
      await as(db, WORKER, async (q) => {
        expect((await q("select id from public.client_files where storage_path = $1", [path(clientA, "file-1")])).length).toBe(0);
        expect((await visible(path(clientA, "file-1"))(q)).length).toBe(0);
      });
    });

    it("a shared file stays hidden from workers who aren't on that client's team", async () => {
      await as(db, MANAGER, addFile(clientB, "shared-b"));
      await as(db, MANAGER, upload(path(clientB, "shared-b")));
      await as(db, MANAGER, setShared(path(clientB, "shared-b"), true));
      await as(db, WORKER, async (q) => {
        expect((await q("select id from public.client_files where storage_path = $1", [path(clientB, "shared-b")])).length).toBe(0);
        expect((await visible(path(clientB, "shared-b"))(q)).length).toBe(0);
      });
    });

    it("a stored file with no record is hidden from workers", async () => {
      await as(db, MANAGER, upload(path(clientA, "mid-upload")));
      await as(db, WORKER, async (q) => {
        expect((await visible(path(clientA, "mid-upload"))(q)).length).toBe(0);
      });
    });

    it("a file can't borrow another file's sharing by pointing at it", async () => {
      // A shared row in client A's folder must not open the same-named path elsewhere.
      await as(db, MANAGER, addFile(clientA, "shared-a"));
      await as(db, MANAGER, setShared(path(clientA, "shared-a"), true));
      await as(db, MANAGER, upload(path(clientB, "shared-a")));
      await as(db, WORKER, async (q) => {
        expect((await visible(path(clientB, "shared-a"))(q)).length).toBe(0);
      });
    });

    it("workers lose shared files when marked do-not-send", async () => {
      await as(db, MANAGER, setShared(path(clientA, "file-1"), true));
      await as(db, ADMIN, (q) =>
        q("update public.client_team set kind = 'do_not_send' where client_id = $1 and staff_id = $2", [
          clientA,
          workerStaffId,
        ]),
      );
      await as(db, WORKER, async (q) => {
        expect((await visible(path(clientA, "file-1"))(q)).length).toBe(0);
      });
      await as(db, ADMIN, (q) =>
        q("update public.client_team set kind = 'team' where client_id = $1 and staff_id = $2", [
          clientA,
          workerStaffId,
        ]),
      );
      await as(db, MANAGER, setShared(path(clientA, "file-1"), false));
    });

    it("only people with full access can change sharing", async () => {
      expect((await as(db, SCHEDULER, setShared(path(clientA, "file-1"), true))).length).toBe(0);
      expect((await as(db, WORKER, setShared(path(clientA, "file-1"), true))).length).toBe(0);
      expect((await as(db, OUTSIDER, setShared(path(clientA, "file-1"), true))).length).toBe(0);
      await as(db, ADMIN, async (q) => {
        const [row] = await q<{ shared_with_team: boolean }>(
          "select shared_with_team from public.client_files where storage_path = $1",
          [path(clientA, "file-1")],
        );
        expect(row.shared_with_team).toBe(false);
      });
    });

    it("sharing can't be set while changing anything else about the file", async () => {
      await expect(
        as(db, MANAGER, (q) =>
          q("update public.client_files set shared_with_team = true, storage_path = 'x' where storage_path = $1", [
            path(clientA, "file-1"),
          ]),
        ),
      ).rejects.toThrow(/permission denied/);
    });

    it("a private file's name never reaches a worker through the history", async () => {
      const SECRET_NAME = "Private psychologist report.pdf";
      const id = "secret-report";
      await as(db, MANAGER, async (q) => {
        await q(
          `insert into public.client_files (workspace_id, client_id, name, storage_path, size_bytes, mime_type)
           values ($1, $2, $3, $4, 1024, 'application/pdf')`,
          [ws, clientA, SECRET_NAME, path(clientA, id)],
        );
      });
      const fileRows = (rows: { table_name: string; label: string | null }[]) =>
        rows.filter((r) => r.table_name === "client_files" && r.label === SECRET_NAME);

      await as(db, SCHEDULER, async (q) => {
        expect(fileRows(await activity(clientA)(q)).length).toBe(1);
      });
      await as(db, WORKER, async (q) => {
        const rows = await activity(clientA)(q);
        expect(JSON.stringify(rows)).not.toContain(SECRET_NAME);
      });

      await as(db, MANAGER, setShared(path(clientA, id), true));
      await as(db, WORKER, async (q) => {
        const rows = fileRows(await activity(clientA)(q));
        expect(rows.map((r) => r.table_name)).toContain("client_files");
      });
      await as(db, MANAGER, async (q) => {
        const [update] = (await activity(clientA)(q)).filter(
          (r) => r.table_name === "client_files" && r.action === "UPDATE" && r.label === SECRET_NAME,
        );
        expect(update.changed_fields).toEqual(["shared_with_team"]);
      });

      // Unsharing hides it again, and so does deleting it.
      await as(db, MANAGER, setShared(path(clientA, id), false));
      await as(db, WORKER, async (q) => {
        expect(JSON.stringify(await activity(clientA)(q))).not.toContain(SECRET_NAME);
      });
      await as(db, MANAGER, (q) => q("delete from public.client_files where storage_path = $1", [path(clientA, id)]));
      await as(db, WORKER, async (q) => {
        expect(JSON.stringify(await activity(clientA)(q))).not.toContain(SECRET_NAME);
      });
      await as(db, MANAGER, async (q) => {
        const rows = (await activity(clientA)(q)).filter((r) => r.action === "DELETE" && r.label === SECRET_NAME);
        expect(rows.length).toBe(1);
      });
    });
  });

  it("can be deleted with full access", async () => {
    const row = await as(db, MANAGER, addFile(clientA, "to-delete"));
    await as(db, MANAGER, upload(path(clientA, "to-delete")));
    await as(db, MANAGER, async (q) => {
      expect((await q("delete from public.client_files where id = $1 returning id", [row.id])).length).toBe(1);
      expect(
        (await q("delete from storage.objects where name = $1 returning name", [path(clientA, "to-delete")])).length,
      ).toBe(1);
    });
  });

  it("can't be edited after upload", async () => {
    await expect(
      as(db, ADMIN, (q) => q("update public.client_files set name = 'renamed.pdf'")),
    ).rejects.toThrow(/permission denied/);
  });

  it("keep workspaces separate", async () => {
    await as(db, OUTSIDER, async (q) => {
      expect((await visible(path(clientA, "file-1"))(q)).length).toBe(0);
      expect((await q("select id from public.client_files")).length).toBe(0);
    });
    await expect(as(db, OUTSIDER, upload(path(clientA, "no-5")))).rejects.toThrow(/row-level security/);
    await expect(as(db, MANAGER, upload(path(secretClient, "no-6", otherWs)))).rejects.toThrow(
      /row-level security/,
    );
  });

  it("must point at their own client's folder", async () => {
    await expect(
      as(db, MANAGER, (q) =>
        q(
          `insert into public.client_files (workspace_id, client_id, name, storage_path, size_bytes, mime_type)
           values ($1, $2, 'x.pdf', $3, 1, 'application/pdf')`,
          [ws, clientA, path(clientB, "someone-elses")],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("refuse oddly shaped paths without an error leaking through", async () => {
    for (const bad of ["not-a-uuid/1/x", `${ws}/abc/x`, `${ws}/1`, `${ws}/1/a/b`, "../../etc/passwd", ""]) {
      await expect(as(db, MANAGER, upload(bad))).rejects.toThrow(/row-level security/);
    }
  });

  it("the rules only open this bucket", async () => {
    await asAdmin(db, "insert into storage.buckets (id, name) values ('other', 'other')");
    await asAdmin(db, "insert into storage.objects (bucket_id, name) values ('other', $1)", [
      path(clientA, "elsewhere"),
    ]);
    await as(db, ADMIN, async (q) => {
      expect((await q("select name from storage.objects where bucket_id = 'other'")).length).toBe(0);
    });
    await expect(
      as(db, ADMIN, (q) =>
        q("insert into storage.objects (bucket_id, name) values ('other', $1)", [path(clientA, "other-2")]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("give anonymous visitors nothing", async () => {
    await expect(as(db, null, (q) => q("select id from public.client_files"))).rejects.toThrow(
      /permission denied/,
    );
    await as(db, null, async (q) => {
      expect((await visible(path(clientA, "file-1"))(q)).length).toBe(0);
    });
    await expect(as(db, null, upload(path(clientA, "no-7")))).rejects.toThrow(/row-level security/);
  });
});

describe("activity history", () => {
  const SECRET_PHONE = "0499 SECRET";
  const SECRET_NOTE = "Confidential note text";
  const SECRET_BSB = "999-SECRET";

  let contactId: number;

  beforeAll(async () => {
    await as(db, MANAGER, async (q) => {
      await q("update public.clients set phone = $1 where id = $2", [SECRET_PHONE, clientA]);
      await addNote(clientA, SECRET_NOTE)(q);
      const [c] = await q<{ id: number }>(
        `insert into public.client_contacts (workspace_id, client_id, name, contact_type)
         values ($1, $2, 'Nadia Khan', 'Family') returning id`,
        [ws, clientA],
      );
      contactId = Number(c.id);
      await q("update public.client_contacts set phone = '0400' where id = $1", [contactId]);
    });
    await as(db, ADMIN, (q) =>
      q(
        `insert into public.client_financials (client_id, workspace_id, bsb) values ($1, $2, $3)
         on conflict (client_id) do update set bsb = excluded.bsb`,
        [clientA, ws, SECRET_BSB],
      ),
    );
  });

  it("says who did what, newest first", async () => {
    await as(db, ADMIN, async (q) => {
      const rows = await activity(clientA)(q);
      const phone = rows.find((r) => r.table_name === "clients" && r.changed_fields.includes("phone"));
      expect(phone?.actor_name).toBe("Maya Chen");
      expect(rows.some((r) => r.table_name === "clients" && r.action === "INSERT")).toBe(true);
      expect(rows.some((r) => r.table_name === "client_notes" && r.action === "INSERT")).toBe(true);
      const ids = rows.map((r) => Number(r.id));
      expect(ids).toEqual([...ids].sort((a, b) => b - a));
    });
  });

  it("names the contact, even when it's updated", async () => {
    await as(db, ADMIN, async (q) => {
      const rows = await activity(clientA)(q);
      const updated = rows.find((r) => r.table_name === "client_contacts" && r.action === "UPDATE" && r.label === "Nadia Khan");
      expect(updated?.changed_fields).toContain("phone");
    });
  });

  it("never returns the values that changed", async () => {
    for (const user of [ADMIN, MANAGER, SCHEDULER, WORKER]) {
      await as(db, user, async (q) => {
        const text = JSON.stringify(await activity(clientA)(q));
        expect(text).not.toContain(SECRET_PHONE);
        expect(text).not.toContain(SECRET_NOTE);
        expect(text).not.toContain(SECRET_BSB);
      });
    }
  });

  it("only shows bank detail changes to people with Finance access", async () => {
    const hasFinancials = (rows: ActivityRow[]) => rows.some((r) => r.table_name === "client_financials");
    await as(db, ADMIN, async (q) => expect(hasFinancials(await activity(clientA)(q))).toBe(true));
    await as(db, MANAGER, async (q) => expect(hasFinancials(await activity(clientA)(q))).toBe(true));
    await as(db, SCHEDULER, async (q) => expect(hasFinancials(await activity(clientA)(q))).toBe(false));
    await as(db, WORKER, async (q) => expect(hasFinancials(await activity(clientA)(q))).toBe(false));
  });

  it("follows who can see the client", async () => {
    await as(db, SCHEDULER, async (q) => expect((await activity(clientB)(q)).length).toBeGreaterThan(0));
    await as(db, WORKER, async (q) => {
      expect((await activity(clientA)(q)).length).toBeGreaterThan(0);
      expect((await activity(clientB)(q)).length).toBe(0);
    });
    await as(db, OUTSIDER, async (q) => expect((await activity(clientA)(q)).length).toBe(0));
    await as(db, ADMIN, async (q) => expect((await activity(secretClient)(q)).length).toBe(0));
    await expect(as(db, null, activity(clientA))).rejects.toThrow(/permission denied/);
  });

  it("leaves the audit log itself superadmin-only, and keeps deleted rows there", async () => {
    await as(db, MANAGER, async (q) => {
      expect((await q("select id from public.audit_log")).length).toBe(0);
    });
    await as(db, MANAGER, async (q) => {
      await q("delete from public.client_contacts where id = $1", [contactId]);
    });
    await as(db, ADMIN, async (q) => {
      const [row] = await q<{ changes: { name: string } }>(
        `select changes from public.audit_log
         where table_name = 'client_contacts' and action = 'DELETE' and record_id = $1`,
        [String(contactId)],
      );
      expect(row.changes.name).toBe("Nadia Khan");
      const rows = await activity(clientA)(q);
      expect(rows.some((r) => r.action === "DELETE" && r.label === "Nadia Khan")).toBe(true);
    });
  });
});

describe("editing clients", () => {
  it("managers can edit a client whose care manager they can't see", async () => {
    await as(db, ADMIN, async (q) => {
      // Someone other than the manager: everyone can always see their own record.
      await q("update public.clients set care_manager_id = $1 where id = $2", [schedulerStaffId, clientB]);
      await q(
        `update public.role_permissions set level = 'none'
         where workspace_id = $1 and role = 'service_manager' and area = 'staff'`,
        [ws],
      );
    });
    await as(db, MANAGER, async (q) => {
      const rows = await q("update public.clients set phone = '0411' where id = $1 returning id", [clientB]);
      expect(rows.length).toBe(1);
    });
    await as(db, ADMIN, (q) =>
      q(
        `update public.role_permissions set level = 'full'
         where workspace_id = $1 and role = 'service_manager' and area = 'staff'`,
        [ws],
      ),
    );
  });

  it("schedulers and support workers can't change a care manager", async () => {
    for (const user of [SCHEDULER, WORKER]) {
      await as(db, user, async (q) => {
        const rows = await q("update public.clients set care_manager_id = null where id = $1 returning id", [clientA]);
        expect(rows.length).toBe(0);
      });
    }
  });

  it("a care manager must be from this workspace", async () => {
    await expect(
      as(db, MANAGER, (q) =>
        q("update public.clients set care_manager_id = $1 where id = $2", [outsiderStaffId, clientA]),
      ),
    ).rejects.toThrow(/not in this workspace/);
  });

  it("preferred staff can see the client; do-not-send staff can't", async () => {
    await as(db, MANAGER, (q) =>
      q(
        `insert into public.client_team (client_id, staff_id, workspace_id, kind)
         values ($1, $2, $3, 'preferred')`,
        [clientB, workerStaffId, ws],
      ),
    );
    await as(db, WORKER, async (q) => {
      expect((await q("select id from public.clients where id = $1", [clientB])).length).toBe(1);
    });
    await as(db, MANAGER, (q) =>
      q("update public.client_team set kind = 'do_not_send' where client_id = $1 and staff_id = $2", [
        clientB,
        workerStaffId,
      ]),
    );
    await as(db, WORKER, async (q) => {
      expect((await q("select id from public.clients where id = $1", [clientB])).length).toBe(0);
    });
    await as(db, MANAGER, (q) =>
      q("delete from public.client_team where client_id = $1 and staff_id = $2", [clientB, workerStaffId]),
    );
  });

  it("only finance roles with full access can change bank details", async () => {
    const edit = (q: <R>(sql: string, params?: unknown[]) => Promise<R[]>) =>
      q("update public.client_financials set bank_name = 'Changed' where client_id = $1 returning client_id", [clientA]);
    expect((await as(db, MANAGER, edit)).length).toBe(0); // finance: read
    expect((await as(db, SCHEDULER, edit)).length).toBe(0); // finance: none
    expect((await as(db, ADMIN, edit)).length).toBe(1);
  });
});

describe("the service role (seed script)", () => {
  it("can reach the tables the seed needs, with triggers still running", async () => {
    await asServiceRole(db, async (q) => {
      expect((await q("select id from public.workspaces")).length).toBeGreaterThan(0);
      expect((await q("select id from public.staff where workspace_id = $1", [ws])).length).toBeGreaterThan(0);
      const rows = await q(
        "update public.clients set reference = 'REF' where id = $1 returning id",
        [clientA],
      );
      expect(rows.length).toBe(1);
      const [note] = await q<{ created_by_name: string }>(
        `insert into public.client_notes (workspace_id, client_id, body, created_by_name)
         values ($1, $2, 'Seeded', 'Seed') returning created_by_name`,
        [ws, clientA],
      );
      expect(note.created_by_name).toBe("Seed");
    });
  });

  it("can read but not rewrite the audit log", async () => {
    await asServiceRole(db, async (q) => {
      expect((await q("select id from public.audit_log")).length).toBeGreaterThan(0);
    });
    await expect(asServiceRole(db, (q) => q("delete from public.audit_log"))).rejects.toThrow(
      /permission denied/,
    );
  });
});
