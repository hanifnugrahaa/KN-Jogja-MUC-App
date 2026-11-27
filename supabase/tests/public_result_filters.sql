begin;
insert into public.muc_shared_evaluations (id, teacher_email, is_public, evaluation, thresholds)
select
  ('50000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  case when n = 8 then 'private-filter-test@example.com' end, n <> 8,
  jsonb_build_object('candidate', 'Filter QA ' || n, 'topic', 'muc-filters-fixture',
    'date', '2026-11-0' || n, 'override', case when n = 3 then 'Recommended' else 'automatic' end,
    'ratings', (select jsonb_object_agg(key, case when n = 6 then 3 when n = 7 then 4 when n = 8 then 5 else n end)
      from unnest(array['preparation','opening','technical','delivery','communication','interaction','management','closing']) key)),
  case when n = 7 then '{"high":80,"recommended":75,"conditional":60}'::jsonb
       else '{"high":85,"recommended":75,"conditional":60}'::jsonb end
from generate_series(1, 8) n;

set local role anon;
do $$
declare
  score_page jsonb := public.muc_public_evaluations_filtered(1, 'muc-filters-fixture', sort_column => 'score');
  score_page_2 jsonb := public.muc_public_evaluations_filtered(2, 'muc-filters-fixture', sort_column => 'score');
  teacher_page jsonb := public.muc_public_evaluations_filtered(1, 'muc-filters-fixture', sort_column => 'teacher', sort_descending => false);
  date_page jsonb := public.muc_public_evaluations_filtered(1, 'muc-filters-fixture', from_date => '2026-11-03', to_date => '2026-11-05');
  recommended jsonb := public.muc_public_evaluations_filtered(1, 'muc-filters-fixture', recommendation_filter => 'Recommended');
  high jsonb := public.muc_public_evaluations_filtered(1, 'muc-filters-fixture', recommendation_filter => 'Highly Recommended');
begin
  if (score_page->>'total')::int <> 7 or jsonb_array_length(score_page->'rows') <> 5
     or score_page->'rows'->0->'evaluation'->>'candidate' <> 'Filter QA 5'
     or jsonb_array_length(score_page_2->'rows') <> 2
     or score_page_2->'rows'->1->'evaluation'->>'candidate' <> 'Filter QA 1'
     or teacher_page->'rows'->0->'evaluation'->>'candidate' <> 'Filter QA 1' then
    raise exception 'Public sort or page limit failed';
  end if;
  if (date_page->>'total')::int <> 3
     or date_page->'rows'->0->'evaluation'->>'candidate' <> 'Filter QA 5'
     or (public.muc_public_evaluations_filtered(1, 'muc-filters-fixture', teacher_name => ' qa 7 ')->>'total')::int <> 1
     or (public.muc_public_evaluations_filtered(1, 'muc-filters-fixture', teacher_name => 'qa 8')->>'total')::int <> 0 then
    raise exception 'Teacher or inclusive date filtering failed';
  end if;
  if (recommended->>'total')::int <> 2
     or not exists (select from jsonb_array_elements(recommended->'rows') entry where entry->'evaluation'->>'candidate' = 'Filter QA 3')
     or (high->>'total')::int <> 2
     or not exists (select from jsonb_array_elements(high->'rows') entry where entry->'evaluation'->>'candidate' = 'Filter QA 7') then
    raise exception 'Recommendation filtering ignored a manual override or saved thresholds';
  end if;
end;
$$;
rollback;
