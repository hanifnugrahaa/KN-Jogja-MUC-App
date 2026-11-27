begin;
insert into public.muc_shared_evaluations (id, teacher_email, is_public, evaluation, thresholds) values
  ('20000000-0000-4000-8000-000000000001', 'private-test@example.com', false, '{}', '{}'),
  ('20000000-0000-4000-8000-000000000002', null, true, '{}', '{}');

set local role anon;
do $$
begin
  if exists (select from public.muc_public_evaluations() where id = '20000000-0000-4000-8000-000000000001')
     or not exists (select from public.muc_public_evaluations() where id = '20000000-0000-4000-8000-000000000002') then
    raise exception 'Public endpoint did not separate public and private records';
  end if;
  begin
    update public.muc_shared_evaluations set is_public = true where id = '20000000-0000-4000-8000-000000000001';
    raise exception 'Anonymous visitor could publish an evaluation';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
delete from public.muc_shared_evaluations where id = '20000000-0000-4000-8000-000000000002';
set local role anon;
do $$
begin
  if exists (select from public.muc_public_evaluations() where id = '20000000-0000-4000-8000-000000000002') then
    raise exception 'Unpublished record remains public';
  end if;
end;
$$;
rollback;
