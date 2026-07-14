begin;

create or replace function public.notify_human_live_chat_admin()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _visitor_name text;
  _visitor_company text;
  _notification_body text;
begin
  if new.channel is distinct from 'human' then
    return new;
  end if;

  if new.role = 'user' then
    select visitor_name, visitor_company
      into _visitor_name, _visitor_company
    from public.chat_sessions
    where session_id = new.session_id;

    _notification_body := concat_ws(
      ' · ',
      coalesce(nullif(btrim(_visitor_name), ''), 'Website visitor'),
      nullif(btrim(_visitor_company), ''),
      left(new.message, 220)
    );

    insert into public.crm_notifications (
      notification_type,
      source_type,
      source_id,
      title,
      body,
      severity,
      status,
      dedupe_key,
      metadata,
      read_at,
      archived_at,
      created_at,
      updated_at
    )
    values (
      'system',
      'system',
      null,
      'Live chat waiting',
      _notification_body,
      'attention',
      'unread',
      'live_chat:' || new.session_id,
      jsonb_build_object(
        'session_id', new.session_id,
        'channel', 'human_live_chat',
        'message_id', new.id
      ),
      null,
      null,
      now(),
      now()
    )
    on conflict (dedupe_key) do update
    set body = excluded.body,
        severity = 'attention',
        status = 'unread',
        metadata = excluded.metadata,
        read_at = null,
        archived_at = null,
        updated_at = now();

  elsif new.role = 'admin' then
    update public.crm_notifications
    set status = 'read',
        read_at = coalesce(read_at, now()),
        updated_at = now()
    where dedupe_key = 'live_chat:' || new.session_id
      and status = 'unread';
  end if;

  return new;
end;
$$;

revoke all on function public.notify_human_live_chat_admin() from public, anon, authenticated;

drop trigger if exists chat_messages_human_admin_notification on public.chat_messages;
create trigger chat_messages_human_admin_notification
after insert on public.chat_messages
for each row
execute function public.notify_human_live_chat_admin();

commit;
