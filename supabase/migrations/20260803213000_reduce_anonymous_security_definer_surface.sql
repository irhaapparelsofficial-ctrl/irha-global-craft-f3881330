-- IA-SEC-E001 / IRHA-SUPABASE-ANON-SECURITY-01
-- Reduce anonymous elevated execution while preserving the public catalogue/search contract.
--
-- Pre-change production verification established that, under role anon, both
-- get_public_catalog_route_manifest() and get_public_sitemap_entries() return
-- exactly the same rows with caller RLS as they do as SECURITY DEFINER.
-- notification_consume_dispatch_token(uuid) is consumed only by the trusted
-- notification-dispatcher Edge Function, which has an existing service-role client.

alter function public.get_public_catalog_route_manifest() security invoker;
alter function public.get_public_sitemap_entries() security invoker;

revoke execute on function public.notification_consume_dispatch_token(uuid)
  from public, anon, authenticated;
grant execute on function public.notification_consume_dispatch_token(uuid)
  to service_role;

comment on function public.notification_consume_dispatch_token(uuid) is
  'Atomically consumes one valid notification scheduler capability. Service-role only; false means missing, expired, invalid, or replayed.';
