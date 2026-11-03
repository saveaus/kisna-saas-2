/**
 * Test harness: runs our Supabase migrations in an in-memory Postgres
 * (PGlite) with a stand-in for Supabase's auth schema and roles, so access
 * rules can be tested without Docker or a real project.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const AUTH_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
`;

export async function createTestDb() {
  const db = new PGlite();
  await db.exec(AUTH_STUB);
  const dir = join(__dirname, "..", "migrations");
  for (const file of readdirSync(dir).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }
  return db;
}

export type Db = Awaited<ReturnType<typeof createTestDb>>;

/** Add a login (as the platform would on sign-up). */
export async function addUser(db: Db, id: string, email: string) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
}

/**
 * Run queries as a signed-in user (role authenticated, RLS on), like a
 * request through the Supabase API. Pass null for an anonymous visitor.
 */
export async function as<T>(
  db: Db,
  userId: string | null,
  fn: (q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`set local role ${userId ? "authenticated" : "anon"}`);
    await tx.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(userId ? { sub: userId, role: "authenticated" } : { role: "anon" }),
    ]);
    return fn(async <R,>(sql: string, params?: unknown[]) => {
      const res = await tx.query<R>(sql, params);
      return res.rows;
    });
  });
}

/** Run as the service role / database owner (bypasses RLS), e.g. for seeding. */
export async function asAdmin<R = Record<string, unknown>>(db: Db, sql: string, params?: unknown[]) {
  const res = await db.query<R>(sql, params);
  return res.rows;
}
