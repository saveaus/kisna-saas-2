-- Saved table views (Lightfield-style view tabs). Personal to each user.

create table public.saved_views (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  object text not null check (object in ('clients', 'staff', 'sites')),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  filters jsonb not null default '[]' check (jsonb_typeof(filters) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_views_owner_idx on public.saved_views (user_id, workspace_id, object);

create trigger saved_views_touch before update on public.saved_views
  for each row execute function private.touch_updated_at();
create trigger saved_views_lock_ws before update on public.saved_views
  for each row execute function private.lock_workspace();

alter table public.saved_views enable row level security;

create policy "own views" on public.saved_views
  for all to authenticated
  using (user_id = auth.uid() and private.is_member(workspace_id))
  with check (user_id = auth.uid() and private.is_member(workspace_id));

grant select, insert, update, delete on public.saved_views to authenticated;
