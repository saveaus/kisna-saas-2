-- Supabase gives anon, authenticated and service_role every privilege on every
-- new table in public, including TRUNCATE, which row level security doesn't
-- stop. Sets exactly what each role needs instead, and stops new tables being
-- opened up automatically: forgetting a grant now fails loudly rather than
-- quietly leaving a table too open.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

revoke all on all tables in schema public from anon, authenticated, service_role;

-- Signed-in users. Row level security still decides which rows.
grant select, insert, update on
  public.workspaces, public.staff, public.sites, public.client_financials
  to authenticated;
grant select, insert, update, delete on
  public.clients, public.client_team, public.role_permissions, public.saved_views,
  public.client_notes, public.client_contacts
  to authenticated;
grant select on public.audit_log to authenticated;

-- Sharing is the only thing that can change once a file is uploaded.
grant select, insert, delete on public.client_files to authenticated;
grant update (shared_with_team) on public.client_files to authenticated;

-- The service role, used by the seed script and invites. It stays read-only on
-- the audit log, which only triggers write to.
grant select, insert, update, delete on
  public.workspaces, public.staff, public.clients, public.client_financials,
  public.client_team, public.sites, public.role_permissions, public.saved_views,
  public.client_notes, public.client_contacts, public.client_files
  to service_role;
grant select on public.audit_log to service_role;
