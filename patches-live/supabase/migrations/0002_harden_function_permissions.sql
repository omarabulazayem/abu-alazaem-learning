-- Harden exposed database functions after initial Supabase schema deployment.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.apply_reward_ledger() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

revoke all on function public.is_child_parent(uuid) from public, anon;
revoke all on function public.is_child_teacher(uuid) from public, anon;
grant execute on function public.is_child_parent(uuid) to authenticated;
grant execute on function public.is_child_teacher(uuid) to authenticated;

revoke all on function public.link_child_to_class(uuid, text) from public, anon;
revoke all on function public.claim_learning_reward(uuid, text, text) from public, anon;
grant execute on function public.link_child_to_class(uuid, text) to authenticated;
grant execute on function public.claim_learning_reward(uuid, text, text) to authenticated;
