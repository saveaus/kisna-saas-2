# Care OS — Build Brief

Nov 2, 2026 · @izak reeves

We're building a care-provider operating system for Australian NDIS and Support at Home providers in a new codebase. It takes features from Imploy and Kinsa, and everything about the look, structure and AI assistant from Lightfield.

## Approach

We build from scratch in a new repo, [saveaus/kisna-saas-2](https://github.com/saveaus/kisna-saas-2), one step at a time, checking each step before the next. Fields and record structure come from Imploy and Kinsa; the look, structure and AI assistant come from Lightfield.

- **Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Supabase
- **Reference files in the repo:** `docs/imploy-fields.md` (every Imploy client, site and staff field) and `docs/design-tokens.md` (Lightfield's measured colours, type and sizes)
- **Check carefully:** NDIS billing and pricing, award rates and data security are the hardest parts to get right from scratch. Check them against the official NDIS Pricing Arrangements and the SCHADS Award, and have someone who knows NDIS operations review them.

## Phase 1 plan: shell, Clients and Staff

Phase 1 delivers the app shell plus working Clients and Staff, using Imploy's fields in Lightfield's layout. Roster, finance, compliance and the assistant show as placeholders.

| Step | What gets built | How to check it | Status |
| --- | --- | --- | --- |
| 1. Look and shell | Lightfield design tokens, sidebar, Up next, Ask bar (not live), reusable table, record page and popup templates, shown with Imploy demo data | Click around and compare with Lightfield side by side | Done |
| 2. Login and roles | Sign-in, one workspace, roles (Superadmin, Service Manager, Scheduler, Support Worker), database rules per role, demo data | Log in as each role and see different access | Done in code; being set up on Supabase |
| 3. Clients | Clients and Sites in the database: table, filters, saved lists, create popup, record page with Overview, Notes, Files and Contacts, Details panel, completeness flag, activity | Create, edit and find clients the way you would in Imploy | Partly done: table, saved views, create and record page read from the database. Still to do: editing, Notes, Files, Contacts, completeness flag, activity |
| 4. Staff | Staff in the database: table, create popup, record page with Overview, Notes, Files and Activity, Details panel | Same as Clients | Partly done: table, saved views, create, invite and record page read from the database. Still to do: editing, Notes, Files, Activity |

## Sources and rules

Each source has one job. Where they clash on look or behaviour, Lightfield wins.

| Source | What it decides |
| --- | --- |
| [Imploy](https://app.imploy.com.au/) | What features 1–14 do, and the fields on each record |
| [Kinsa](https://kinsa-saas-pym6wgtwf-openara.vercel.app/dashboard) | What compliance features 21–32 do |
| [Lightfield](https://crm.lightfield.app/) | The AI assistant (15–19), plus all UI, UX, structure, navigation, record pages, tables, popups and visual style |

- **Users:** superadmins, service managers, schedulers and support workers
- **Study, don't copy:** REA and the browser learn behaviour, data and structure from Imploy, Kinsa and Lightfield. We don't copy their source code, private APIs, assets or exact wording.
- **Read-only:** those three apps hold real accounts and client data, so we never save, submit, send or delete anything in them.

## Where each feature comes from

All 32 features are built new; the Phase column gives the build order.

| # | Feature | What it does | How it looks | Phase |
| --- | --- | --- | --- | --- |
| — | App shell | Imploy navigation | Lightfield | 1 |
| 1 | Home (Up next) | Imploy | Lightfield "Up next" | 1 (placeholder), filled as features land |
| 2 | Tasks | Imploy | Lightfield Tasks | 6 |
| 3 | Roster | Imploy | Lightfield style; shift popup = Lightfield task adder | 2 |
| 4 | Clients | Imploy | Lightfield record page + table | 1 |
| 5 | Staff | Imploy | Lightfield record page + table | 1 |
| 6 | Documents | Imploy | Lightfield Knowledge | 6 |
| 7 | Incidents | Imploy | Lightfield record page + table | 3 |
| 8 | Reports | Imploy | Lightfield style | 6 |
| 9 | Finance | Imploy | Lightfield style | 4 |
| 10 | Prospects | Imploy | Lightfield record page + table | 6 |
| 11 | Forms | Imploy | Lightfield style | 6 |
| 12 | Suppliers | Imploy | Lightfield record page + table | 6 |
| 13 | Settings | Imploy | Lightfield settings | Grows with each phase |
| 14 | Integrations | Imploy | Lightfield style | 6 |
| 15–19 | AI assistant and chat | Lightfield | Lightfield | 5 |
| 20 | Team chat | Imploy (to decide) | Lightfield style | 6 |
| 21–32 | Compliance, including follow-ups (24) | Kinsa | Lightfield style | 3 |

## App structure (Lightfield)

The app copies Lightfield's structure: it opens on Up next, the assistant's Ask bar sits on every page, and records and tools live in a quiet sidebar. Roster, Finance, Reports and Forms are purpose-built pages in Lightfield's style, because Lightfield has no equivalent.

**Sidebar**

- Top: user menu (with Settings), Search, Notifications
- Up next (home): today's shifts, tasks and alerts, with Just me and My team tabs
- Knowledge: company documents and policies the assistant can draw on
- Skills: saved assistant routines, for example "Fill vacant shifts"
- Chats: New chat, then recent chats
- Records: Clients, Sites, Staff, Prospects, Suppliers, Incidents
- Resources: Tasks, Roster, Notes, Follow-ups, Forms, Reports, Finance
- Compliance: Overview, Approvals, Policies, Registers, Audits, Evidence, Activity
- Lists: saved lists, plus New list
- Bottom: Help

**Ask bar:** the assistant's composer floats at the bottom of every page, tagged with what you're looking at (for example "All Tasks" or a client).

**Record page**

- Top bar: record name and a "…" menu, with the record's tabs inline
- Top right: copy link and Create (new related item)
- Main area: the selected tab, usually a table of related items
- Right panel: Details (key attributes, See more), then related sections such as Contacts, Shifts, Tasks, Notes and Incidents, each with See all

**Table views**

- Object name with view tabs (All, plus + to save a new view)
- Chip-based filters with nested menus
- Display menu: sorting, which properties show, Reset, Save default for everyone
- Column menu: sort, move left or right, hide
- Import CSV and Create \[record\] at top right, record count at the bottom

**Popups** (Lightfield task adder)

- Small centred card over a dimmed page, not a new page
- Header with icon, label and close; large title line; description area
- Row of property chips, each opening a small dropdown; chips that depend on another stay greyed until it's set
- Date chips use quick picks (Today, Tomorrow, 7d, 30d, Custom)
- One primary button at bottom right, disabled until required fields are set
- Esc closes, Cmd+Enter saves

## Features 1–14 (from Imploy)

Tick each feature you want. Sub-points are its functions as Imploy has them; the look follows Lightfield.

- [ ] **1. Home (Up next)**
  - Today's shifts, tasks and alerts, with Just me and My team tabs
  - Stats: total clients, clients under my care, service hours this week and upcoming
  - Alerts: missed check-ins, clock-ins far from site, expiring documents
  - Updates feed: notes added, assignments, alerts
- [ ] **2. Tasks**
  - List grouped by Outstanding and Done, by month
  - Columns: task, client, duration, type, billable, assignee
  - Add a charge to a task, so billable tasks flow into Finance
  - Billable-hours counter for the month
- [ ] **3. Roster**
  - Calendar with day, week and month views, grouped by staff or client
  - Create shifts, filter, show vacant shifts
  - Publish to staff, with a count of unpublished changes; publishing blocked when it would break compliance
  - Roster stats panel
  - Check-in rules, multiple check-ins, broken-shift allowance
  - Sleepover shifts with active-hours logging, an auto-approval threshold and a billing threshold
  - Public holidays, so private and SaH rates calculate correctly
  - Ratio (shared) support
  - **Shift popup** (Lightfield task adder):
    - Header: shift icon, "Shift" label, close
    - Title line (defaults to client and service), description for shift instructions
    - Chips: Status (draft or published), Staff (or Vacant), Client, Site (waits for Client), Date and time, Service item, Repeat, Labels
    - Existing shift: same card, plus check-in times, sleepover and active hours, and a link to the client
- [ ] **4. Clients**
  - Table with configurable columns
  - Client types: NDIS and HCP, with variants (self-managed, Level 1 to 4)
  - Sites as a second record type (group homes and locations)
  - Saved lists, for example participants with allergies
  - Record tabs: Overview, Notes, Budget, Care Plan, Observe, Tasks, Files, Contacts, Orders
    - Overview: funding, classification, level, care manager, scheduler, allergies, activity, notes
    - Budget: billables, budget, recipients; line items with NDIS item code, rate, amount, paid status
    - Care Plan: upload a plan or build one from a form
    - Observe: incidents and AI cautions
    - Contacts and Orders: family, coordinators, plan managers; consumables
  - Details panel: client info, funding, team and preferences, medical, notes, financial details, lists
  - Profile completeness flag
- [ ] **5. Staff**
  - Table: role, type, contact details, age, pending leave, checklist, business, status
  - Leave requests and availability views
  - Record tabs: Overview, Notes, Compliance, Files, Leave, Availability, Employment, Finance, Activity
  - Details: contact and employment, basic info, emergency contact, account
- [ ] **6. Documents**
  - Company library with folders and subfolders
  - Drag-and-drop upload, file type, uploaded by
- [ ] **7. Incidents**
  - Records: ID, title, type, priority, status, category, assignee, date reported
  - List and Board views, plus saved views
  - Created from incident forms; linked to the client's Observe tab
  - Print and export
- [ ] **8. Reports**
  - Dashboards and insights, organised into spaces
  - Recent activity list
- [ ] **9. Finance**
  - Invoicing: all invoices, bulk draft, filter, sent and paid status
  - Billable entries from tasks, shifts and manual lines
  - NDIS bulk claims, claim export and rejections
  - Accounts: orders, recipients (payers), statements, budgets
  - Employees: travel claims, reimbursements, timesheets
  - Accounting: MYOB, Xero, QuickBooks
- [ ] **10. Prospects**
  - Enquiry pipeline: name, date, email, phone, address, source, consult
  - List and Board views
  - Intake forms, plus imports from HubSpot, Mailchimp and Brevo
- [ ] **11. Forms**
  - Form builder for operational and compliance forms (care plans, incidents, prospects)
- [ ] **12. Suppliers**
  - Name, state, ABN, primary contact, phone, address
- [ ] **13. Settings**
  - Business: details, ABN, locations, finance, scheduling, NDIS agreement
  - People: role permissions (no access, read only, full access across each area), archived, client import
  - Price books: NDIS, SaH and private; billing codes; pay rates
  - Configuration: objects and attributes, templates, notifications, shift colours
  - Billing: subscription
- [ ] **14. Integrations**
  - MYOB, Xero, QuickBooks, Microsoft 365, Gmail, Stripe
  - HubSpot, Mailchimp, Brevo, Wyzed (staff training)
  - API and webhooks

## AI assistant and chat (15–20, from Lightfield)

The assistant is rebuilt to work and look like Lightfield's, studied in the live app. It can read everything the user can, and every change waits for the user's approval.

- [ ] **15. Assistant chat**
  - Full-page chat: centred column, minimal chrome, light grey canvas
  - Composer pinned to the bottom, with attach, history and a settings menu
  - Empty state with suggested prompts, for example:
    - Which staff have documents expiring this week?
    - Fill vacant shifts for next week
    - Summarise yesterday's incidents
    - What is still missing for our next audit?
  - Chats listed in the sidebar, with rename, share and delete
  - Attach files, for example a care plan PDF, then "create tasks from this doc"
- [ ] **16. Visible working steps**
  - Step chips while it works, for example "Searched clients" or "Retrieved shifts"
  - Stop button while running; error state with Retry
  - Inline record chips (client, staff, shift) that link to the record
- [ ] **17. Actions with approval**
  - Proposed changes shown as a preview table or card, for example "Create these 3 shifts?"
  - The user approves, edits or rejects each one; nothing is written until approved
  - Progress chips per action (Creating, then Created), with undo where possible
  - Covers anything in the app: records, shifts, notes, incidents, invoices, messages, follow-ups
  - High-risk actions (claims, emails or SMS, deleting) always ask, even in bulk
- [ ] **18. Access and logging**
  - Acts with the signed-in user's role permissions, never more
  - Every action logged on the record as done by the assistant and approved by the user
- [ ] **19. Ask bar everywhere**
  - Composer on every page and record, pre-loaded with what's on screen
  - Search opens a quick question from anywhere
  - Skills: save a prompt as a reusable routine
- [ ] **20. Team chat** (to decide)
  - Staff messaging with channels
  - Decide whether it shares the Chats list with the assistant or stays separate

## Compliance features 21–32 (from Kinsa)

These 12 features live under Compliance in the sidebar, except Follow-ups, which sits under Resources because it works across the whole app.

- [ ] **21. Compliance overview**
  - Audit readiness score, for example 31% (29 of 95 required evidence items)
  - Open items by status: overdue, missing, not accepted, lapsing
  - Open items by area: credential, policy, support plan, service agreement, complaint, restrictive practice
  - "Today's check" table of every open item, linked to its record
  - Download the evidence pack from here
- [ ] **22. Credential requirements by team** (extends 5. Staff)
  - Credential library of 25 types, including clinical sign-offs such as tracheostomy, enteral feeding, medication and manual handling
  - Each team (for example Support worker, Complex care, Leader, Office) turns on the credentials it must hold
  - Workers scored only against their teams' requirements, as a score (11/12) and a percentage
  - Credential statuses: current, lapsing, expired, missing; worker status: compliant, lapsing, not compliant, inactive
- [ ] **23. Document approval queue**
  - The assistant checks uploaded worker documents and approves the ones it can
  - The rest go to a queue for a person: worker, type, file, expiry, status, note
- [ ] **24. Automated follow-ups** *Important*
  - Unlimited follow-ups, each a rule with four parts:
    - **Data point:** any field on any record, for example a document expiry, shift start, plan review date, prospect's last contact or invoice due date
    - **Condition:** filters for who it applies to, for example "team is Support worker" or "funding is NDIS"
    - **Time:** before, on or after the data point (for example 90, 30 or 7 days before); can repeat until the condition clears
    - **Text or action:** email or SMS with template variables such as {{worker\_name}} and {{document\_type}}, create a task, notify a person, or flag the record
  - Chain several steps, for example email at 30 days, again at 7, then a task for the manager on the day
  - Templates: document expiry (90, 30, 7 days), policy review, plan or agreement review, shift reminder, prospect not contacted in 7 days, invoice overdue
  - Runs on a schedule, not only when someone clicks something
  - Editor and Runs views: each send, who it went to, sent or failed; every send logged on the record
  - The assistant can draft a follow-up from plain English; it needs approval before going live
- [ ] **25. Participant compliance standing** (extends 4. Clients)
  - Service agreement and support plan status: current, draft, ended, missing, review overdue
  - A participant counts only when both are accepted and in date; drafts don't count
  - Standing percentage on the client record; each acceptance logged
- [ ] **26. Policy library**
  - Policies grouped by registration module, with templates
  - Review dates, with overdue reviews flagged
  - A policy counts once accepted and either acknowledged by staff or linked to an accepted record
  - Staff acknowledge button on each policy
  - Missing-policy detection against the NDIS Practice Standards
- [ ] **27. Registers**
  - Logs for complaints, risks, restrictive practices, supervision, communication and finance, plus custom logs
  - A log can sit at organisation level, on every participant or worker, or on one record
  - Entries can be accepted; incidents and progress notes stay in Incidents and Notes
- [ ] **28. Internal audits**
  - Audit criteria per registration group, for example Core module (23), Implementing behaviour support plans (8), Specialised support coordination (3)
  - Start an audit run and rate each criterion; runs list with progress
  - "Review with assistant" to work through gaps
- [ ] **29. Evidence export**
  - One auditor pack: checklist, policies, participant files, registers, logs, worker documents and audit findings
  - Organisation and per-worker export as CSV or PDF
- [ ] **30. Compliance activity log**
  - Organisation-wide activity heatmap by day
  - Filter by all, admin or worker; click a day to filter
  - Table of time, event and actor, with CSV export
- [ ] **31. NDIS updates feed**
  - Policy and general NDIS updates on Up next, with date and category
  - "Ask the assistant" how each update affects this organisation
- [ ] **32. Registration settings** (extends 13. Settings)
  - NDIS registration number and registration groups (classes of support)
  - Registration groups decide which audit criteria and policies apply
  - Logo on certificates and evidence packs

## Non-negotiables

These hold for every feature, and no real participant data goes in until the first two are done.

- **Role-based access in the database:** every clinical, incident, staff and finance table checks the user's role and team, not just workspace membership, with automated tests per role
- **AI provider and data region:** chosen with a data processing agreement, Australian processing or a documented basis under Privacy Act APP 8, and no training on our data
- **Audit trail:** append-only, recording the assistant's prompts, approvals and actor for every action
- **Files:** private storage with short-lived links; who sees what is set per role
- **Engineering from day one:** project conventions in AGENTS.md, CI (lint, typecheck, tests), a typed data-access layer, tests around billing, rostering, compliance and follow-ups
- **Reviewable work:** one feature per branch, small commits, new migrations only after the starting schema, development database only
- **Before launch:** human security review and penetration test, plus breach, retention and NDIS Commission reporting procedures

## UI references (Lightfield)

These show the look and behaviour to match. REA and the live Lightfield app fill in anything not shown here.

**Assistant: empty chat with suggested prompts**

_Screenshot: Lightfield empty chat (see the brief doc for the image)_

**Assistant: working steps and an approval table**

_Screenshot: Lightfield approval flow (see the brief doc for the image)_

**Assistant: answer with inline record chips**

_Screenshot: Lightfield answer with record chips (see the brief doc for the image)_

**Assistant: completed actions with a follow-up question**

_Screenshot: Lightfield completed actions (see the brief doc for the image)_

**Record page: inline tabs, related table, details panel**

_Screenshot: Lightfield record page (see the brief doc for the image)_

**Table view with the Display menu**

_Screenshot: Lightfield table view (see the brief doc for the image)_

**Task adder popup (the model for every popup, including shifts)**

_Screenshot: Lightfield task adder popup (see the brief doc for the image)_

On Mobbin: [empty state](https://mobbin.com/screens/562ba9b2-f665-45a1-ba0f-cdee7d16b6da), [approval](https://mobbin.com/screens/99d01dcd-a6c6-4a51-8e61-b202b1fe08af), [answer](https://mobbin.com/screens/4e11b2fe-dee1-4d2d-a554-704a197c5905), [actions](https://mobbin.com/screens/5b5f4b9f-5940-47a0-845d-f6c74bac4de8), [record](https://mobbin.com/screens/b47a2904-f608-414d-ac6c-241ff0642556), [table](https://mobbin.com/screens/bda7ae7e-07e6-4029-950b-00763bef7369). The task adder screenshot is from the live Lightfield app.

## Build prompts for Cursor

Step 1 is committed to the repo. In Cursor, clone [saveaus/kisna-saas-2](https://github.com/saveaus/kisna-saas-2), follow the README to run it, then paste these one at a time, checking each before the next.

Optional helpers, worth adding once the basics work: [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) so Claude can look at Imploy and Lightfield in your logged-in Chrome ([setup](https://developer.chrome.com/docs/devtools/agents/use-cases/auto-connect)), [Mobbin MCP](https://cursor.com/marketplace/mobbin) for Lightfield screens, and [REA](https://github.com/morluto/rea).

**Step 2: login and roles**

```markdown
Read AGENTS.md and docs/brief.md (Phase 1 plan, Step 2).

Add Supabase sign-in, one workspace, and four roles: Superadmin,
Service Manager, Scheduler, Support Worker. Turn on row level security
for every table and write database rules so each role only sees what it
should, with tests for each role. Seed demo data matching the demo
records in docs/imploy-fields.md. Development database only.

Stop when I can log in as each role, and tell me how to test it.
```

**Step 3: Clients**

```markdown
Read AGENTS.md, docs/brief.md (Step 3), docs/imploy-fields.md and
docs/design-tokens.md.

Move Clients and Sites from demo data into the database, using every
field and option in docs/imploy-fields.md. Use the existing table,
record page and popup templates; don't make new styles. Build: table
with filters and saved lists, Create client popup, record page with
Overview, Notes, Files and Contacts working (other tabs stay
placeholders), the Details panel sections, the Incomplete flag and an
activity history. Respect the role rules from Step 2.

Stop when it works, and list anything you weren't sure about.
```

**Step 4: Staff**

```markdown
Read AGENTS.md, docs/brief.md (Step 4), docs/imploy-fields.md and
docs/design-tokens.md.

Move Staff from demo data into the database, using every field and
option in docs/imploy-fields.md. Same templates as Clients. Build:
table, Create staff popup, record page with Overview, Notes, Files and
Activity working (Compliance, Leave, Availability, Employment and
Finance stay placeholders), and the Details panel sections. Respect
the role rules from Step 2.

Stop when it works, and list anything you weren't sure about.
```

## Open questions

Settle these before or during Foundations; none blocks Prompt 1.

- Which AI provider and data region will the assistant use?
- Worker phone view and client portal: in scope for the first release?
- How far does the assistant go: can it submit NDIS claims and send messages after approval, or only draft them?
- Team chat (20): shared Chats list with the assistant, or separate?
- Forms run on Imploy's older app, which needs a separate login. Log in there if you want them studied.
- Imploy's Reports, Finance and roster had no demo data, so some of their sub-features are inferred from labels and settings.
