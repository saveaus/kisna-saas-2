# Handoff: where Care OS is up to

Last updated 3 Nov 2026. Written so a new Claude Code session (e.g. in
Cursor) can pick up the work without the earlier chat. Read this, then
`AGENTS.md`, `README.md` and `docs/brief.md`.

## Who you're working with

Izak (izakjosef@gmail.com) owns the project and approves every feature.
He isn't a developer: explain in plain words, give exact commands to run,
and say what he should see. Stop at the end of each step so he can check it.

## What we're building

Care OS: an operating system for Australian NDIS and Support at Home
providers, built from scratch in this repo (`saveaus/kisna-saas-2`).

- **Imploy** (app.imploy.com.au) decides features 1–14 and the fields on
  every record (`docs/imploy-fields.md`).
- **Kinsa** (the Vercel compliance app) decides compliance features 21–32,
  including automated email follow-ups (any data point + condition + time +
  text/action, with templates such as document expiry).
- **Lightfield** (crm.lightfield.app) decides all look, structure,
  navigation, popups and the AI assistant (`docs/design-tokens.md`). Where
  sources clash, Lightfield wins. The roster follows Imploy's structure but
  looks like Lightfield; a shift opens like Lightfield's task popup.
- These three apps hold real accounts: browse them read-only. Never save,
  submit, send or delete in them, and don't copy their code or wording.

## Decisions already made (don't reopen without asking)

- Start from scratch; don't build on `saveaus/harbor`.
- Structure follows Lightfield, not Attio.
- No MCP feature in the product.
- Next.js 16 + React 19 + Tailwind 4 + Supabase. Cache Components off.
- Roles copy Imploy: Superadmin, Service Manager, Scheduler, Support
  Worker, with a per-area permission matrix in Settings → Permissions.
- Saved views are personal (each person sees only their own).

## What's built (on `main`)

- **Step 1, shell:** Lightfield tokens, sidebar, Up next, Ask bar
  (placeholder), `DataTable`, `RecordView`, `Popup` templates.
- **Step 2, login and roles:** Supabase sign-in, sign-up → create
  workspace, invite by email (superadmin), set password, four roles,
  permissions matrix, row level security on every table, audit log, seed
  script. 25 database access tests in `supabase/tests` (run in-memory with
  PGlite, so no Supabase is needed for `npm test`).
- **Clients, Staff, Sites** load from the database. Create client, create
  staff and invite work. Financials only show with Finance access.
- **Saved views** on all three tables: name on save (+), rename, save
  filters to view, delete; stored per person in `saved_views`.

None of this has been run against a real Supabase project yet; the
cloud session that built it couldn't reach one.

## Where setup is up to

Izak created Supabase project `qxhnklaygagfbrgzgmfe` and has signed up
in the app. Creating a workspace failed with "Could not find the function
public.create_workspace … in the schema cache". That means the migrations
haven't been pushed. Next:

1. `.env.local` filled from `.env.example` (URL, anon key, service_role
   key). Never commit it or paste keys into chat.
2. `npm run db:link` (project ref above, database password) then
   `npm run db:push`. If the error remains, run
   `notify pgrst, 'reload schema';` in the Supabase SQL editor.
3. Authentication → URL Configuration: Site URL `http://localhost:3000`,
   redirect `http://localhost:3000/auth/callback`. Copy
   `supabase/templates/invite.html` into the hosted Invite email template.
4. `npm run seed`, then `npm run dev`, then sign in as
   `superadmin@example.com` (password printed by the seed) and check each
   role (manager@, scheduler@, worker@example.com).

If the Supabase MCP is set up in Cursor, prefer `read_only=true`; all
schema changes go through files in `supabase/migrations`.

## What's next

1. Finish setup above and fix anything that breaks on real Supabase
   (sign-in, invite email, permissions, saved views).
2. **Step 3, Clients:** editing in the Details panel, Notes, Files
   (private storage, short-lived links), Contacts, Incomplete flag,
   activity history. Prompt is in `docs/brief.md`.
3. **Step 4, Staff:** same for staff: editing, Notes, Files, Activity.
4. Then Phase 2 (roster) per `docs/brief.md`.

## Rules that always apply

- Development database only; no real participant data until role-based
  access is tested for every role and the AI provider/region is chosen.
- One step per branch, small commits; run lint, typecheck, test and build
  before committing. End commits with any attribution lines Izak asks for.
- Never edit an applied migration; add a new one with tests per role.
