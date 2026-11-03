-- Phase 1, Step 2: workspaces, staff with roles, clients, sites, permissions,
-- audit log, and row level security on every table.
--
-- Access model (see docs/access-model.md):
--   * A user belongs to a workspace through their staff row (staff.user_id).
--   * staff.role is one of Imploy's four roles. Superadmin always has full access.
--   * Other roles get none / read / full per area from role_permissions.
--   * Support workers can also read clients they're on the team of.
--   * Every check runs in the database, so the API can't be used to go around it.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.staff_role as enum (
  'superadmin',
  'service_manager',
  'scheduler',
  'support_worker'
);

-- Order matters: none < read < full
create type public.access_level as enum ('none', 'read', 'full');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  trading_name text,
  abn text,
  ndis_registration_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff (
  id bigint generated always as identity (start with 1300) primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  role public.staff_role not null default 'support_worker',
  employment_type text not null default 'Employee'
    check (employment_type in ('Employee', 'Contractor')),
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  email text not null check (char_length(email) between 3 and 254),
  phone text,
  address text,
  preferred_name text,
  gender text,
  nationality text[] not null default '{}',
  date_of_birth date,
  ec_name text,
  ec_relationship text,
  ec_primary_phone text,
  ec_alt_phone text,
  ec_email text,
  ec_address text,
  abn text,
  trading_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id),
  unique (workspace_id, email)
);

create index staff_user_idx on public.staff (user_id);

