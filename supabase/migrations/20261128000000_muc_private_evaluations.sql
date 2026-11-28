create table public.muc_private_evaluations (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  saved_at timestamptz not null default now(),
  evaluation jsonb,
  thresholds jsonb,
  primary key (owner_id, id),
  check ((evaluation is null and thresholds is null) or
    (evaluation is not null and thresholds is not null and
      jsonb_typeof(evaluation) = 'object' and jsonb_typeof(thresholds) = 'object'))
);

alter table public.muc_private_evaluations enable row level security;
revoke all on public.muc_private_evaluations from public, anon, authenticated;
grant select, insert, update on public.muc_private_evaluations to authenticated;

create policy "Trainers read their own evaluations"
on public.muc_private_evaluations for select to authenticated
using (owner_id = (select auth.uid()) and (select public.muc_is_trainer()));

create policy "Trainers insert their own evaluations"
on public.muc_private_evaluations for insert to authenticated
with check (owner_id = (select auth.uid()) and (select public.muc_is_trainer()));

create policy "Trainers update their own evaluations"
on public.muc_private_evaluations for update to authenticated
using (owner_id = (select auth.uid()) and (select public.muc_is_trainer()))
with check (owner_id = (select auth.uid()) and (select public.muc_is_trainer()));

create function public.muc_prevent_evaluation_restore()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise insufficient_privilege using message = 'This evaluation has been deleted.';
end;
$$;

revoke all on function public.muc_prevent_evaluation_restore() from public, anon, authenticated;

create trigger muc_deleted_evaluations_are_immutable
before update on public.muc_private_evaluations
for each row when (old.evaluation is null)
execute function public.muc_prevent_evaluation_restore();

create function public.muc_import_trainer_evaluations(evaluations jsonb, expected_owner uuid)
returns void
language sql security invoker
set search_path = ''
as $$
  insert into public.muc_private_evaluations as stored (owner_id, id, saved_at, evaluation, thresholds)
  select expected_owner, id, saved_at, evaluation, thresholds
  from jsonb_to_recordset(evaluations) as incoming (id uuid, saved_at timestamptz, evaluation jsonb, thresholds jsonb)
  on conflict (owner_id, id) do update
    set saved_at = excluded.saved_at, evaluation = excluded.evaluation, thresholds = excluded.thresholds
    where stored.evaluation is not null and stored.saved_at < excluded.saved_at;
$$;

revoke all on function public.muc_import_trainer_evaluations(jsonb, uuid) from public, anon;
grant execute on function public.muc_import_trainer_evaluations(jsonb, uuid) to authenticated;

create function public.muc_delete_trainer_evaluation(evaluation_id uuid, expected_owner uuid)
returns void
language plpgsql security invoker
set search_path = ''
as $$
begin
  -- A blank row prevents another browser from re-importing a deleted report.
  insert into public.muc_private_evaluations (owner_id, id) values (expected_owner, evaluation_id)
  on conflict (owner_id, id) do nothing;

  update public.muc_private_evaluations
  set evaluation = null, thresholds = null, saved_at = now()
  where owner_id = expected_owner and id = evaluation_id and evaluation is not null;

  delete from public.muc_shared_evaluations where id = evaluation_id;
end;
$$;

revoke all on function public.muc_delete_trainer_evaluation(uuid, uuid) from public, anon;
grant execute on function public.muc_delete_trainer_evaluation(uuid, uuid) to authenticated;
