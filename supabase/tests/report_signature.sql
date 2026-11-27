begin;
insert into public.muc_report_signature_asset (png, width, height)
values (decode('89504e470d0a1a0a', 'hex'), 1, 1)
on conflict (singleton) do nothing;

insert into public.muc_shared_evaluations (id, teacher_email, is_public, evaluation, thresholds) values
  ('30000000-0000-4000-8000-000000000001', null, true, '{"evaluator":"Mr. Hanif"}', '{}'),
  ('30000000-0000-4000-8000-000000000002', 'private-test@example.com', false, '{"evaluator":"Mr Hanif"}', '{}'),
  ('30000000-0000-4000-8000-000000000003', null, true, '{"evaluator":"Another Evaluator"}', '{}');

set local role anon;
do $$
begin
  if public.muc_report_signature('30000000-0000-4000-8000-000000000001') is null
     or public.muc_report_signature('30000000-0000-4000-8000-000000000002') is not null
     or public.muc_report_signature('30000000-0000-4000-8000-000000000003') is not null
     or public.muc_report_signature() is not null then
    raise exception 'Signature visibility does not match the published report';
  end if;
  begin
    perform 1 from public.muc_report_signature_asset;
    raise exception 'Anonymous user can read the signature table directly';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
insert into public.muc_trainers (email) values ('muc-signature-fixture@example.com');
set local role authenticated;
select set_config('request.jwt.claims', '{"email":"muc-signature-fixture@example.com"}', true);
do $$
begin
  if public.muc_report_signature() is null then
    raise exception 'Authorized trainer cannot sign a report';
  end if;
end;
$$;
rollback;
