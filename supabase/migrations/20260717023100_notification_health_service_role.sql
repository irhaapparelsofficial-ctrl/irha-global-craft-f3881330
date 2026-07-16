begin;

create or replace function public.notification_delivery_health()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _actor uuid := auth.uid();
  _jwt_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  if _jwt_role <> 'service_role'
     and (_actor is null or not public.has_role(_actor, 'admin')) then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'push_subscriptions', (select count(*) from public.owner_push_subscriptions where enabled),
    'pending_push', (select count(*) from public.notification_outbox where channel = 'web_push' and status in ('pending','retry','processing')),
    'blocked_push', (select count(*) from public.notification_outbox where channel = 'web_push' and status = 'blocked'),
    'pending_email', (select count(*) from public.notification_outbox where channel = 'email' and status in ('pending','retry','processing')),
    'blocked_email', (select count(*) from public.notification_outbox where channel = 'email' and status = 'blocked'),
    'sent_24h', (select count(*) from public.notification_outbox where status = 'sent' and sent_at >= now() - interval '24 hours'),
    'failed_24h', (select count(*) from public.notification_outbox where status = 'failed' and updated_at >= now() - interval '24 hours')
  );
end;
$$;

revoke all on function public.notification_delivery_health() from public, anon;
grant execute on function public.notification_delivery_health() to authenticated, service_role;

commit;
