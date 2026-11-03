/**
 * Fills a DEVELOPMENT Supabase project with a demo workspace:
 *   - one login per role (superadmin, service manager, scheduler, support worker)
 *   - demo staff, clients and sites from src/lib/demo-data.ts
 *
 * Run: npm run seed   (reads .env.local)
 *
 * Safe to run again: it only adds what's missing. Needs
 * SUPABASE_SERVICE_ROLE_KEY to create the logins; everything else is written
 * through the superadmin's own session, so the database's access rules apply
 * just as they do in the app.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { clients, sites, staff } from "../src/lib/demo-data";
import { CLIENT_COLUMNS, SITE_COLUMNS, STAFF_COLUMNS, toRow } from "../src/lib/records";
import { roleKeyFromLabel } from "../src/lib/permissions";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const password = process.env.SEED_PASSWORD || `Demo-${randomBytes(6).toString("hex")}`;

// Demo staff who get a login, by name → login email.
const LOGINS: Record<string, string> = {
  "Alex Morgan": "superadmin@example.com",
  "Demo Service Manager": "manager@example.com",
  "Demo Scheduler": "scheduler@example.com",
  "Jordan Hale": "worker@example.com",
};
const SUPERADMIN = "Alex Morgan";
// Clients the demo support worker works with.
const WORKER = "Jordan Hale";
const WORKER_CLIENTS = ["Amira Hassan", "Noah Bennett"];

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email: string) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 200) return undefined;
  }
  return undefined;
}

let reusedLogins = false;

async function ensureUser(email: string, name: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (data.user) return data.user.id;
  if (error && /already/i.test(error.message)) {
    const existing = await findUserByEmail(email);
    if (existing) {
      reusedLogins = true;
      return existing.id;
    }
  }
  throw new Error(`Couldn't create ${email}: ${error?.message}`);
}

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(
      `Couldn't sign in as ${email} (${error.message}). The demo logins already exist: run again with SEED_PASSWORD set to their password.`,
    );
  }
  return client;
}

async function must<T>(
  promise: PromiseLike<{ data: T; error: { message: string } | null }>,
): Promise<NonNullable<T>> {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return (data ?? []) as NonNullable<T>;
}

async function main() {
  console.log("Demo logins…");
  const userIds: Record<string, string> = {};
  for (const [name, email] of Object.entries(LOGINS)) {
    userIds[name] = await ensureUser(email, name);
  }

  const db = await signIn(LOGINS[SUPERADMIN]);

  // Workspace (created by the superadmin, who becomes its first member).
  const mine = await must(
    db.from("staff").select("id, workspace_id").eq("user_id", userIds[SUPERADMIN]).limit(1),
  );
  let workspaceId: string;
  if (mine.length) {
    workspaceId = mine[0].workspace_id;
    console.log("Demo Provider workspace already exists; adding anything missing.");
  } else {
    console.log("Creating the Demo Provider workspace…");
    workspaceId = (await must(
      db.rpc("create_workspace", { workspace_name: "Demo Provider", my_name: SUPERADMIN }),
    )) as string;
  }

  console.log("Staff…");
  const existingStaff = await must(
    db.from("staff").select("id, name, email").eq("workspace_id", workspaceId),
  );
  const staffIds: Record<string, number> = {};
  for (const s of existingStaff) staffIds[s.name] = Number(s.id);

  for (const person of staff) {
    const details = {
      ...toRow(person, STAFF_COLUMNS),
      email: String(person.email).toLowerCase(),
      role: roleKeyFromLabel(String(person.role)) ?? "support_worker",
    };
    if (person.name === SUPERADMIN) {
      // Fill in the superadmin's demo details (role stays superadmin).
      const { role: _role, ...rest } = details;
      void _role;
      const me = existingStaff.find((s) => s.name === SUPERADMIN) ??
        (await must(db.from("staff").select("id, name, email").eq("user_id", userIds[SUPERADMIN]).limit(1)))[0];
      await must(db.from("staff").update({ ...rest, email: LOGINS[SUPERADMIN] }).eq("id", me.id));
      staffIds[SUPERADMIN] = Number(me.id);
      continue;
    }
    if (staffIds[person.name]) continue;
    const row = await must(
      db
        .from("staff")
        .insert({ ...details, workspace_id: workspaceId, user_id: userIds[person.name] ?? null })
        .select("id")
        .single(),
    );
    staffIds[person.name] = Number(row.id);
  }

  console.log("Clients…");
  const existingClients = await must(
    db.from("clients").select("id, name").eq("workspace_id", workspaceId),
  );
  const clientIds: Record<string, number> = {};
  for (const c of existingClients) clientIds[c.name] = Number(c.id);

  for (const client of clients) {
    if (!clientIds[client.name]) {
      const row = await must(
        db
          .from("clients")
          .insert({
            ...toRow(client, CLIENT_COLUMNS),
            workspace_id: workspaceId,
            care_manager_id: staffIds[String(client.careManager)] ?? null,
            scheduler_id: staffIds[String(client.scheduler)] ?? null,
          })
          .select("id")
          .single(),
      );
      clientIds[client.name] = Number(row.id);
    }
    if (WORKER_CLIENTS.includes(client.name)) {
      await must(
        db.from("client_team").upsert(
          { client_id: clientIds[client.name], staff_id: staffIds[WORKER], workspace_id: workspaceId },
          { onConflict: "client_id,staff_id", ignoreDuplicates: true },
        ),
      );
    }
  }

  console.log("Sites…");
  const existingSites = await must(db.from("sites").select("name").eq("workspace_id", workspaceId));
  for (const site of sites) {
    if (existingSites.some((s) => s.name === site.name)) continue;
    await must(
      db.from("sites").insert({
        ...toRow(site, SITE_COLUMNS),
        workspace_id: workspaceId,
        manager_id: staffIds[String(site.manager)] ?? null,
      }),
    );
  }

  console.log("\nDone. Sign in at http://localhost:3000 with any of these:\n");
  for (const [name, email] of Object.entries(LOGINS)) {
    const role = staff.find((s) => s.name === name)?.role;
    console.log(
      `  ${String(role).padEnd(24)} ${email.padEnd(26)} password: ${reusedLogins ? "(unchanged)" : password}`,
    );
  }
  console.log("\nThe support worker only sees Amira Hassan and Noah Bennett.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
