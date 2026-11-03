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
import { randomBytes, randomUUID } from "node:crypto";
import {
  clientContactExamples,
  clientFileExamples,
  clientFinancials,
  clientNoteExamples,
  clientTeams,
  clients,
  demoViews,
  sites,
  staff,
} from "../src/lib/demo-data";
import { CLIENT_FILES_BUCKET } from "../src/lib/fields";
import { CLIENT_COLUMNS, CONTACT_COLUMNS, SITE_COLUMNS, STAFF_COLUMNS, toRow } from "../src/lib/records";
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
  "Maya Chen": "manager@example.com",
  "Sam Okonkwo": "scheduler@example.com",
  "Jordan Hale": "worker@example.com",
};
const SUPERADMIN = "Alex Morgan";

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

  // Prefer the workspace already on this project (the signed-up account).
  // Create "Demo Provider" only when the project has no workspace yet.
  const { data: existingWs, error: wsError } = await admin
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);
  if (wsError) throw new Error(wsError.message);

  let workspaceId: string;
  if (existingWs?.length) {
    workspaceId = existingWs[0].id;
    console.log("Using the existing workspace; adding anything missing.");
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
      const me = existingStaff.find((s) => s.name === SUPERADMIN);
      if (!me) {
        // Not a member yet (seeding into an existing account). Service role
        // bypasses the "must already belong" check for this first link.
        const row = await must(
          admin
            .from("staff")
            .insert({
              ...rest,
              email: LOGINS[SUPERADMIN],
              role: "superadmin",
              workspace_id: workspaceId,
              user_id: userIds[SUPERADMIN],
            })
            .select("id")
            .single(),
        );
        staffIds[SUPERADMIN] = Number(row.id);
        continue;
      }
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
  }

  for (const link of clientTeams) {
    const clientId = clientIds[link.client];
    const staffId = staffIds[link.staff];
    if (!clientId || !staffId) continue;
    await must(
      db.from("client_team").upsert(
        { client_id: clientId, staff_id: staffId, workspace_id: workspaceId, kind: link.kind },
        { onConflict: "client_id,staff_id" },
      ),
    );
  }

  console.log("Bank details…");
  for (const fin of clientFinancials) {
    const clientId = clientIds[fin.client];
    if (!clientId) continue;
    await must(
      db.from("client_financials").upsert(
        {
          client_id: clientId,
          workspace_id: workspaceId,
          bank_name: fin.bankName,
          bsb: fin.bsb,
          account_number: fin.accountNumber,
          itf_status: fin.itfStatus ?? null,
          itf_value: fin.itfValue ?? null,
        },
        { onConflict: "client_id" },
      ),
    );
  }

  console.log("Notes, contacts and files…");
  // Each note is written by its author's own login, so the database stamps the name.
  const sessions = new Map<string, SupabaseClient>([[SUPERADMIN, db]]);
  const sessionFor = async (name: string) => {
    if (!sessions.has(name)) sessions.set(name, await signIn(LOGINS[name]));
    return sessions.get(name)!;
  };

  for (const note of clientNoteExamples) {
    const clientId = clientIds[note.client];
    if (!clientId) continue;
    const existing = await must(
      db.from("client_notes").select("id").eq("client_id", clientId).eq("body", note.body).limit(1),
    );
    if (existing.length) continue;
    const author = await sessionFor(note.author);
    await must(
      author.from("client_notes").insert({ workspace_id: workspaceId, client_id: clientId, body: note.body }),
    );
  }

  for (const contact of clientContactExamples) {
    const clientId = clientIds[contact.client];
    if (!clientId) continue;
    const existing = await must(
      db.from("client_contacts").select("id").eq("client_id", clientId).eq("name", contact.name).limit(1),
    );
    if (existing.length) continue;
    await must(
      db.from("client_contacts").insert({
        ...toRow(contact, CONTACT_COLUMNS),
        workspace_id: workspaceId,
        client_id: clientId,
      }),
    );
  }

  for (const file of clientFileExamples) {
    const clientId = clientIds[file.client];
    if (!clientId) continue;
    const existing = await must(
      db.from("client_files").select("id").eq("client_id", clientId).eq("name", file.name).limit(1),
    );
    if (existing.length) continue;
    const path = `${workspaceId}/${clientId}/${randomUUID()}`;
    const { error } = await db.storage
      .from(CLIENT_FILES_BUCKET)
      .upload(path, new Blob([file.body], { type: "text/plain" }), { contentType: "text/plain" });
    if (error) throw new Error(error.message);
    await must(
      db.from("client_files").insert({
        workspace_id: workspaceId,
        client_id: clientId,
        name: file.name,
        storage_path: path,
        size_bytes: Buffer.byteLength(file.body),
        mime_type: "text/plain",
      }),
    );
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

  console.log("Saved views…");
  const supers = await must(
    admin
      .from("staff")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("role", "superadmin")
      .not("user_id", "is", null),
  );
  for (const person of supers) {
    for (const view of demoViews) {
      const { data: existing } = await admin
        .from("saved_views")
        .select("id")
        .eq("user_id", person.user_id)
        .eq("workspace_id", workspaceId)
        .eq("object", view.object)
        .eq("name", view.name)
        .limit(1);
      if (existing?.length) continue;
      const { error } = await admin.from("saved_views").insert({
        workspace_id: workspaceId,
        user_id: person.user_id,
        object: view.object,
        name: view.name,
        filters: view.filters,
      });
      if (error) throw new Error(error.message);
    }
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
