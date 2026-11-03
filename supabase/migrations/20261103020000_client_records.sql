-- Phase 1, Step 3: client notes, contacts, files (private storage) and the
-- activity history. Who can do what: see docs/access-model.md.
--
--   * Reading follows the client: Clients & Sites access, or being on the
--     client's team (private.can_read_client).
--   * Writing needs Clients & Sites: full access.
--   * Notes can only be edited by their author, and deleted by their author
--     or a superadmin.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function private.can_read_client(ws uuid, cid bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.can(ws, 'clients_sites', 'read') or private.on_client_team(ws, cid)
$$;

-- Workspace checks must see every row, whatever the caller's own access.
-- Before this, someone with Clients & Sites: full but no staff access couldn't
-- edit any client with a care manager, because the check couldn't see that
-- staff member. It only tests whether rows exist, so nothing is exposed.
create or replace function private.check_same_workspace()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_table_name in ('client_financials', 'client_team', 'client_notes',
                       'client_contacts', 'client_files') then
    if not exists (select 1 from public.clients c
                   where c.id = new.client_id and c.workspace_id = new.workspace_id) then
      raise exception 'Client is not in this workspace';
    end if;
  end if;
  if tg_table_name = 'client_team' then
    if not exists (select 1 from public.staff s
                   where s.id = new.staff_id and s.workspace_id = new.workspace_id) then
      raise exception 'Staff member is not in this workspace';
    end if;
  end if;
  if tg_table_name = 'clients' then
    if new.care_manager_id is not null and not exists (
      select 1 from public.staff s where s.id = new.care_manager_id and s.workspace_id = new.workspace_id
    ) or new.scheduler_id is not null and not exists (
      select 1 from public.staff s where s.id = new.scheduler_id and s.workspace_id = new.workspace_id
    ) then
      raise exception 'Care manager or scheduler is not in this workspace';
    end if;
  end if;
  if tg_table_name = 'sites' then
    if new.manager_id is not null and not exists (
      select 1 from public.staff s where s.id = new.manager_id and s.workspace_id = new.workspace_id
    ) then
      raise exception 'Manager is not in this workspace';
    end if;
  end if;
  return new;
end $$;

-- A note or contact stays on its client.
create function private.lock_client_link()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.workspace_id is distinct from old.workspace_id
     or new.client_id is distinct from old.client_id then
    raise exception 'A record cannot move to another client';
  end if;
  return new;
end $$;

-- Who wrote or uploaded something comes from the session, never the request.
-- The name is kept on the row because support workers can't read other staff.
-- With no session (service role, used by seeding) the supplied values stand.
create function private.stamp_creator()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_by_name := old.created_by_name;
    new.created_at := old.created_at;
    return new;
  end if;
  if auth.uid() is not null then
    new.created_by := auth.uid();
    new.created_by_name := coalesce(
      (select s.name from public.staff s
       where s.user_id = auth.uid() and s.workspace_id = new.workspace_id
       limit 1),
      'Unknown'
    );
    new.created_at := now();
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------------------

create table public.client_notes (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id bigint not null references public.clients (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  created_by uuid references auth.users (id) on delete set null,
  created_by_name text not null default 'System',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_notes_client_idx on public.client_notes (client_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Contacts (family, support coordinators, plan managers)
-- ---------------------------------------------------------------------------

create table public.client_contacts (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id bigint not null references public.clients (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  contact_type text not null check (contact_type in (
    'Family', 'Support Coordinator', 'Plan Manager', 'Other'
  )),
  relationship text check (char_length(relationship) <= 120),
  phone text check (char_length(phone) <= 40),
  email text check (char_length(email) <= 254),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_contacts_client_idx on public.client_contacts (client_id, name);

-- ---------------------------------------------------------------------------
-- Files: the file lives in the private client-files bucket, at
-- <workspace id>/<client id>/<random id>. This table holds what people see.
-- ---------------------------------------------------------------------------

create table public.client_files (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id bigint not null references public.clients (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 255),
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes between 0 and 26214400),
  mime_type text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_by_name text not null default 'System',
  created_at timestamptz not null default now(),
  check (storage_path like workspace_id::text || '/' || client_id::text || '/%')
);

create index client_files_client_idx on public.client_files (client_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers on the new tables
-- ---------------------------------------------------------------------------

create trigger client_notes_touch before update on public.client_notes
  for each row execute function private.touch_updated_at();
create trigger client_contacts_touch before update on public.client_contacts
  for each row execute function private.touch_updated_at();

create trigger client_notes_ws before insert or update on public.client_notes
  for each row execute function private.check_same_workspace();
create trigger client_contacts_ws before insert or update on public.client_contacts
  for each row execute function private.check_same_workspace();
create trigger client_files_ws before insert on public.client_files
  for each row execute function private.check_same_workspace();

create trigger client_notes_lock before update on public.client_notes
  for each row execute function private.lock_client_link();
create trigger client_contacts_lock before update on public.client_contacts
  for each row execute function private.lock_client_link();

create trigger client_notes_creator before insert or update on public.client_notes
  for each row execute function private.stamp_creator();
create trigger client_files_creator before insert on public.client_files
  for each row execute function private.stamp_creator();

create trigger client_notes_audit after insert or update or delete on public.client_notes
  for each row execute function private.audit();
create trigger client_contacts_audit after insert or update or delete on public.client_contacts
  for each row execute function private.audit();
create trigger client_files_audit after insert or delete on public.client_files
  for each row execute function private.audit();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.client_notes enable row level security;
alter table public.client_contacts enable row level security;
alter table public.client_files enable row level security;

create policy "read client notes" on public.client_notes
  for select to authenticated using (private.can_read_client(workspace_id, client_id));
create policy "add client notes" on public.client_notes
  for insert to authenticated with check (private.can(workspace_id, 'clients_sites', 'full'));
create policy "authors edit their notes" on public.client_notes
  for update to authenticated
  using (created_by = auth.uid() and private.can(workspace_id, 'clients_sites', 'full'))
  with check (created_by = auth.uid() and private.can(workspace_id, 'clients_sites', 'full'));
create policy "authors and superadmins delete notes" on public.client_notes
  for delete to authenticated
  using (
    (created_by = auth.uid() and private.can(workspace_id, 'clients_sites', 'full'))
    or private.my_role(workspace_id) = 'superadmin'
  );

create policy "read client contacts" on public.client_contacts
  for select to authenticated using (private.can_read_client(workspace_id, client_id));
create policy "manage client contacts" on public.client_contacts
  for all to authenticated
  using (private.can(workspace_id, 'clients_sites', 'full'))
  with check (private.can(workspace_id, 'clients_sites', 'full'));

create policy "read client files" on public.client_files
  for select to authenticated using (private.can_read_client(workspace_id, client_id));
create policy "add client files" on public.client_files
  for insert to authenticated with check (private.can(workspace_id, 'clients_sites', 'full'));
create policy "delete client files" on public.client_files
  for delete to authenticated using (private.can(workspace_id, 'clients_sites', 'full'));

-- ---------------------------------------------------------------------------
-- Private file storage. Files are only ever reached through short-lived links,
-- and these rules decide who can get a link.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-files', 'client-files', false, 26214400,
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'text/plain', 'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

-- Paths that don't look like <workspace id>/<client id>/<file> give null, which
-- every rule below treats as "no access" (rather than a failed cast).
create function private.client_file_workspace(path text)
returns uuid
language sql immutable set search_path = ''
as $$
  select case
    when path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{1,18}/[^/]+$'
    then split_part(path, '/', 1)::uuid
  end
$$;

create function private.client_file_client(path text)
returns bigint
language sql immutable set search_path = ''
as $$
  select case
    when path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{1,18}/[^/]+$'
    then split_part(path, '/', 2)::bigint
  end
$$;

create policy "client files: read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-files'
    and private.can_read_client(private.client_file_workspace(name), private.client_file_client(name))
  );
create policy "client files: upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'client-files'
    and private.can(private.client_file_workspace(name), 'clients_sites', 'full')
  );
create policy "client files: delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'client-files'
    and private.can(private.client_file_workspace(name), 'clients_sites', 'full')
  );

-- ---------------------------------------------------------------------------
-- Activity history
-- ---------------------------------------------------------------------------

-- Which client each audit entry is about, so a client's history can be found
-- even for a change to one of its notes or contacts. No foreign key: the
-- history outlives the client.
alter table public.audit_log add column client_id bigint;

update public.audit_log
set client_id = record_id::bigint
where table_name in ('clients', 'client_financials', 'client_team')
  and record_id ~ '^[0-9]{1,18}$';

create index audit_log_client_idx on public.audit_log (client_id, at desc)
  where client_id is not null;

-- Also keeps a copy of a row when it's deleted, so the history says what went.
create or replace function private.audit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  row_data jsonb;
  rec_id text;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  rec_id := coalesce(row_data ->> 'id', row_data ->> 'client_id',
                     concat_ws(':', row_data ->> 'role', row_data ->> 'area'));
  insert into public.audit_log (workspace_id, actor, table_name, record_id, action, changes, client_id)
  values (
    (row_data ->> 'workspace_id')::uuid,
    auth.uid(),
    tg_table_name,
    rec_id,
    tg_op,
    case
      when tg_op = 'UPDATE' then (
        select jsonb_object_agg(n.key, n.value)
        from jsonb_each(to_jsonb(new)) n
        where n.value is distinct from (to_jsonb(old) -> n.key)
          and n.key not in ('updated_at')
      )
      else row_data
    end,
    case
      when tg_table_name = 'clients' then (row_data ->> 'id')::bigint
      else (row_data ->> 'client_id')::bigint
    end
  );
  return null;
end $$;

-- The audit log itself stays superadmin-only. Everyone who can see a client gets
-- this summary instead: who, when and which fields, but never the values. Bank
-- detail changes only show for people with Finance access.
create function public.client_activity(cid bigint, max_rows integer default 50)
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
         where a.table_name = 'client_contacts' and ct.id::text = a.record_id)
      )
    end
  from public.clients c
  join public.audit_log a on a.client_id = c.id and a.workspace_id = c.workspace_id
  where c.id = cid
    and private.can_read_client(c.workspace_id, c.id)
    and (a.table_name <> 'client_financials' or private.can(c.workspace_id, 'finance', 'read'))
    and not (a.action = 'UPDATE' and coalesce(a.changes, '{}'::jsonb) = '{}'::jsonb)
  order by a.at desc, a.id desc
  limit least(greatest(coalesce(max_rows, 50), 1), 200)
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on public.client_notes, public.client_contacts, public.client_files from anon;
grant select, insert, update, delete on public.client_notes, public.client_contacts to authenticated;
grant select, insert, delete on public.client_files to authenticated;

revoke all on function public.client_activity(bigint, integer) from public, anon;
grant execute on function public.client_activity(bigint, integer) to authenticated;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
