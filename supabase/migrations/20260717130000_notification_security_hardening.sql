begin;

drop policy if exists notification_dispatch_runtime_service_role_all
  on public.notification_dispatch_runtime;

create policy notification_dispatch_runtime_service_role_all
  on public.notification_dispatch_runtime
  for all
  to service_role
  using (true)
  with check (true);

revoke all on function public.notification_delivery_health()
  from public, anon, authenticated;
grant execute on function public.notification_delivery_health()
  to service_role;

comment on table public.notification_dispatch_runtime is
  'Internal service-role notification dispatcher lock state.';
comment on function public.notification_delivery_health() is
  'Service-role-only notification delivery health snapshot exposed to admins through the authenticated Edge Function.';

commit;
