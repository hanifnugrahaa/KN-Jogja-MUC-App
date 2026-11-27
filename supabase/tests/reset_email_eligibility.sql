begin;

insert into auth.users (id, email, email_confirmed_at)
values
  ('60000000-0000-4000-8000-000000000001', 'muc-reset-trainer-test@example.com', now()),
  ('60000000-0000-4000-8000-000000000002', 'muc-reset-nontrainer-test@example.com', now()),
  ('60000000-0000-4000-8000-000000000003', 'muc-reset-unconfirmed-test@example.com', null);

insert into public.muc_trainers (email)
values ('muc-reset-trainer-test@example.com'),
       ('muc-reset-unconfirmed-test@example.com'),
       ('muc-reset-missing-test@example.com');

set local role anon;
do $$
begin
  if not public.muc_reset_email_registered(' MUC-RESET-TRAINER-TEST@example.com ')
     or public.muc_reset_email_registered('muc-reset-nontrainer-test@example.com')
     or public.muc_reset_email_registered('muc-reset-unconfirmed-test@example.com')
     or public.muc_reset_email_registered('muc-reset-missing-test@example.com')
     or public.muc_reset_email_registered('muc-reset-not-listed-test@example.com') then
    raise exception 'Password reset eligibility does not match verified trainer accounts';
  end if;
end;
$$;

rollback;
