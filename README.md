# Care OS

An operating system for Australian NDIS and Support at Home providers:
clients, staff, rostering, compliance and billing, with an AI assistant.
Features follow Imploy and Kinsa; the look and structure follow Lightfield.

**Status:** Phase 1, Step 1 done: the app shell, Lightfield design tokens,
and working table, record and popup templates, shown with demo data.
Nothing is saved yet; login and the database arrive in Step 2.

## Run it

You need Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## What's here

| Page | What you can do |
| --- | --- |
| Up next (`/`) | Today's date with Shifts, Tasks and Alerts placeholders |
| Clients (`/clients`) | Views, filters, Display menu, column menus, Create client popup |
| Client record (`/clients/2`) | Inline tabs, Overview, Notes, Details panel with Imploy's fields |
| Staff (`/staff`) | Same table template; Create staff popup |
| Staff record (`/staff/1303`) | Overview, Compliance document list, Employment fields, Details panel |
| Sites (`/sites`) | Sites table |

Greyed sidebar items show which phase they arrive in.

## Docs

- `docs/brief.md`: the build brief: features, sources, phases and the next prompts
- `docs/imploy-fields.md`: every Imploy client, site and staff field
- `docs/design-tokens.md`: Lightfield's measured colours, type and sizes
- `AGENTS.md`: rules for Claude (or anyone) working in this repo

## Next

Follow the Step 2, 3 and 4 prompts in `docs/brief.md` (Build prompts
section), one at a time.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
