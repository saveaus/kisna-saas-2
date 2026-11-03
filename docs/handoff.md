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

## What's built

On `main`:

- **Step 1, shell:** Lightfield tokens, sidebar, Up next, Ask bar
  (placeholder), `DataTable`, `RecordView`, `Popup` templates.
- **Step 2, login and roles:** Supabase sign-in, sign-up → create
  workspace, invite by email (superadmin), set password, four roles,
  permissions matrix, row level security on every table, audit log, seed
  script.
- **Clients, Staff, Sites** load from the database. Create client, create
  staff and invite work. Financials only show with Finance access.
- **Saved views** on all three tables: name on save (+), rename, save
  filters to view, delete; stored per person in `saved_views`.

On branch `step-3-clients`, not merged yet:

- **Step 3, Clients:** click-to-edit in the Details panel, Notes, Contacts,
  Files (private bucket, one-minute links), Incomplete flag and activity
  history. New migration `20261103020000_client_records.sql`, tested per role.
- **Fictional demo data** in `src/lib/demo-data.ts`, added in Cursor. The seed
  fills the project's oldest workspace, or creates Demo Provider if there is
  none.

`npm test` covers the database rules in-memory with PGlite (no Supabase needed)
and renders the client screens. **Step 3 hasn't run on a real Supabase project,
and neither have most of Step 2's screens.** Expect to fix things when it does:
in particular file upload, which PGlite can't exercise.

## Where setup is up to

Project `qxhnklaygagfbrgzgmfe`. Izak has signed up in the app. The first two
migrations **are** on the project, confirmed through the API on 3 Nov
(`workspaces`, `saved_views` and `create_workspace` all exist). They didn't go
through the CLI, which has never been linked on this computer, so the project
may have no record of them. The earlier `create_workspace` error should be gone,
but hasn't been retested signed in.

**Client pages will error until the new migration is pushed**, because they read
tables it creates.

1. `.env.local` has the URL and anon key. `SUPABASE_SERVICE_ROLE_KEY` (line 11)
   was still empty on disk. Never commit it or paste keys into chat.
2. Izak runs `npx supabase@2 login` (needs a browser). Then
   `npx --yes supabase@2 link --project-ref qxhnklaygagfbrgzgmfe` and
   `npx --yes supabase@2 migration list`. If the first two show as not applied
   on the remote, mark them with `migration repair --status applied` rather than
   letting `db push` run them again. Check the new migration with
   `db push --dry-run`, then `npm run db:push`. If the API still can't see a
   change, run `notify pgrst, 'reload schema';` in the SQL editor.
3. `npm run seed`, then sign in as `superadmin@example.com` (`SEED_PASSWORD` in
   `.env.local`) and check each role (manager@, scheduler@, worker@example.com).
4. Authentication → URL Configuration: Site URL `http://localhost:3000`,
   redirect `http://localhost:3000/**`. Copy
   `supabase/templates/invite.html` into the hosted Invite email template. This
   can wait until invites are tested. Supabase's built-in email only reaches
   team members, 2 emails an hour.

If the Supabase MCP is set up in Cursor, prefer `read_only=true`; all
schema changes go through files in `supabase/migrations`.

## Waiting on Izak (Step 3)

- Should support workers be able to add notes on their own clients? Today only
  people with Clients & Sites: Full can.
- Should support workers open all files on their own clients? Today they can.
- Contact fields and types aren't from Imploy. Check them against Imploy's
  Contacts tab.
- Imploy calls Funding Type "locked". Care OS lets it be changed. Confirm.
- Import CSV and "Save default for everyone" were labelled Step 3 but aren't in
  its list. They now say "Arrives after Step 4". Decide when they land.

## What's next

1. Finish setup above and fix anything that breaks on real Supabase
   (sign-in, invite email, permissions, saved views, Step 3).
2. Izak checks Step 3, answers the questions above, then merge it.
3. **Step 4, Staff:** same for staff: editing, Notes, Files, Activity. Prompt is
   in `docs/brief.md`. `RecordView`'s `editing` prop, `DataTable`'s `embedded`
   prop and `audit_log` are ready to reuse.
4. Then Phase 2 (roster) per `docs/brief.md`.

## Rules that always apply

- Development database only; no real participant data until role-based
  access is tested for every role and the AI provider/region is chosen.
- One step per branch, small commits; run lint, typecheck, test and build
  before committing. End commits with any attribution lines Izak asks for.
- Never edit an applied migration; add a new one with tests per role.
