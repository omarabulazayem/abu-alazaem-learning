-- Move child avatar storage away from emoji defaults so the visual layer can use SVG/media assets.
-- Existing client versions may still submit the historical emoji; normalize it at the database boundary.

alter table public.child_profiles alter column avatar drop default;
alter table public.child_profiles alter column avatar drop not null;

update public.child_profiles set avatar=null where avatar in ('🧒🏻','🧒','👦','👧');

create or replace function public.normalize_child_avatar()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.avatar in ('🧒🏻','🧒','👦','👧') or trim(coalesce(new.avatar,''))='' then
    new.avatar := null;
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_child_avatar_trigger on public.child_profiles;
create trigger normalize_child_avatar_trigger
before insert or update of avatar on public.child_profiles
for each row execute function public.normalize_child_avatar();
