create table public.muc_report_signature_asset (
  singleton boolean primary key default true check (singleton),
  png bytea not null check (
    octet_length(png) between 8 and 131072
    and substring(png from 1 for 8) = decode('89504e470d0a1a0a', 'hex')
  ),
  width integer not null check (width between 1 and 4096),
  height integer not null check (height between 1 and 4096)
);

alter table public.muc_report_signature_asset enable row level security;
revoke all on public.muc_report_signature_asset from public, anon, authenticated;

create function public.muc_report_signature(evaluation_id uuid default null)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'dataUrl', 'data:image/png;base64,' || replace(encode(asset.png, 'base64'), chr(10), ''),
    'width', asset.width,
    'height', asset.height
  )
  from public.muc_report_signature_asset asset
  where (evaluation_id is null and (select public.muc_is_trainer()))
    or exists (
      select 1
      from public.muc_shared_evaluations evaluation
      where evaluation.id = evaluation_id
        and evaluation.is_public
        and lower(btrim(evaluation.evaluation ->> 'evaluator'))
          ~ '^(mr[.]?[[:space:]]+)?hanif([[:space:]]+ardiyanta)?$'
    );
$$;

revoke all on function public.muc_report_signature(uuid) from public;
grant execute on function public.muc_report_signature(uuid) to anon, authenticated;
