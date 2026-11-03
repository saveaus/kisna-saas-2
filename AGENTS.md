<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Care OS: project rules

Read `docs/handoff.md` and `docs/brief.md` first. It lists every feature, where it comes from, and
the build order (Phase 1 plan).

## Where things come from
- **Imploy** decides what a feature does and which fields exist
  (`docs/imploy-fields.md`, `src/lib/fields.ts`).
- **Kinsa** decides what compliance features do.
- **Lightfield** decides how everything looks and works
  (`docs/design-tokens.md`). Where they clash, Lightfield wins.
- Study those apps in the browser **read-only**: never save, submit, send
  or delete anything in them. Don't copy their code, private APIs, assets or
  exact wording.

## Conventions
- **Reuse the templates.** Every list uses `DataTable`, every record uses
  `RecordView`, every create/edit form uses `Popup` with chips. Don't build
  one-off layouts or new styles.
- **Use the tokens.** Colours, borders and type come from `globals.css`
  (`bg-canvas`, `text-ink-3`, `hairline`…). No raw hex values in components.
- **Folders:** `src/app` routes stay thin; feature code lives in
  `src/features/<feature>`; shared UI in `src/components`; logic and types
  in `src/lib`.
- **Fields are defined once** in `src/lib/fields.ts`. When the database
  arrives, the schema follows these definitions; update both docs and code
  together.
- **Placeholders say when they arrive** ("Arrives in Phase 3"), so the
  structure is visible before the feature exists.
- **Cache Components is off** (`next.config.ts`): signed-in pages render per
  request. `params` is still a Promise.
- **Reads go through `src/lib/data/*.server.ts`**, never straight from
  pages. Writes are server actions in `src/features/<feature>/actions.ts`
  that call `checkPermission()` first — outside any try/catch, so an
  expired session can still redirect to /login.

## Data and security
- Read `docs/access-model.md` before touching tables, roles or permissions.
- Development database only. No real participant data until role-based
  database rules are in place and tested for every role.
- When a feature stores records, add fictional examples to `src/lib/demo-data.ts`
  and insert them from `scripts/seed.ts`, then run the seed against the
  development project so the screens can be tested with data.
- Every table gets row level security from the start, checking role and
  permission area (`private.can`), not just workspace membership. Add tests
  for each role in `supabase/tests` whenever you add a table.
- Schema changes are new files in `supabase/migrations`, applied with
  `npm run db:push`; never edit an applied migration.
- New tables have no API access until their migration grants it. Grant only what
  each role needs, and list the table in `supabase/tests/grants.test.ts`.
- The service-role key (`src/lib/supabase/admin.ts`) bypasses RLS: use it
  only after checking the caller's permissions, and never in client code.
- NDIS pricing, award rates and claims must be checked against official
  sources and covered by tests.

## Working style
- One feature per branch, small commits, and stop when a step is done so it
  can be checked.
- Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`
  before committing.
