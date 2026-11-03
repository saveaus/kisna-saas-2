/**
 * Access rules per role. Each test signs in as a user and checks what the
 * database lets them see and change, the same way a request through the
 * Supabase API would be checked.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { addUser, as, asAdmin, createTestDb, type Db } from "./test-db";

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const MANAGER = "00000000-0000-0000-0000-00000000000b";
const SCHEDULER = "00000000-0000-0000-0000-00000000000c";
const WORKER = "00000000-0000-0000-0000-00000000000d";
const OUTSIDER = "00000000-0000-0000-0000-00000000000e";

let db: Db;
let ws: string;
let otherWs: string;
let workerStaffId: number;
let clientA: number; // worker is on the team
let clientB: number; // worker is not

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

  // Admin signs up and creates the workspace.
  ws = await as(db, ADMIN, async (q) => {
    const [row] = await q<{ create_workspace: string }>(
      "select public.create_workspace('Demo Provider', 'Alex Morgan')",
    );
    return row.create_workspace;
  });

  // Admin adds staff with logins, one per role.
  workerStaffId = await as(db, ADMIN, async (q) => {
    await q(
      `insert into public.staff (workspace_id, user_id, name, role, email) values
        ($1, $2, 'Demo Service Manager', 'service_manager', 'manager@example.com'),
        ($1, $3, 'Demo Scheduler', 'scheduler', 'scheduler@example.com')`,
      [ws, MANAGER, SCHEDULER],
    );
    const [w] = await q<{ id: number }>(
      `insert into public.staff (workspace_id, user_id, name, role, email)
       values ($1, $2, 'Jordan Hale', 'support_worker', 'worker@example.com') returning id`,
      [ws, WORKER],
    );
    return Number(w.id);
  });

  // Admin adds two clients and puts the worker on client A's team.
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
    await q(
      `insert into public.client_financials (client_id, workspace_id, bank_name, bsb)
       values ($1, $2, 'Demo Bank', '000-000')`,
      [a, ws],
    );
    await q(`insert into public.sites (workspace_id, name) values ($1, 'Wattle House')`, [ws]);
    return [a, b];
  });

  // An unrelated workspace the others must never see.
  otherWs = await as(db, OUTSIDER, async (q) => {
    const [row] = await q<{ create_workspace: string }>(
      "select public.create_workspace('Other Provider', 'Sam Other')",
    );
    await q(
      "insert into public.clients (workspace_id, name, funding_type) values ($1, 'Secret Client', 'NDIS')",
      [row.create_workspace],
    );
    return row.create_workspace;
  });
});

const names = (rows: { name: string }[]) => rows.map((r) => r.name).sort();

describe("superadmin", () => {
  it("sees every client, staff member and site in their workspace only", async () => {
    await as(db, ADMIN, async (q) => {
      expect(names(await q("select name from public.clients"))).toEqual(["Client A", "Client B"]);
      expect((await q("select id from public.staff")).length).toBe(4);
      expect((await q("select id from public.sites")).length).toBe(1);
    });
  });

  it("reads the audit log and permission matrix", async () => {
    await as(db, ADMIN, async (q) => {
      expect((await q("select id from public.audit_log")).length).toBeGreaterThan(0);
      expect((await q("select * from public.role_permissions")).length).toBe(42);
    });
  });

  it("can change the permission matrix", async () => {
    await as(db, ADMIN, async (q) => {
      const rows = await q(
        `update public.role_permissions set level = 'read'
         where workspace_id = $1 and role = 'scheduler' and area = 'finance' returning area`,
        [ws],
      );
      expect(rows.length).toBe(1);
      await q(
        `update public.role_permissions set level = 'none'
         where workspace_id = $1 and role = 'scheduler' and area = 'finance'`,
        [ws],
      );
    });
  });

  it("can't remove the last superadmin", async () => {
    await expect(
      as(db, ADMIN, (q) =>
        q("update public.staff set role = 'service_manager' where user_id = $1", [ADMIN]),
      ),
    ).rejects.toThrow(/at least one active superadmin/);
  });
});

describe("service manager", () => {
  it("reads and adds clients", async () => {
    await as(db, MANAGER, async (q) => {
      expect(names(await q("select name from public.clients"))).toEqual(["Client A", "Client B"]);
      const rows = await q(
        `insert into public.clients (workspace_id, name, funding_type)
         values ($1, 'Client C', 'Private') returning id`,
        [ws],
      );
      expect(rows.length).toBe(1);
      await q("update public.clients set status = 'Inactive' where name = 'Client C'");
    });
  });

  it("can't delete clients (superadmin only)", async () => {
    await as(db, MANAGER, async (q) => {
      const rows = await q("delete from public.clients where id = $1 returning id", [clientB]);
      expect(rows.length).toBe(0);
    });
  });

  it("reads but can't edit bank details (finance: read)", async () => {
    await as(db, MANAGER, async (q) => {
      expect((await q("select bank_name from public.client_financials")).length).toBe(1);
      const rows = await q("update public.client_financials set bsb = '111-111' returning bsb");
      expect(rows.length).toBe(0);
    });
  });

  it("can't make anyone a superadmin", async () => {
    await expect(
      as(db, MANAGER, (q) =>
        q("update public.staff set role = 'superadmin' where user_id = $1", [SCHEDULER]),
      ),
    ).rejects.toThrow(/Only a superadmin/);
  });

  it("can't link a login to a staff member", async () => {
    await expect(
      as(db, MANAGER, (q) =>
        q(
          `insert into public.staff (workspace_id, user_id, name, email)
           values ($1, $2, 'Sneaky', 'sneaky@example.com')`,
          [ws, OUTSIDER],
        ),
      ),
    ).rejects.toThrow(/Only a superadmin/);
  });

  it("can't change the permission matrix or read the audit log", async () => {
    await as(db, MANAGER, async (q) => {
      const rows = await q(
        "update public.role_permissions set level = 'full' where workspace_id = $1 returning area",
        [ws],
      );
      expect(rows.length).toBe(0);
      expect((await q("select id from public.audit_log")).length).toBe(0);
    });
  });
});

describe("scheduler", () => {
  it("reads clients and staff but can't add or edit them", async () => {
    await as(db, SCHEDULER, async (q) => {
      expect((await q("select id from public.clients")).length).toBeGreaterThanOrEqual(2);
      expect((await q("select id from public.staff")).length).toBe(4);
      const edited = await q("update public.clients set name = 'Renamed' returning id");
      expect(edited.length).toBe(0);
    });
    await expect(
      as(db, SCHEDULER, (q) =>
        q("insert into public.clients (workspace_id, name, funding_type) values ($1, 'X', 'NDIS')", [ws]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("can't see bank details (finance: none)", async () => {
    await as(db, SCHEDULER, async (q) => {
      expect((await q("select * from public.client_financials")).length).toBe(0);
    });
  });
});

describe("support worker", () => {
  it("sees only clients they're on the team of", async () => {
    await as(db, WORKER, async (q) => {
      expect(names(await q("select name from public.clients"))).toEqual(["Client A"]);
      expect((await q("select id from public.clients where id = $1", [clientB])).length).toBe(0);
    });
  });

  it("sees only their own staff record, and no sites or bank details", async () => {
    await as(db, WORKER, async (q) => {
      expect(names(await q("select name from public.staff"))).toEqual(["Jordan Hale"]);
      expect((await q("select id from public.sites")).length).toBe(0);
      expect((await q("select * from public.client_financials")).length).toBe(0);
    });
  });

  it("can't edit clients or promote themselves", async () => {
    await as(db, WORKER, async (q) => {
      expect((await q("update public.clients set name = 'X' returning id")).length).toBe(0);
      expect(
        (await q("update public.staff set role = 'service_manager' returning id")).length,
      ).toBe(0);
    });
  });

  it("loses access when marked do-not-send", async () => {
    await as(db, ADMIN, (q) =>
      q("update public.client_team set kind = 'do_not_send' where client_id = $1", [clientA]),
    );
    await as(db, WORKER, async (q) => {
      expect((await q("select id from public.clients")).length).toBe(0);
    });
    await as(db, ADMIN, (q) =>
      q("update public.client_team set kind = 'team' where client_id = $1", [clientA]),
    );
  });

  it("loses all access when made inactive", async () => {
    await as(db, ADMIN, (q) =>
      q("update public.staff set status = 'Inactive' where id = $1", [workerStaffId]),
    );
    await as(db, WORKER, async (q) => {
      expect((await q("select id from public.clients")).length).toBe(0);
      expect((await q("select id from public.workspaces")).length).toBe(0);
    });
    await as(db, ADMIN, (q) =>
      q("update public.staff set status = 'Active' where id = $1", [workerStaffId]),
    );
  });
});

describe("other workspaces and anonymous visitors", () => {
  it("keep workspaces fully separate", async () => {
    await as(db, ADMIN, async (q) => {
      expect(names(await q("select name from public.clients"))).not.toContain("Secret Client");
      expect((await q("select id from public.workspaces where id = $1", [otherWs])).length).toBe(0);
    });
    await as(db, OUTSIDER, async (q) => {
      expect(names(await q("select name from public.clients"))).toEqual(["Secret Client"]);
    });
  });

  it("can't add a client to someone else's workspace", async () => {
    await expect(
      as(db, OUTSIDER, (q) =>
        q("insert into public.clients (workspace_id, name, funding_type) values ($1, 'X', 'NDIS')", [ws]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("can't put another workspace's staff on a client team", async () => {
    const [outsiderStaff] = await asAdmin<{ id: number }>(
      db,
      "select id from public.staff where user_id = $1",
      [OUTSIDER],
    );
    await expect(
      as(db, ADMIN, (q) =>
        q("insert into public.client_team (client_id, staff_id, workspace_id) values ($1, $2, $3)", [
          clientB,
          outsiderStaff.id,
          ws,
        ]),
      ),
    ).rejects.toThrow(/not in this workspace/);
  });

  it("give anonymous visitors nothing", async () => {
    await expect(as(db, null, (q) => q("select id from public.clients"))).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      as(db, null, (q) => q("select public.create_workspace('x', 'y')")),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("saved views", () => {
  it("are private to the person who made them", async () => {
    const id = await as(db, MANAGER, async (q) => {
      const [row] = await q<{ id: number }>(
        `insert into public.saved_views (workspace_id, object, name, filters)
         values ($1, 'clients', 'My NDIS', '[{"column":"fundingType","values":["NDIS"]}]') returning id`,
        [ws],
      );
      return row.id;
    });
    await as(db, SCHEDULER, async (q) => {
      expect((await q("select id from public.saved_views")).length).toBe(0);
      expect((await q("delete from public.saved_views where id = $1 returning id", [id])).length).toBe(0);
      expect(
        (await q("update public.saved_views set name = 'Hijacked' where id = $1 returning id", [id])).length,
      ).toBe(0);
    });
    await as(db, MANAGER, async (q) => {
      expect(
        (await q("update public.saved_views set name = 'NDIS clients' where id = $1 returning id", [id])).length,
      ).toBe(1);
      expect((await q("delete from public.saved_views where id = $1 returning id", [id])).length).toBe(1);
    });
  });

  it("can't be created for someone else or another workspace", async () => {
    await expect(
      as(db, MANAGER, (q) =>
        q(
          `insert into public.saved_views (workspace_id, user_id, object, name)
           values ($1, $2, 'clients', 'Sneaky')`,
          [ws, SCHEDULER],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(db, MANAGER, (q) =>
        q("insert into public.saved_views (workspace_id, object, name) values ($1, 'clients', 'X')", [otherWs]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("need a name", async () => {
    await expect(
      as(db, MANAGER, (q) =>
        q("insert into public.saved_views (workspace_id, object, name) values ($1, 'clients', '  ')", [ws]),
      ),
    ).rejects.toThrow(/check constraint/);
  });
});

describe("audit log", () => {
  it("records changes and can't be edited, even by a superadmin", async () => {
    await as(db, ADMIN, async (q) => {
      const rows = await q<{ action: string }>(
        "select action from public.audit_log where table_name = 'clients' and record_id = $1",
        [String(clientA)],
      );
      expect(rows.map((r) => r.action)).toContain("INSERT");
    });
    await expect(
      as(db, ADMIN, (q) => q("delete from public.audit_log")),
    ).rejects.toThrow(/permission denied/);
  });
});
