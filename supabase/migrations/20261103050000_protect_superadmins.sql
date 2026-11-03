-- Phase 1, Step 4: staff can now be edited on screen. Someone with Manage Users:
-- full must not be able to change a superadmin's record, for example deactivating
-- them to take over the workspace. Everything else in this rule is unchanged.

create or replace function private.guard_staff()
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

  if tg_op = 'UPDATE' and old.role = 'superadmin' and caller is distinct from 'superadmin' then
    raise exception 'Only a superadmin can change a superadmin''s record';
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
