# Care OS

An operating system for Australian NDIS and Support at Home providers:
clients, staff, rostering, compliance and billing, with an AI assistant.
Features follow Imploy and Kinsa; the look and structure follow Lightfield.

**Status:** Phase 1, Step 3 built: sign-in, workspaces, Imploy's four roles and
tested database access rules, plus client records you can edit, with Notes,
Contacts, private Files and an activity history. Invite emails aren't tested yet.

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
   (secret) key from Project Settings → API Keys. Keep the service_role key
   private.
4. **Create the database tables**
   ```bash
   npx supabase@2 login   # opens your browser, once per computer
   npm run db:link        # pick your project; asks for the database password
   npm run db:push        # applies supabase/migrations
   ```
   No CLI? Paste each file in `supabase/migrations` into the Supabase SQL
   Editor and run them, oldest first. If you do, tell the CLI later or its next
   push will try to run them again: `npx supabase@2 migration repair --status
   applied <timestamp>` for each file.
5. **Point sign-in emails back to your app.** In Supabase → Authentication
   → URL Configuration, set Site URL to `http://localhost:3000` and add
   `http://localhost:3000/**` to Redirect URLs (use exact addresses when the app
   goes live). In Authentication → Email Templates → Invite user, set the subject
   and body from `supabase/config.toml` and `supabase/templates/invite.html`.
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
| worker@example.com | Only Amira Hassan and Noah Bennett; no Staff or Sites; only files shared with them |

Change a role's access in Settings → Permissions as the superadmin, and the
other logins change straight away.

## What's here

| Page | What you can do |
| --- | --- |
| Up next (`/`) | Today's date with Shifts, Tasks and Alerts placeholders |
| Clients | Views, filters, Display menu, column menus, Create client, Profile column to find incomplete clients |
| Client record | Click any field in Details to edit it (bank details need Finance: Full), Overview with activity, Notes, Contacts, Files, Incomplete flag |
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
