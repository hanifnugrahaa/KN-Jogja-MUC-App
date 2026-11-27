create function public.muc_public_evaluations_filtered(
  page_number integer default 1,
  search_text text default '',
  teacher_name text default '',
  from_date date default null,
  to_date date default null,
  recommendation_filter text default '',
  sort_column text default 'date',
  sort_descending boolean default true
)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  with candidates as not materialized (
    select entry.id, entry.evaluation, entry.thresholds, entry.shared_at,
      lower(coalesce(entry.evaluation->>'candidate', '')) as teacher,
      entry.evaluation->>'date' as evaluated_on,
      coalesce(rubric.score, 0) as score,
      case when rubric.rated = 8 then
        case
          when entry.evaluation->>'override' in ('Highly Recommended', 'Recommended', 'Recommended with Grooming', 'Not Recommended')
            then entry.evaluation->>'override'
          when rubric.score >= case when entry.thresholds->>'high' ~ '^[0-9]{1,3}$' then (entry.thresholds->>'high')::int else 85 end
            then 'Highly Recommended'
          when rubric.score >= case when entry.thresholds->>'recommended' ~ '^[0-9]{1,3}$' then (entry.thresholds->>'recommended')::int else 75 end
            then 'Recommended'
          when rubric.score >= case when entry.thresholds->>'conditional' ~ '^[0-9]{1,3}$' then (entry.thresholds->>'conditional')::int else 60 end
            then 'Recommended with Grooming'
          else 'Not Recommended'
        end
      end as recommendation
    from public.muc_shared_evaluations entry
    cross join lateral (
      select sum((entry.evaluation->'ratings'->>criterion)::int * weight / 5) as score,
        count(*) as rated
      from (values ('preparation',10),('opening',10),('technical',20),('delivery',20),
        ('communication',10),('interaction',15),('management',10),('closing',5)) as weights(criterion, weight)
      where entry.evaluation->'ratings'->>criterion ~ '^[1-5]$'
    ) rubric
    where entry.is_public
      and strpos(lower(concat_ws(' ', entry.evaluation->>'candidate', entry.evaluation->>'topic',
        entry.evaluation->>'evaluator', entry.evaluation->>'branch')), lower(left(btrim(coalesce(search_text, '')), 120))) > 0
      and strpos(lower(coalesce(entry.evaluation->>'candidate', '')), lower(left(btrim(coalesce(teacher_name, '')), 120))) > 0
      and (from_date is null or entry.evaluation->>'date' >= to_char(from_date, 'YYYY-MM-DD'))
      and (to_date is null or entry.evaluation->>'date' <= to_char(to_date, 'YYYY-MM-DD'))
  ), filtered as not materialized (
    select * from candidates
    where coalesce(recommendation_filter, '') = '' or recommendation = recommendation_filter
  ), page as (
    select id, evaluation, thresholds, shared_at from filtered
    order by
      case when sort_column = 'teacher' and not sort_descending then teacher end asc,
      case when sort_column = 'teacher' and sort_descending then teacher end desc,
      case when sort_column = 'score' and not sort_descending then score end asc,
      case when sort_column = 'score' and sort_descending then score end desc,
      case when sort_column = 'date' and not sort_descending then evaluated_on end asc nulls last,
      case when sort_column = 'date' and sort_descending then evaluated_on end desc nulls last,
      shared_at desc, id
    offset ((greatest(coalesce(page_number, 1), 1)::bigint - 1) * 5)
    limit 5
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(page) from page), '[]'::jsonb),
    'total', (select count(*) from filtered)
  );
$$;

revoke all on function public.muc_public_evaluations_filtered(integer, text, text, date, date, text, text, boolean) from public;
grant execute on function public.muc_public_evaluations_filtered(integer, text, text, date, date, text, text, boolean) to anon, authenticated;
