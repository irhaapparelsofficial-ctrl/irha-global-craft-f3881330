-- Harden the admin redirect queue when the preceding registry migration has
-- created it. The guard also lets each pending migration pass an independent
-- transactional dry-run without weakening the sequential production apply.
do $$
begin
  if to_regclass('public.admin_legacy_redirect_queue') is not null then
    execute 'alter view public.admin_legacy_redirect_queue set (security_invoker = on)';
  end if;
end
$$;
