-- Apply the security-invoker hardening when the redirect queue view exists.
-- The guard keeps repository dry-runs independent while sequential production
-- application still hardens the view immediately after its creation migration.
do $$
begin
  if to_regclass('public.admin_legacy_redirect_queue') is not null then
    execute 'alter view public.admin_legacy_redirect_queue set (security_invoker = on)';
  end if;
end
$$;
