-- Owner account is already confirmed and has the single active admin role.
-- The production Auth page no longer calls either bootstrap RPC.
-- Keep the functions available only to service_role for controlled recovery.

begin;

revoke execute on function public.owner_bootstrap_open() from public, anon, authenticated;
revoke execute on function public.claim_owner_admin() from public, anon, authenticated;

grant execute on function public.owner_bootstrap_open() to service_role;
grant execute on function public.claim_owner_admin() to service_role;

commit;
