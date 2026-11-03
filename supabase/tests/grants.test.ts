/**
 * What each API role is allowed to do at the table level, before row level
 * security. These rules check every table, so new tables are covered too.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { addUser, as, asAdmin, createTestDb, type Db } from "./test-db";

const ADMIN = "00000000-0000-0000-0000-00000000000a";

let db: Db;
let ws: string;

const EXPECTED: Record<string, string> = {
  audit_log: "SELECT",
  client_contacts: "DELETE,INSERT,SELECT,UPDATE",
  client_files: "DELETE,INSERT,SELECT",
  client_financials: "INSERT,SELECT,UPDATE",
  client_notes: "DELETE,INSERT,SELECT,UPDATE",
  client_team: "DELETE,INSERT,SELECT,UPDATE",
  clients: "DELETE,INSERT,SELECT,UPDATE",
  role_permissions: "DELETE,INSERT,SELECT,UPDATE",
  saved_views: "DELETE,INSERT,SELECT,UPDATE",
  sites: "INSERT,SELECT,UPDATE",
  staff: "INSERT,SELECT,UPDATE",
  workspaces: "INSERT,SELECT,UPDATE",
};

const tablesIn = async () =>
  (
    await asAdmin<{ table_name: string }>(
      db,
      "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'",
    )
  ).map((r) => r.table_name);

const grants = async (role: string) => {
  const rows = await asAdmin<{ table_name: string; privileges: string }>(
    db,
    `select table_name, string_agg(privilege_type, ',' order by privilege_type) as privileges
     from information_schema.role_table_grants
     where table_schema = 'public' and grantee = $1
     group by table_name`,
    [role],
  );
  return Object.fromEntries(rows.map((r) => [r.table_name, r.privileges]));
};

beforeAll(async () => {
  db = await createTestDb();
  await addUser(db, ADMIN, "admin@example.com");
  ws = await as(db, ADMIN, async (q) => {
    const [row] = await q<{ create_workspace: string }>(
      "select public.create_workspace('Demo Provider', 'Alex Morgan')",
    );
    return row.create_workspace;
  });
});

describe("table permissions", () => {
  it("signed-in users have exactly what's intended, on every table", async () => {
    expect(await grants("authenticated")).toEqual(EXPECTED);
  });

  it("every table is accounted for in this test", async () => {
    expect((await tablesIn()).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it("signed-out visitors have nothing on any table", async () => {
    expect(await grants("anon")).toEqual({});
  });

  it("every table has row level security on", async () => {
    const rows = await asAdmin<{ relname: string }>(
      db,
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(rows).toEqual([]);
  });

  it("nobody can wipe a table, whatever row level security says", async () => {
    await expect(as(db, ADMIN, (q) => q("truncate public.clients cascade"))).rejects.toThrow(/permission denied/);
    await expect(as(db, ADMIN, (q) => q("truncate public.audit_log"))).rejects.toThrow(/permission denied/);
  });

  it("the audit log can't be rewritten, even by the service role", async () => {
    expect((await grants("service_role")).audit_log).toBe("SELECT");
  });

  it("a file's details can't be changed after upload, only its sharing", async () => {
    const [{ count }] = await asAdmin<{ count: string }>(
      db,
      `select count(*) from information_schema.column_privileges
       where table_schema = 'public' and table_name = 'client_files' and grantee = 'authenticated'
         and privilege_type = 'UPDATE' and column_name <> 'shared_with_team'`,
    );
    expect(Number(count)).toBe(0);
    const [client] = await as(db, ADMIN, (q) =>
      q<{ id: number }>(
        "insert into public.clients (workspace_id, name, funding_type) values ($1, 'Client', 'NDIS') returning id",
        [ws],
      ),
    );
    const path = `${ws}/${client.id}/file`;
    await as(db, ADMIN, (q) =>
      q(
        `insert into public.client_files (workspace_id, client_id, name, storage_path, size_bytes, mime_type)
         values ($1, $2, 'plan.pdf', $3, 1, 'application/pdf')`,
        [ws, client.id, path],
      ),
    );
    for (const change of ["name = 'renamed.pdf'", `storage_path = '${path}-2'`, "size_bytes = 2", "created_by_name = 'Someone'"]) {
      await expect(
        as(db, ADMIN, (q) => q(`update public.client_files set ${change} where storage_path = $1`, [path])),
      ).rejects.toThrow(/permission denied/);
    }
    await as(db, ADMIN, async (q) => {
      expect(
        (await q("update public.client_files set shared_with_team = true where storage_path = $1 returning id", [path])).length,
      ).toBe(1);
    });
  });

  it("tables added later start closed to signed-in and signed-out users", async () => {
    await asAdmin(db, "create table public.zz_future_table (id int primary key)");
    await expect(as(db, ADMIN, (q) => q("select id from public.zz_future_table"))).rejects.toThrow(/permission denied/);
    await expect(as(db, null, (q) => q("select id from public.zz_future_table"))).rejects.toThrow(/permission denied/);
    await asAdmin(db, "drop table public.zz_future_table");
  });
});

describe("function permissions", () => {
  it("signed-out visitors can't run anything in the API", async () => {
    const rows = await asAdmin<{ proname: string }>(
      db,
      `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')`,
    );
    expect(rows).toEqual([]);
  });

  it("signed-out visitors can't reach the private helpers", async () => {
    const rows = await asAdmin<{ proname: string }>(
      db,
      `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'private' and has_function_privilege('anon', p.oid, 'execute')`,
    );
    expect(rows).toEqual([]);
    const [{ usage }] = await asAdmin<{ usage: boolean }>(
      db,
      "select has_schema_privilege('anon', 'private', 'usage') as usage",
    );
    expect(usage).toBe(false);
  });
});
