/**
 * Fills a DEVELOPMENT Supabase project with a demo workspace:
 *   - one login per role (superadmin, service manager, scheduler, support worker)
 *   - demo staff, clients and sites from src/lib/demo-data.ts
 *
 * Run: npm run seed   (reads .env.local)
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY to create the logins. Everything else is
 * written through the superadmin's own session, so the database's access
 * rules apply just as they do in the app.
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
// Clients the demo support worker works with.
const WORKER_CLIENTS = ["Amira Hassan", "Noah Bennett"];

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureUser(email: string, name: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (data.user) return { id: data.user.id, created: true };
  if (error && /already/i.test(error.message)) {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existing = list.users.find((u) => u.email === email);
    if (existing) return { id: existing.id, created: false };
  }
  throw new Error(`Couldn't create ${email}: ${error?.message}`);
}

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(
      `Couldn't sign in as ${email} (${error.message}). If the demo logins already exist, run again with SEED_PASSWORD set to their password.`,
    );
  }
  return client;
}

async function main() {
  console.log("Creating demo logins…");
  const userIds: Record<string, string> = {};
  for (const [name, email] of Object.entries(LOGINS)) {
    userIds[name] = (await ensureUser(email, name)).id;
  }

  const superadminEmail = LOGINS["Alex Morgan"];
  const db = await signIn(superadminEmail);

  const { data: existing } = await db.from("staff").select("workspace_id").limit(1);
  if (existing && existing.length > 0) {
    console.log("The demo workspace already exists. Nothing to do.");
    return;
  }

  console.log("Creating the Demo Provider workspace…");
  const { data: wsId, error: wsError } = await db.rpc("create_workspace", {
    workspace_name: "Demo Provider",
    my_name: "Alex Morgan",
  });
  if (wsError) throw wsError;
  const workspaceId = wsId as string;

  console.log("Adding staff…");
  const staffIds: Record<string, number> = {};
  const { data: me } = await db.from("staff").select("id").eq("user_id", userIds["Alex Morgan"]).single();
  staffIds["Alex Morgan"] = Number(me!.id);

  for (const person of staff) {
    if (person.name === "Alex Morgan") continue;
    const { data, error } = await db
      .from("staff")
      .insert({
        ...toRow(person, STAFF_COLUMNS),
        role: roleKeyFromLabel(String(person.role)) ?? "support_worker",
        workspace_id: workspaceId,
        user_id: userIds[person.name] ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    staffIds[person.name] = Number(data.id);
  }

  console.log("Adding clients…");
  for (const client of clients) {
    const { data, error } = await db
      .from("clients")
      .insert({
        ...toRow(client, CLIENT_COLUMNS),
        workspace_id: workspaceId,
        care_manager_id: staffIds[String(client.careManager)] ?? null,
        scheduler_id: staffIds[String(client.scheduler)] ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    if (WORKER_CLIENTS.includes(client.name)) {
      const { error: teamError } = await db.from("client_team").insert({
        client_id: data.id,
        staff_id: staffIds["Jordan Hale"],
        workspace_id: workspaceId,
      });
      if (teamError) throw teamError;
    }
  }

  console.log("Adding sites…");
  for (const site of sites) {
    const { error } = await db.from("sites").insert({
      ...toRow(site, SITE_COLUMNS),
      workspace_id: workspaceId,
      manager_id: staffIds[String(site.manager)] ?? null,
    });
    if (error) throw error;
  }

  console.log("\nDone. Sign in at http://localhost:3000 with any of these:\n");
  for (const [name, email] of Object.entries(LOGINS)) {
    const role = staff.find((s) => s.name === name)?.role;
    console.log(`  ${String(role).padEnd(24)} ${email.padEnd(26)} password: ${password}`);
  }
  console.log("\nThe support worker only sees Amira Hassan and Noah Bennett.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
