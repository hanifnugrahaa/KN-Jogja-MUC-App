create function public.muc_public_evaluations_page(
  page_number integer default 1,
  search_text text default '',
  oldest_first boolean default false
)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  with filtered as not materialized (
    select entry.id, entry.evaluation, entry.thresholds, entry.shared_at
    from public.muc_shared_evaluations entry
    where entry.is_public
      and strpos(
        lower(concat_ws(' ', entry.evaluation->>'candidate', entry.evaluation->>'topic',
          entry.evaluation->>'evaluator', entry.evaluation->>'branch')),
        lower(left(btrim(coalesce(search_text, '')), 120))
      ) > 0
  ), page as (
    select * from filtered
    order by
      case when oldest_first then evaluation->>'date' end asc nulls last,
      case when not coalesce(oldest_first, false) then evaluation->>'date' end desc nulls last,
      shared_at desc, id
    offset ((greatest(coalesce(page_number, 1), 1)::bigint - 1) * 5)
    limit 5
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(page) from page), '[]'::jsonb),
    'total', (select count(*) from filtered)
  );
$$;

revoke all on function public.muc_public_evaluations_page(integer, text, boolean) from public;
grant execute on function public.muc_public_evaluations_page(integer, text, boolean) to anon, authenticated;
