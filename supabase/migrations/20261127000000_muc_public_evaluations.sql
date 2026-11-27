alter table public.muc_shared_evaluations
  alter column teacher_email drop not null,
  add column is_public boolean not null default false,
  add constraint muc_public_has_no_recipient check (not is_public or teacher_email is null);

create function public.muc_public_evaluations()
returns table (id uuid, evaluation jsonb, thresholds jsonb, shared_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select entry.id, entry.evaluation, entry.thresholds, entry.shared_at
  from public.muc_shared_evaluations entry
  where entry.is_public
  order by entry.shared_at desc;
$$;

revoke all on function public.muc_public_evaluations() from public;
grant execute on function public.muc_public_evaluations() to anon, authenticated;
