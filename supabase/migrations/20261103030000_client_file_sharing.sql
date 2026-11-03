-- Phase 1, Step 3: support workers only see a client's files once someone has
-- shared them. New files start private. Anyone with Clients & Sites read access
-- still sees every file; sharing is only about support workers on the team.
--
-- This is about who inside the workspace can see a file. Stored files stay
-- private either way, and are only reached through short-lived links.

alter table public.client_files
  add column shared_with_team boolean not null default false;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function private.can_read_client_file(ws uuid, cid bigint, shared boolean)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.can(ws, 'clients_sites', 'read')
    or (shared and private.on_client_team(ws, cid))
$$;

-- The stored file follows its row. A file with no row yet (mid-upload) can only
-- be seen by people with Clients & Sites read access.
create function private.can_open_stored_client_file(path text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.can(private.client_file_workspace(path), 'clients_sites', 'read')
    or exists (
      select 1 from public.client_files f
      where f.storage_path = path
        and f.shared_with_team
        and f.workspace_id = private.client_file_workspace(path)
        and f.client_id = private.client_file_client(path)
        and private.on_client_team(f.workspace_id, f.client_id)
    )
$$;

-- ---------------------------------------------------------------------------
-- Access rules
-- ---------------------------------------------------------------------------

drop policy "read client files" on public.client_files;
create policy "read client files" on public.client_files
  for select to authenticated
  using (private.can_read_client_file(workspace_id, client_id, shared_with_team));

create policy "change client file sharing" on public.client_files
  for update to authenticated
  using (private.can(workspace_id, 'clients_sites', 'full'))
  with check (private.can(workspace_id, 'clients_sites', 'full'));

-- Sharing is the only thing that can change once a file is uploaded.
grant update (shared_with_team) on public.client_files to authenticated;

drop policy "client files: read" on storage.objects;
create policy "client files: read" on storage.objects
  for select to authenticated
  using (bucket_id = 'client-files' and private.can_open_stored_client_file(name));

-- ---------------------------------------------------------------------------
-- History: record sharing changes, and don't reveal private files
-- ---------------------------------------------------------------------------

drop trigger client_files_audit on public.client_files;
create trigger client_files_audit after insert or update or delete on public.client_files
  for each row execute function private.audit();

-- As before, plus: support workers only get entries for files shared with them
-- right now, so a private file's name (or that it exists) never reaches them.
create or replace function public.client_activity(cid bigint, max_rows integer default 50)
returns table (
  id bigint,
  happened_at timestamptz,
  actor_name text,
  table_name text,
  action text,
  changed_fields text[],
  label text
)
language sql stable security definer set search_path = ''
as $$
  select
    a.id,
    a.at,
    case
      when a.actor is null then 'System'
      else coalesce(
        (select s.name from public.staff s
         where s.user_id = a.actor and s.workspace_id = a.workspace_id
         limit 1),
        'Former staff member'
      )
    end,
    a.table_name,
    a.action,
    case
      when a.action = 'UPDATE' then array(select jsonb_object_keys(a.changes))
      else '{}'::text[]
    end,
    case
      when a.table_name in ('client_contacts', 'client_files') then coalesce(
        a.changes ->> 'name',
        (select ct.name from public.client_contacts ct
         where a.table_name = 'client_contacts' and ct.id::text = a.record_id),
        (select f.name from public.client_files f
         where a.table_name = 'client_files' and f.id::text = a.record_id)
      )
    end
  from public.clients c
  join public.audit_log a on a.client_id = c.id and a.workspace_id = c.workspace_id
  where c.id = cid
    and private.can_read_client(c.workspace_id, c.id)
    and (a.table_name <> 'client_financials' or private.can(c.workspace_id, 'finance', 'read'))
    and (
      a.table_name <> 'client_files'
      or private.can(c.workspace_id, 'clients_sites', 'read')
      or exists (
        select 1 from public.client_files f
        where f.id::text = a.record_id and f.client_id = c.id and f.shared_with_team
      )
    )
    and not (a.action = 'UPDATE' and coalesce(a.changes, '{}'::jsonb) = '{}'::jsonb)
  order by a.at desc, a.id desc
  limit least(greatest(coalesce(max_rows, 50), 1), 200)
$$;

-- ---------------------------------------------------------------------------
-- Grants on the new helpers
-- ---------------------------------------------------------------------------

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
