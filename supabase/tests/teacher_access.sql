begin;

insert into public.muc_trainers (email) values ('trainer-test@example.com');
select set_config('request.jwt.claims', '{"email":"trainer-test@example.com"}', true);
set local role authenticated;

do $$
begin
  if not public.muc_is_trainer() then
    raise exception 'Trainer access missing';
  end if;
end;
$$;

insert into public.muc_shared_evaluations (id, teacher_email, evaluation, thresholds) values
  ('10000000-0000-4000-8000-000000000001', 'teacher-one-test@example.com', '{}', '{}'),
  ('10000000-0000-4000-8000-000000000002', 'teacher-two-test@example.com', '{}', '{}');

select set_config('request.jwt.claims', '{"email":"teacher-one-test@example.com"}', true);
do $$
begin
  if public.muc_is_trainer() or
     (select array_agg(teacher_email) from public.muc_shared_evaluations)
       is distinct from array['teacher-one-test@example.com'] then
    raise exception 'Teacher access crossed account boundaries';
  end if;
  update public.muc_shared_evaluations set evaluation = '{"changed": true}';
  if found then raise exception 'Teacher could edit an evaluation'; end if;
  delete from public.muc_shared_evaluations;
  if found then raise exception 'Teacher could revoke an evaluation'; end if;
  begin
    insert into public.muc_shared_evaluations (id, teacher_email, evaluation, thresholds)
      values ('10000000-0000-4000-8000-000000000003', 'teacher-one-test@example.com', '{}', '{}');
    raise exception 'Teacher could publish an evaluation';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claims', '{"email":"unrelated-test@example.com"}', true);
do $$
begin
  if exists (select from public.muc_shared_evaluations) then
    raise exception 'Unrelated signed-in user could read evaluations';
  end if;
end;
$$;

select set_config('request.jwt.claims', '{"email":"trainer-test@example.com"}', true);
delete from public.muc_shared_evaluations where teacher_email = 'teacher-one-test@example.com';
select set_config('request.jwt.claims', '{"email":"teacher-one-test@example.com"}', true);
do $$
begin
  if exists (select from public.muc_shared_evaluations) then
    raise exception 'Teacher could read a revoked evaluation';
  end if;
end;
$$;

set local role anon;
do $$
begin
  begin
    perform 1 from public.muc_shared_evaluations;
    raise exception 'Anonymous user could read evaluations';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
