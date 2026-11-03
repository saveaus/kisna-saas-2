# Care OS

An operating system for Australian NDIS and Support at Home providers:
clients, staff, rostering, compliance and billing, with an AI assistant.
Features follow Imploy and Kinsa; the look and structure follow Lightfield.

**Status:** Phase 1, Step 2 done: sign-in, workspaces, Imploy's four roles,
a permission matrix, and database access rules per role, tested. Clients,
Staff and Sites now read from and save to Supabase.

## Set up (about 10 minutes)

You need Node.js 20.9 or newer.

1. **Install**
   ```bash
   npm install
   ```
2. **Create a Supabase project** at [supabase.com](https://supabase.com).
   Use a development project with **no real client data**.
3. **Add your keys.** Copy `.env.example` to `.env.local`, then fill in
   the Project URL, the anon (publishable) key and the service_role
   (secret) key from Project Settings → API. Keep the service_role key
   private.
4. **Create the database tables**
   ```bash
   npm run db:link   # pick your project; asks for the database password
   npm run db:push   # applies supabase/migrations
   ```
   No CLI? Paste `supabase/migrations/20261103000000_foundation.sql` into
   the Supabase SQL Editor and run it instead.
5. **Point sign-in emails back to your app.** In Supabase → Authentication
   → URL Configuration, set Site URL to `http://localhost:3000` and add
   `http://localhost:3000/auth/callback` to Redirect URLs.
6. **Add demo data (optional)**
   ```bash
   npm run seed
   ```
   This fills the development workspace (or creates "Demo Provider" if the
   project is empty) with fictional clients, staff and sites, plus one login
   per role. It prints the email and password for each.
7. **Run it**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 and sign in, or create your own workspace.

## Try the access rules

After `npm run seed`, sign in as each demo login:

| Login | What you should see |
| --- | --- |
| superadmin@example.com | Everything, plus Settings → Permissions (editable) |
| manager@example.com | All clients and staff, can add them; no permission changes |
| scheduler@example.com | Clients and staff read-only; no bank details |
| worker@example.com | Only Amira Hassan and Noah Bennett; no Staff or Sites |

Change a role's access in Settings → Permissions as the superadmin, and the
other logins change straight away.

## What's here

| Page | What you can do |
| --- | --- |
| Up next (`/`) | Today's date with Shifts, Tasks and Alerts placeholders |
| Clients | Views, filters, Display menu, column menus, Create client |
| Client record | Overview, Details panel with Imploy's fields; bank details for finance roles only |
| Staff | Create staff (role, type, contact), Login column |
| Staff record | Send invite (superadmin), Compliance document list, Employment fields |
| Sites | Sites table |
| Settings → Permissions | Imploy's permission matrix per role |

## Docs

- `docs/brief.md`: the build brief: features, sources, phases and the next prompts
- `docs/access-model.md`: who can see and change what, and how it's enforced
- `docs/imploy-fields.md`: every Imploy client, site and staff field
- `docs/design-tokens.md`: Lightfield's measured colours, type and sizes
- `AGENTS.md`: rules for Claude (or anyone) working in this repo

## Checks

```bash
npm run lint
npm run typecheck
npm test        # database access rules, runs in memory (no Supabase needed)
npm run build
```
