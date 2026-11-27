create table public.muc_trainers (
  email text primary key check (email = lower(btrim(email)) and email <> '')
);

alter table public.muc_trainers enable row level security;
revoke all on public.muc_trainers from anon, authenticated;

create function public.muc_is_trainer()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.muc_trainers
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.muc_is_trainer() from public;
grant execute on function public.muc_is_trainer() to authenticated;

create table public.muc_shared_evaluations (
  id uuid primary key,
  teacher_email text not null check (teacher_email = lower(btrim(teacher_email)) and teacher_email <> ''),
  evaluation jsonb not null check (jsonb_typeof(evaluation) = 'object'),
  thresholds jsonb not null check (jsonb_typeof(thresholds) = 'object'),
  shared_at timestamptz not null default now()
);

alter table public.muc_shared_evaluations enable row level security;
revoke all on public.muc_shared_evaluations from anon, authenticated;
grant select, insert, update, delete on public.muc_shared_evaluations to authenticated;

create index muc_shared_evaluations_teacher_idx on public.muc_shared_evaluations (teacher_email);

create policy "Trainer manages published evaluations"
on public.muc_shared_evaluations
for all to authenticated
using ((select public.muc_is_trainer()))
with check ((select public.muc_is_trainer()));

create policy "Teacher views own published evaluations"
on public.muc_shared_evaluations
for select to authenticated
using (teacher_email = lower((select auth.jwt()) ->> 'email'));
