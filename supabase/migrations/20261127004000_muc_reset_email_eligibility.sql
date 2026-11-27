create function public.muc_reset_email_registered(email_address text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.muc_trainers trainer
    join auth.users account on lower(account.email) = trainer.email
    where trainer.email = lower(btrim(email_address))
      and char_length(email_address) <= 254
      and account.email_confirmed_at is not null
      and account.deleted_at is null
  );
$$;

revoke all on function public.muc_reset_email_registered(text) from public;
grant execute on function public.muc_reset_email_registered(text) to anon, authenticated;
