-- Extend automatic first-child creation during parent signup with the new
-- durable child profile fields. Existing users are left untouched.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_type text;
  v_display_name text;
  v_child_name text;
  v_child_age_band text;
  v_child_age_years integer;
  v_child_gender text;
begin
  v_account_type := coalesce(new.raw_user_meta_data->>'account_type', 'parent');
  if v_account_type not in ('parent','teacher') then
    v_account_type := 'parent';
  end if;

  v_display_name := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'مستخدم'
  );

  insert into public.profiles(id, display_name, account_type)
  values (new.id, v_display_name, v_account_type)
  on conflict (id) do update
    set display_name = excluded.display_name;

  if v_account_type = 'parent' then
    v_child_name := nullif(new.raw_user_meta_data->>'child_name', '');
    v_child_age_band := coalesce(nullif(new.raw_user_meta_data->>'child_age_band', ''), '7-9');
    if v_child_age_band not in ('3-6','7-9','10-12') then
      v_child_age_band := '7-9';
    end if;

    begin
      v_child_age_years := nullif(new.raw_user_meta_data->>'child_age_years', '')::integer;
    exception when others then
      v_child_age_years := null;
    end;
    if v_child_age_years is not null and (v_child_age_years < 3 or v_child_age_years > 18) then
      v_child_age_years := null;
    end if;

    v_child_gender := coalesce(nullif(new.raw_user_meta_data->>'child_gender', ''), 'unspecified');
    if v_child_gender not in ('male','female','unspecified') then
      v_child_gender := 'unspecified';
    end if;

    if v_child_name is not null and not exists (
      select 1 from public.child_profiles where parent_id = new.id
    ) then
      insert into public.child_profiles(parent_id, display_name, age_band, age_years, gender)
      values (new.id, v_child_name, v_child_age_band, v_child_age_years, v_child_gender);
    end if;
  end if;

  return new;
end;
$$;