create table public.clients (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  -- Client information
  email text,
  phone text,
  address text,
  language text,
  secondary_languages text[] not null default '{}',
  gender text,
  date_of_birth date,
  start_date date,
  -- Funding information
  funding_type text not null check (funding_type in (
    'NDIS', 'HCP', 'Support at Home', 'Transitioned HCP', 'Grandfathered HCP', 'Private'
  )),
  ndis_type text check (ndis_type in (
    'NDIS Self Managed', 'NDIS Agency Managed', 'NDIS Plan Managed', 'Private Client'
  )),
  classification text check (classification in (
    'Remote', 'Non-Remote',
    'Remote Aboriginal or Torres Strait Islander',
    'Non-Remote Aboriginal or Torres Strait Islander'
  )),
  ndis_number text,
  level text,
  referral_code text,
  acn text,
  payment_number text,
  care_recipient_id text,
  pension_status text,
  crn text,
  reference text,
  everyday_living numeric(5, 2) check (everyday_living between 0 and 100),
  independence numeric(5, 2) check (independence between 0 and 100),
  -- Team and preferences
  care_manager_id bigint references public.staff (id) on delete set null,
  scheduler_id bigint references public.staff (id) on delete set null,
  shift_notes_template text,
  -- Medical and notes
  allergies text[] not null default '{}',
  general_notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_workspace_idx on public.clients (workspace_id, name);

-- Bank and ITF details are kept apart so only finance roles can read them.
create table public.client_financials (
  client_id bigint primary key references public.clients (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  bank_name text,
  bsb text,
  account_number text,
  itf_status text,
  itf_value text,
  updated_at timestamptz not null default now()
);

-- Who works with a client. Drives what support workers can see.
create table public.client_team (
  client_id bigint not null references public.clients (id) on delete cascade,
  staff_id bigint not null references public.staff (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind text not null default 'team' check (kind in ('team', 'preferred', 'do_not_send')),
  primary key (client_id, staff_id)
);

create index client_team_staff_idx on public.client_team (staff_id);

create table public.sites (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  email text,
  phone text,
  address text,
  site_type text,
  capacity integer check (capacity >= 0),
  maximum_staff integer check (maximum_staff >= 0),
  split_count integer check (split_count >= 0),
  manager_id bigint references public.staff (id) on delete set null,
  last_inspection date,
  next_inspection date,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-workspace permission matrix (Imploy: Settings → Permissions).
create table public.role_permissions (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  role public.staff_role not null check (role <> 'superadmin'),
  area text not null check (area in (
    'clients_sites', 'staff', 'scheduler', 'finance', 'compliance', 'incidents',
    'reports', 'settings', 'tasks', 'prospects', 'documents', 'forms',
    'suppliers', 'chat'
  )),
  level public.access_level not null default 'none',
  primary key (workspace_id, role, area)
);

-- Append-only record of every change. Written by triggers, never by the app.
create table public.audit_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor uuid,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changes jsonb,
  at timestamptz not null default now()
);

create index audit_log_workspace_idx on public.audit_log (workspace_id, at desc);

-- ---------------------------------------------------------------------------
-- Private helpers (not exposed through the API)
-- ---------------------------------------------------------------------------

create schema if not exists private;

create function private.my_role(ws uuid)
returns public.staff_role
language sql stable security definer set search_path = ''
as $$
  select s.role from public.staff s
  where s.workspace_id = ws and s.user_id = auth.uid() and s.status = 'Active'
  limit 1
$$;

create function private.my_staff_id(ws uuid)
returns bigint
language sql stable security definer set search_path = ''
as $$
  select s.id from public.staff s
  where s.workspace_id = ws and s.user_id = auth.uid() and s.status = 'Active'
  limit 1
$$;

create function private.is_member(ws uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select private.my_role(ws) is not null $$;

create function private.can(ws uuid, area_name text, needed public.access_level)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when private.my_role(ws) is null then false
    when private.my_role(ws) = 'superadmin' then true
    else coalesce((
      select rp.level from public.role_permissions rp
      where rp.workspace_id = ws
        and rp.role = private.my_role(ws)
        and rp.area = area_name
    ), 'none') >= needed
  end
$$;

create function private.on_client_team(ws uuid, cid bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.my_staff_id(ws) is not null and (
    exists (
      select 1 from public.clients c
      where c.id = cid and c.workspace_id = ws
        and private.my_staff_id(ws) in (c.care_manager_id, c.scheduler_id)
    )
    or exists (
      select 1 from public.client_team t
      where t.client_id = cid and t.workspace_id = ws
        and t.staff_id = private.my_staff_id(ws)
        and t.kind <> 'do_not_send'
    )
  )
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function private.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

create trigger workspaces_touch before update on public.workspaces
  for each row execute function private.touch_updated_at();
create trigger staff_touch before update on public.staff
  for each row execute function private.touch_updated_at();
create trigger clients_touch before update on public.clients
  for each row execute function private.touch_updated_at();
create trigger client_financials_touch before update on public.client_financials
  for each row execute function private.touch_updated_at();
create trigger sites_touch before update on public.sites
  for each row execute function private.touch_updated_at();

-- Child rows must belong to the same workspace as their parent.
create function private.check_same_workspace()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_table_name in ('client_financials', 'client_team') then
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

create trigger client_financials_ws before insert or update on public.client_financials
  for each row execute function private.check_same_workspace();
create trigger client_team_ws before insert or update on public.client_team
  for each row execute function private.check_same_workspace();
create trigger clients_ws before insert or update on public.clients
  for each row execute function private.check_same_workspace();
create trigger sites_ws before insert or update on public.sites
  for each row execute function private.check_same_workspace();

-- Workspace never changes on a row.
create function private.lock_workspace()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'workspace_id cannot change';
  end if;
  return new;
end $$;

create trigger staff_lock_ws before update on public.staff
  for each row execute function private.lock_workspace();
create trigger clients_lock_ws before update on public.clients
  for each row execute function private.lock_workspace();
create trigger sites_lock_ws before update on public.sites
  for each row execute function private.lock_workspace();

-- Only a superadmin can grant or remove superadmin, or link a login.
-- The last active superadmin can't be removed.
create function private.guard_staff()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  caller public.staff_role := private.my_role(new.workspace_id);
begin
  -- Service role (no auth.uid) is trusted: used by seeding and invites.
  if auth.uid() is null then
    return new;
  end if;

  -- First member of a brand-new workspace (create_workspace) becomes superadmin.
  if tg_op = 'INSERT' and not exists (
    select 1 from public.staff s where s.workspace_id = new.workspace_id
  ) then
    return new;
  end if;

  if (tg_op = 'INSERT' and new.role = 'superadmin')
     or (tg_op = 'UPDATE' and (new.role = 'superadmin') <> (old.role = 'superadmin')) then
    if caller is distinct from 'superadmin' then
      raise exception 'Only a superadmin can grant or remove superadmin';
    end if;
  end if;

  if (tg_op = 'INSERT' and new.user_id is not null)
     or (tg_op = 'UPDATE' and new.user_id is distinct from old.user_id) then
    if caller is distinct from 'superadmin' then
      raise exception 'Only a superadmin can link a login to a staff member';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.role = 'superadmin' and old.status = 'Active'
     and (new.role <> 'superadmin' or new.status <> 'Active') then
    if (select count(*) from public.staff s
        where s.workspace_id = old.workspace_id and s.role = 'superadmin'
          and s.status = 'Active') <= 1 then
      raise exception 'A workspace needs at least one active superadmin';
    end if;
  end if;

  return new;
end $$;

create trigger staff_guard before insert or update on public.staff
  for each row execute function private.guard_staff();

-- Audit log writer.
create function private.audit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  row_data jsonb;
  rec_id text;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  rec_id := coalesce(row_data ->> 'id', row_data ->> 'client_id',
                     concat_ws(':', row_data ->> 'role', row_data ->> 'area'));
  insert into public.audit_log (workspace_id, actor, table_name, record_id, action, changes)
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
      when tg_op = 'INSERT' then row_data
      else null
    end
  );
  return null;
end $$;

create trigger staff_audit after insert or update or delete on public.staff
  for each row execute function private.audit();
create trigger clients_audit after insert or update or delete on public.clients
  for each row execute function private.audit();
create trigger client_financials_audit after insert or update or delete on public.client_financials
  for each row execute function private.audit();
create trigger client_team_audit after insert or update or delete on public.client_team
  for each row execute function private.audit();
create trigger sites_audit after insert or update or delete on public.sites
  for each row execute function private.audit();
create trigger role_permissions_audit after insert or update or delete on public.role_permissions
  for each row execute function private.audit();

-- ---------------------------------------------------------------------------
-- Creating a workspace (signed-in user becomes its superadmin)
-- ---------------------------------------------------------------------------

create function public.create_workspace(workspace_name text, my_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  ws uuid;
  my_email text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  select u.email into my_email from auth.users u where u.id = auth.uid();

  insert into public.workspaces (name) values (workspace_name) returning id into ws;

  insert into public.staff (workspace_id, user_id, name, role, email)
  values (ws, auth.uid(), my_name, 'superadmin', coalesce(my_email, 'unknown@example.com'));

  -- Default permissions, based on Imploy's defaults. Superadmin can change them.
  insert into public.role_permissions (workspace_id, role, area, level)
  select ws, r.role, r.area, r.level::public.access_level
  from (values
    ('service_manager'::public.staff_role, 'clients_sites', 'full'),
    ('service_manager', 'staff', 'full'),
    ('service_manager', 'scheduler', 'full'),
    ('service_manager', 'finance', 'read'),
    ('service_manager', 'compliance', 'full'),
    ('service_manager', 'incidents', 'full'),
    ('service_manager', 'reports', 'read'),
    ('service_manager', 'settings', 'none'),
    ('service_manager', 'tasks', 'full'),
    ('service_manager', 'prospects', 'full'),
    ('service_manager', 'documents', 'full'),
    ('service_manager', 'forms', 'full'),
    ('service_manager', 'suppliers', 'full'),
    ('service_manager', 'chat', 'full'),
    ('scheduler', 'clients_sites', 'read'),
    ('scheduler', 'staff', 'read'),
    ('scheduler', 'scheduler', 'full'),
    ('scheduler', 'finance', 'none'),
    ('scheduler', 'compliance', 'read'),
    ('scheduler', 'incidents', 'read'),
    ('scheduler', 'reports', 'none'),
    ('scheduler', 'settings', 'none'),
    ('scheduler', 'tasks', 'full'),
    ('scheduler', 'prospects', 'none'),
    ('scheduler', 'documents', 'read'),
    ('scheduler', 'forms', 'read'),
    ('scheduler', 'suppliers', 'none'),
    ('scheduler', 'chat', 'full'),
    ('support_worker', 'clients_sites', 'none'),
    ('support_worker', 'staff', 'none'),
    ('support_worker', 'scheduler', 'none'),
    ('support_worker', 'finance', 'none'),
    ('support_worker', 'compliance', 'none'),
    ('support_worker', 'incidents', 'none'),
    ('support_worker', 'reports', 'none'),
    ('support_worker', 'settings', 'none'),
    ('support_worker', 'tasks', 'read'),
    ('support_worker', 'prospects', 'none'),
    ('support_worker', 'documents', 'read'),
    ('support_worker', 'forms', 'none'),
    ('support_worker', 'suppliers', 'none'),
    ('support_worker', 'chat', 'full')
  ) as r(role, area, level);

  return ws;
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.workspaces enable row level security;
alter table public.staff enable row level security;
alter table public.clients enable row level security;
alter table public.client_financials enable row level security;
alter table public.client_team enable row level security;
alter table public.sites enable row level security;
alter table public.role_permissions enable row level security;
alter table public.audit_log enable row level security;

-- Workspaces
create policy "members read their workspace" on public.workspaces
  for select to authenticated using (private.is_member(id));
create policy "settings managers update workspace" on public.workspaces
  for update to authenticated
  using (private.can(id, 'settings', 'full'))
  with check (private.can(id, 'settings', 'full'));

-- Staff: staff readers see everyone; everyone sees their own row.
create policy "read staff" on public.staff
  for select to authenticated
  using (private.can(workspace_id, 'staff', 'read') or user_id = auth.uid());
create policy "add staff" on public.staff
  for insert to authenticated
  with check (private.can(workspace_id, 'staff', 'full'));
create policy "edit staff" on public.staff
  for update to authenticated
  using (private.can(workspace_id, 'staff', 'full'))
  with check (private.can(workspace_id, 'staff', 'full'));
-- No delete: set status to Inactive instead.

-- Clients: client readers see all; team members see their own clients.
create policy "read clients" on public.clients
  for select to authenticated
  using (private.can(workspace_id, 'clients_sites', 'read')
         or private.on_client_team(workspace_id, id));
create policy "add clients" on public.clients
  for insert to authenticated
  with check (private.can(workspace_id, 'clients_sites', 'full'));
create policy "edit clients" on public.clients
  for update to authenticated
  using (private.can(workspace_id, 'clients_sites', 'full'))
  with check (private.can(workspace_id, 'clients_sites', 'full'));
create policy "superadmin deletes clients" on public.clients
  for delete to authenticated
  using (private.my_role(workspace_id) = 'superadmin');

-- Client financial details: finance roles only.
create policy "read client financials" on public.client_financials
  for select to authenticated using (private.can(workspace_id, 'finance', 'read'));
create policy "add client financials" on public.client_financials
  for insert to authenticated with check (private.can(workspace_id, 'finance', 'full'));
create policy "edit client financials" on public.client_financials
  for update to authenticated
  using (private.can(workspace_id, 'finance', 'full'))
  with check (private.can(workspace_id, 'finance', 'full'));

-- Client team
create policy "read client team" on public.client_team
  for select to authenticated
  using (private.can(workspace_id, 'clients_sites', 'read')
         or staff_id = private.my_staff_id(workspace_id));
create policy "manage client team" on public.client_team
  for all to authenticated
  using (private.can(workspace_id, 'clients_sites', 'full'))
  with check (private.can(workspace_id, 'clients_sites', 'full'));

-- Sites
create policy "read sites" on public.sites
  for select to authenticated using (private.can(workspace_id, 'clients_sites', 'read'));
create policy "add sites" on public.sites
  for insert to authenticated with check (private.can(workspace_id, 'clients_sites', 'full'));
create policy "edit sites" on public.sites
  for update to authenticated
  using (private.can(workspace_id, 'clients_sites', 'full'))
  with check (private.can(workspace_id, 'clients_sites', 'full'));

-- Permissions: members can read the matrix; only superadmin changes it.
create policy "members read permissions" on public.role_permissions
  for select to authenticated using (private.is_member(workspace_id));
create policy "superadmin manages permissions" on public.role_permissions
  for all to authenticated
  using (private.my_role(workspace_id) = 'superadmin')
  with check (private.my_role(workspace_id) = 'superadmin');

-- Audit log: superadmin reads; nobody writes through the API.
create policy "superadmin reads audit log" on public.audit_log
  for select to authenticated using (private.my_role(workspace_id) = 'superadmin');

-- ---------------------------------------------------------------------------
-- Grants: nothing for anonymous users; signed-in users go through RLS.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on public.audit_log from authenticated;
grant select on public.audit_log to authenticated;
grant select, insert, update on public.workspaces, public.staff, public.sites,
  public.client_financials to authenticated;
grant select, insert, update, delete on public.clients, public.client_team,
  public.role_permissions to authenticated;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

revoke all on function public.create_workspace(text, text) from public, anon;
grant execute on function public.create_workspace(text, text) to authenticated;
