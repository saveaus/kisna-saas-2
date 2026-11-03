# Access model

Who can see and change what. The rules live in the database
(`supabase/migrations/20261103000000_foundation.sql`) as row level security,
so they hold even if someone calls the Supabase API directly. The app only
hides buttons and menu items to match.

Tests: `npm test` runs `supabase/tests/access.test.ts`, which signs in as each
role and checks what the database allows.

Step 3's rules are in `20261103020000_client_records.sql` and
`20261103030000_client_file_sharing.sql`, tested in
`supabase/tests/client-records.test.ts`.

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
- **Only a Superadmin** can grant or remove Superadmin, change a Superadmin's
  record, link a login to a staff record (invites), change permissions, delete
  clients, or read the audit log.
- **Nobody can change their own role or status**, so they can't lock themselves
  out by accident. A sign-in email can't be changed on the staff record yet.
- **A workspace always keeps at least one active Superadmin.**
- **Workspaces are fully separate.** Child records (team, financials, care
  manager, site manager) must belong to the same workspace.
- **Audit log**: every change to staff, clients, client team, financials,
  sites and permissions is recorded by the database. Nobody, not even a
  Superadmin, can edit or delete it through the API.
- **Anonymous visitors** get nothing.

## Client notes, contacts, files and activity

Notes, contacts and activity follow the client: if you can see a client, you can
see these. Files are the exception: support workers only see files shared with
them. Changing anything needs Clients & Sites: Full. With the default permissions:

| | Superadmin | Service Manager | Scheduler | Support worker (own clients) |
| --- | --- | --- | --- | --- |
| Read notes and contacts, see activity | Yes | Yes | Yes | Yes |
| Open files | All | All | All | Only shared files |
| Add notes, change contacts, upload, share or delete files | Yes | Yes | No | No |
| Edit a note | Their own | Their own | No | No |
| Delete a note | Any | Their own | No | No |

- **Who wrote a note or uploaded a file** comes from the session, never the
  request, and can't be changed afterwards.
- **Files** live in a private bucket (`client-files`, 25 MB per file, no web
  pages or scripts). They're only reached through a link that lasts one minute,
  made per click after access is checked. The rules apply to the stored file as
  well as its row.
- **Sharing a file** (Files tab → Share) lets support workers on that client's
  team open it. New files start private. "Shared" only means shared inside the
  workspace: nothing is ever on the public internet. Sharing is the only thing
  that can change about a file after upload.
- **Activity** is a summary of the audit log (`client_activity`): who, when and
  which fields, never the values. Bank detail changes only show for people with
  Finance access, and support workers only see entries for files currently shared
  with them. The audit log itself stays Superadmin-only, and now keeps a copy of
  anything deleted.
- **Preferred staff can see the client.** Do Not Send removes access. Removing
  someone from either list ends their access to that client.

## The service-role key

`SUPABASE_SERVICE_ROLE_KEY` bypasses all of the above. It's only used:

- by `npm run seed` to create demo logins, link the demo superadmin to the
  workspace and add demo saved views, and
- by the "Send invite" action, after checking the caller is a Superadmin.

Keep it in `.env.local` only. Never use it in client code.
