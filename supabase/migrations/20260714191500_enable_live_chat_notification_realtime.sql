begin;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'crm_notifications'
  ) then
    alter publication supabase_realtime add table public.crm_notifications;
  end if;
end;
$$;

comment on table public.crm_notifications is
  'Admin-only CRM and live-chat alerts. Realtime changes remain protected by admin RLS.';

commit;
