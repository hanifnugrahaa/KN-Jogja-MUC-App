begin;

insert into auth.users (id, email) values
  ('41000000-0000-4000-8000-000000000001', 'muc-private-owner@example.com'),
  ('41000000-0000-4000-8000-000000000002', 'muc-private-other-trainer@example.com'),
  ('41000000-0000-4000-8000-000000000003', 'muc-private-teacher@example.com');
insert into public.muc_trainers (email) values ('muc-private-owner@example.com'), ('muc-private-other-trainer@example.com');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"41000000-0000-4000-8000-000000000001","email":"muc-private-owner@example.com"}', true);

select public.muc_import_trainer_evaluations('[
  {"id":"42000000-0000-4000-8000-000000000001","saved_at":"2026-11-01T00:00:00Z","evaluation":{"notes":"Private notes"},"thresholds":{}}
]'::jsonb, auth.uid());
select public.muc_import_trainer_evaluations('[
  {"id":"42000000-0000-4000-8000-000000000001","saved_at":"2026-10-01T00:00:00Z","evaluation":{"notes":"Stale notes"},"thresholds":{}},
  {"id":"42000000-0000-4000-8000-000000000002","saved_at":"2026-10-01T00:00:00Z","evaluation":{"notes":"Old draft"},"thresholds":{}}
]'::jsonb, auth.uid());
select public.muc_import_trainer_evaluations('[
  {"id":"42000000-0000-4000-8000-000000000002","saved_at":"2026-11-02T00:00:00Z","evaluation":{"notes":"Newer browser copy"},"thresholds":{}}
]'::jsonb, auth.uid());

do $$
begin
  if (select evaluation->>'notes' from public.muc_private_evaluations where id = '42000000-0000-4000-8000-000000000001')
    is distinct from 'Private notes' then raise exception 'A stale import overwrote the saved report'; end if;
  if (select evaluation->>'notes' from public.muc_private_evaluations where id = '42000000-0000-4000-8000-000000000002')
    is distinct from 'Newer browser copy' then raise exception 'Newer browser changes were lost'; end if;
end;
$$;

insert into public.muc_shared_evaluations (id, evaluation, thresholds, is_public)
values ('42000000-0000-4000-8000-000000000001', '{"candidate":"MUC Private Test","notes":""}', '{}', true);

set local role anon;
do $$
begin
  begin
    perform 1 from public.muc_private_evaluations;
    raise exception 'Anonymous visitors can access private evaluations';
  exception when insufficient_privilege then null;
  end;
  if (select evaluation->>'notes' from public.muc_public_evaluations() where id = '42000000-0000-4000-8000-000000000001')
    is distinct from '' then raise exception 'Public results leaked private notes or lost the public snapshot'; end if;
  if exists (select from public.muc_public_evaluations() where id = '42000000-0000-4000-8000-000000000002') then
    raise exception 'A private-only report appeared publicly';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"41000000-0000-4000-8000-000000000002","email":"muc-private-other-trainer@example.com"}', true);
do $$
begin
  if exists (select from public.muc_private_evaluations where id = '42000000-0000-4000-8000-000000000001') then
    raise exception 'Another trainer can read the owner report';
  end if;
  update public.muc_private_evaluations set evaluation = '{}' where id = '42000000-0000-4000-8000-000000000001';
  if found then raise exception 'Another trainer can edit the owner report'; end if;
  begin
    perform public.muc_delete_trainer_evaluation('42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001');
    raise exception 'Another trainer can issue a delete as the owner';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claims', '{"sub":"41000000-0000-4000-8000-000000000003","email":"muc-private-teacher@example.com"}', true);
do $$
begin
  if exists (select from public.muc_private_evaluations) then raise exception 'A teacher can read private evaluations'; end if;
  begin
    perform public.muc_delete_trainer_evaluation('42000000-0000-4000-8000-000000000001', auth.uid());
    raise exception 'A teacher can delete a trainer evaluation';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claims', '{"sub":"41000000-0000-4000-8000-000000000001","email":"muc-private-owner@example.com"}', true);
select public.muc_delete_trainer_evaluation('42000000-0000-4000-8000-000000000001', auth.uid());
select public.muc_delete_trainer_evaluation('42000000-0000-4000-8000-000000000001', auth.uid());
select public.muc_import_trainer_evaluations('[
  {"id":"42000000-0000-4000-8000-000000000001","saved_at":"2100-01-01T00:00:00Z","evaluation":{},"thresholds":{}}
]'::jsonb, auth.uid());
do $$
begin
  begin
    update public.muc_private_evaluations set evaluation = '{}', thresholds = '{}' where id = '42000000-0000-4000-8000-000000000001';
    raise exception 'Editing a deleted report restored it';
  exception when insufficient_privilege then null;
  end;
  if exists (select from public.muc_private_evaluations where id = '42000000-0000-4000-8000-000000000001' and evaluation is not null)
    or exists (select from public.muc_public_evaluations() where id = '42000000-0000-4000-8000-000000000001') then
    raise exception 'Deleting did not remove the report or a later browser import restored it';
  end if;
end;
$$;

rollback;
