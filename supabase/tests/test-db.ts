/**
 * Test harness: runs our Supabase migrations in an in-memory Postgres
 * (PGlite) with a stand-in for Supabase's auth and storage schemas and roles,
 * so access rules can be tested without Docker or a real project.
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
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;

  create schema storage;
  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text not null,
    unique (bucket_id, name)
  );
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  grant select, insert, update, delete on storage.objects to anon, authenticated;
  grant select on storage.buckets to anon, authenticated;
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

/** Run queries through the real service_role role, like the seed script's admin client. */
export async function asServiceRole<T>(
  db: Db,
  fn: (q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query("set local role service_role");
    await tx.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ role: "service_role" }),
    ]);
    return fn(async <R,>(sql: string, params?: unknown[]) => {
      const res = await tx.query<R>(sql, params);
      return res.rows;
    });
  });
}

/** Run as the database owner (bypasses RLS), e.g. for test set-up. */
export async function asAdmin<R = Record<string, unknown>>(db: Db, sql: string, params?: unknown[]) {
  const res = await db.query<R>(sql, params);
  return res.rows;
}
