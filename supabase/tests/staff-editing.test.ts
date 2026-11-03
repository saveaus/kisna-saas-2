/** Who can change whose staff record, per role. */
import { beforeAll, describe, expect, it } from "vitest";
import { addUser, as, createTestDb, type Db } from "./test-db";

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const ADMIN_2 = "00000000-0000-0000-0000-00000000000f";
const MANAGER = "00000000-0000-0000-0000-00000000000b";
const SCHEDULER = "00000000-0000-0000-0000-00000000000c";
const WORKER = "00000000-0000-0000-0000-00000000000d";
const OUTSIDER = "00000000-0000-0000-0000-00000000000e";

let db: Db;
let ws: string;

const edit = (user: string, change: string, target: string, params: unknown[] = []) =>
  as(db, user, (q) =>
    q(`update public.staff set ${change} where user_id = $1 returning id`, [target, ...params]),
  );

beforeAll(async () => {
  db = await createTestDb();
  for (const [id, email] of [
    [ADMIN, "admin@example.com"],
    [ADMIN_2, "admin2@example.com"],
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
  await as(db, ADMIN, (q) =>
    q(
      `insert into public.staff (workspace_id, user_id, name, role, email) values
        ($1, $2, 'Maya Chen', 'service_manager', 'manager@example.com'),
        ($1, $3, 'Sam Okonkwo', 'scheduler', 'scheduler@example.com'),
        ($1, $4, 'Jordan Hale', 'support_worker', 'worker@example.com')`,
      [ws, MANAGER, SCHEDULER, WORKER],
    ),
  );
  await as(db, OUTSIDER, (q) => q("select public.create_workspace('Other Provider', 'Sam Other')"));
});

describe("editing staff records", () => {
  it("superadmins can edit anyone", async () => {
    expect((await edit(ADMIN, "phone = '0411'", WORKER)).length).toBe(1);
    expect((await edit(ADMIN, "phone = '0412'", MANAGER)).length).toBe(1);
    expect((await edit(ADMIN, "phone = '0413'", ADMIN)).length).toBe(1);
  });

  it("managers can edit other staff, including their role", async () => {
    expect((await edit(MANAGER, "phone = '0414'", WORKER)).length).toBe(1);
    expect((await edit(MANAGER, "role = 'scheduler'", WORKER)).length).toBe(1);
    expect((await edit(MANAGER, "role = 'support_worker'", WORKER)).length).toBe(1);
  });

  it("managers can't change a superadmin's record", async () => {
    await expect(edit(MANAGER, "phone = '0415'", ADMIN)).rejects.toThrow(/Only a superadmin can change/);
    await expect(edit(MANAGER, "name = 'Renamed'", ADMIN)).rejects.toThrow(/Only a superadmin can change/);
    await expect(edit(MANAGER, "status = 'Inactive'", ADMIN)).rejects.toThrow(/Only a superadmin can change/);
    await expect(edit(MANAGER, "role = 'scheduler'", ADMIN)).rejects.toThrow(/Only a superadmin can change/);
  });

  it("managers can't make anyone a superadmin", async () => {
    await expect(edit(MANAGER, "role = 'superadmin'", WORKER)).rejects.toThrow(/Only a superadmin can grant/);
    await expect(edit(MANAGER, "role = 'superadmin'", MANAGER)).rejects.toThrow(/Only a superadmin can grant/);
  });

  it("schedulers and support workers can't edit anyone, including themselves", async () => {
    for (const target of [WORKER, SCHEDULER, ADMIN]) {
      expect((await edit(SCHEDULER, "phone = '1'", target)).length).toBe(0);
      expect((await edit(WORKER, "phone = '1'", target)).length).toBe(0);
    }
  });

  it("other workspaces can't edit anyone here", async () => {
    expect((await edit(OUTSIDER, "phone = '1'", WORKER)).length).toBe(0);
    expect((await edit(OUTSIDER, "phone = '1'", ADMIN)).length).toBe(0);
  });

  it("two people can't share an email in a workspace", async () => {
    await expect(edit(ADMIN, "email = 'manager@example.com'", WORKER)).rejects.toThrow(/unique|duplicate/);
  });

  it("the last active superadmin stays protected, and a second one can be deactivated", async () => {
    await expect(edit(ADMIN, "status = 'Inactive'", ADMIN)).rejects.toThrow(/at least one active superadmin/);
    await as(db, ADMIN, (q) =>
      q(
        `insert into public.staff (workspace_id, user_id, name, role, email)
         values ($1, $2, 'Second Admin', 'superadmin', 'admin2@example.com')`,
        [ws, ADMIN_2],
      ),
    );
    expect((await edit(ADMIN, "status = 'Inactive'", ADMIN_2)).length).toBe(1);
    await expect(edit(ADMIN, "status = 'Inactive'", ADMIN)).rejects.toThrow(/at least one active superadmin/);
  });

  it("changes are written to the audit log", async () => {
    await edit(ADMIN, "phone = '0499'", WORKER);
    await as(db, ADMIN, async (q) => {
      const rows = await q<{ changes: { phone?: string } }>(
        "select changes from public.audit_log where table_name = 'staff' and action = 'UPDATE' order by id desc limit 1",
      );
      expect(rows[0].changes.phone).toBe("0499");
    });
  });
});
