# Access model

Who can see and change what. The rules live in the database
(`supabase/migrations/20261103000000_foundation.sql`) as row level security,
so they hold even if someone calls the Supabase API directly. The app only
hides buttons and menu items to match.

Tests: `npm test` runs `supabase/tests/access.test.ts`, which signs in as each
role and checks what the database allows.

## How a user gets access

- A login (Supabase auth user) belongs to a workspace through a **staff**
  record with `user_id` set to that login.
- The staff record's **role** is one of Imploy's four: Superadmin, Service
  Manager, Scheduler, Service Delivery Worker (`support_worker`).
- Only **active** staff have access. Setting a staff member to Inactive
  removes their access straight away.
- Signing up creates a workspace and makes you its Superadmin
  (`create_workspace`). Other people are added under Staff and invited by a
  Superadmin.

## Permissions

Superadmin always has full access. Every other role has **No access**,
**Read only** or **Full access** per area, set in Settings → Permissions
(stored in `role_permissions`). Defaults, based on Imploy:

| Area | Service Manager | Scheduler | Service Delivery Worker |
| --- | --- | --- | --- |
| Clients & Sites | Full | Read | None (own clients only, see below) |
| Manage Users (staff) | Full | Read | None (own record only) |
| Scheduler | Full | Full | None |
| Finance (incl. client bank details) | Read | None | None |
| Compliance | Full | Read | None |
| Incidents | Full | Read | None |
| Reports | Read | None | None |
| Settings | None | None | None |
| Tasks | Full | Full | Read |
| Prospects | Full | None | None |
| Company Documents | Full | Read | Read |
| Forms | Full | Read | None |
| Suppliers | Full | None | None |
| Chat | Full | Full | Full |

Areas without features yet (scheduler, compliance…) are in place so later
phases plug straight in.

## Special rules

- **Support workers see only their clients**: clients where they're the care
  manager or scheduler, or on the client's team (`client_team`), unless
  they're marked Do Not Send.
- **Everyone sees their own staff record.**
- **Bank and ITF details** sit in `client_financials` and need Finance access.
- **Only a Superadmin** can grant or remove Superadmin, link a login to a
  staff record (invites), change permissions, delete clients, or read the
  audit log.
- **A workspace always keeps at least one active Superadmin.**
- **Workspaces are fully separate.** Child records (team, financials, care
  manager, site manager) must belong to the same workspace.
- **Audit log**: every change to staff, clients, client team, financials,
  sites and permissions is recorded by the database. Nobody, not even a
  Superadmin, can edit or delete it through the API.
- **Anonymous visitors** get nothing.

## The service-role key

`SUPABASE_SERVICE_ROLE_KEY` bypasses all of the above. It's only used:

- by `npm run seed` to create demo logins, and
- by the "Send invite" action, after checking the caller is a Superadmin.

Keep it in `.env.local` only. Never use it in client code.
