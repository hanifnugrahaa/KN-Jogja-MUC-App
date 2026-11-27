begin;
insert into public.muc_shared_evaluations (id, teacher_email, is_public, evaluation, thresholds)
select
  ('40000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  case when n = 8 then 'private-page-test@example.com' end, n <> 8,
  jsonb_build_object('candidate', 'Pagination Test ' || n, 'topic', 'muc-pagination-fixture',
    'evaluator', 'Supervisor Fixture', 'branch', 'Branch% Fixture', 'date', '2026-11-0' || n),
  '{}'::jsonb
from generate_series(1, 8) n;

set local role anon;
do $$
declare
  latest jsonb := public.muc_public_evaluations_page(1, 'MUC-PAGINATION-FIXTURE');
  next_page jsonb := public.muc_public_evaluations_page(2, 'muc-pagination-fixture');
  oldest jsonb := public.muc_public_evaluations_page(1, 'muc-pagination-fixture', true);
begin
  if (latest->>'total')::int <> 7 or jsonb_array_length(latest->'rows') <> 5
    or latest->'rows'->0->'evaluation'->>'candidate' <> 'Pagination Test 7'
    or jsonb_array_length(next_page->'rows') <> 2
    or next_page->'rows'->0->'evaluation'->>'candidate' <> 'Pagination Test 2'
    or oldest->'rows'->0->'evaluation'->>'candidate' <> 'Pagination Test 1' then
    raise exception 'Public filtering, sorting, or page limit failed';
  end if;
  if (public.muc_public_evaluations_page(1, 'Branch% Fixture')->>'total')::int < 7 then
    raise exception 'Search does not match a literal percent sign';
  end if;
  if jsonb_array_length(public.muc_public_evaluations_page(3, 'muc-pagination-fixture')->'rows') <> 0 then
    raise exception 'An out of range page returned rows';
  end if;
end;
$$;
rollback;
