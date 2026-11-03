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
- Structure follows Lightfield, not Attio. The exception is the sidebar, which
  groups items the way Imploy does and folds most away, so it looks simple.
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

On branches, not merged yet. `step-4-staff` is built on `simpler-sidebar`, which is
built on `step-3-clients`, so merge them in that order:

- **Step 3, Clients:** click-to-edit in the Details panel, Notes, Contacts,
  Files (private bucket, one-minute links, shared with support workers per file),
  Incomplete flag and activity history. New migrations
  `20261103020000_client_records.sql`, `20261103030000_client_file_sharing.sql` and
  `20261103040000_exact_api_grants.sql`, tested per role.
- **Sidebar** (`simpler-sidebar`): grouped the way Imploy does, most of it folded.
- **Step 4, Staff, editing only** (`step-4-staff`): click-to-edit in the Details
  panel. Notes, Files and Activity are still placeholders.
- **Fictional demo data** in `src/lib/demo-data.ts`, added in Cursor. The seed
  fills the project's oldest workspace, or creates Demo Provider if there is
  none.

`npm test` covers the database rules in-memory with PGlite (no Supabase needed)
and renders the client screens. The test database copies Supabase's default
permissions, so a grant that's too broad fails there too.

**Step 3 is live on the real development project and was checked there on
3 Nov:** every role through the API (71 checks) and the actual screens in a
headless browser (72 checks), including a real file upload, sharing, and no
browser errors. Those were throwaway scripts on temporary clients, which were
deleted. Invite emails and sign-up confirmation emails haven't been tested.

## Where setup is up to

Project `qxhnklaygagfbrgzgmfe`. Done: `.env.local` has all its keys, the CLI is
logged in and linked, all five migrations are applied and the history matches
`supabase/migrations`, and the demo data is loaded into Izak's workspace. Demo
logins are superadmin@, manager@, scheduler@ and worker@example.com, with
`SEED_PASSWORD` from `.env.local`.

Still to do, when invites get tested (Izak does this in the dashboard):

- Authentication → URL Configuration: Site URL `http://localhost:3000`,
  redirect `http://localhost:3000/**`.
- Authentication → Email Templates → Invite user: copy
  `supabase/templates/invite.html`, subject from `supabase/config.toml`.
- Supabase's built-in email only reaches team members, 2 emails an hour.

Schema changes: add a file to `supabase/migrations`, then `npm run db:push`. Don't
apply them another way. The first two migrations were applied in pieces outside
the CLI (probably Cursor's Supabase MCP), which left five stray history records to
clear. If that MCP is set up in Cursor, use `read_only=true`.

Permissions: Supabase's defaults gave anon and authenticated every privilege on new
tables, including TRUNCATE. `20261103040000_exact_api_grants.sql` set exact grants
and closed that default, so **a new table has no API access until its migration
grants it**, and `supabase/tests/grants.test.ts` must list it.

## Decisions from Izak on Step 3 (3 Nov 2026)

- Support workers can't add notes. Only people with Clients & Sites: Full can.
- Support workers only open files that have been shared with them. New files
  start private.
- A client's funding type can be changed, even though Imploy calls it "locked".
- The contact fields and types are right.
- Import CSV and "Save default for everyone" arrive after Step 4.

## To decide before real data

- **Database region.** The project is in Frankfurt (`eu-central-1`), about 440 ms
  per trip from Australia, so saves take about 2 seconds. Australian data should be
  in Sydney (`ap-southeast-2`): see "AI provider and data region" in the brief. As
  far as we know this means a new project (Supabase's regions page doesn't cover
  moving one, so confirm first), then `npm run db:push` and `npm run seed`. It's
  cheapest while there's only demo data. Izak's call.
- **Support worker access.** Izak's comment, 3 Nov, not built yet: their permissions
  should be much lower, with no access to the AI or to some other admin features.
  Today their defaults include Chat: Full (`create_workspace`), which covers the
  assistant, and the Ask bar shows on every page. Izak to say which features.

## What's next

1. Izak checks Step 3, the sidebar and staff editing by hand, then merge them
   in the order above.
2. Finish the email settings above and test invites.
3. **Finish Step 4, Staff:** Notes, Files and Activity. Prompt is in
   `docs/brief.md`. `DataTable`'s `embedded` prop and `audit_log` are ready to reuse.
4. Then Phase 2 (roster) per `docs/brief.md`.

## Rules that always apply

- Development database only; no real participant data until role-based
  access is tested for every role and the AI provider/region is chosen.
- One step per branch, small commits; run lint, typecheck, test and build
  before committing. End commits with any attribution lines Izak asks for.
- Never edit an applied migration; add a new one with tests per role.
