begin;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

insert into public.chat_messages(session_id, role, message, channel, client_message_id)
values (
  'irha-e2e-livechat-20260716',
  'admin',
  'Owner-authorized admin reply E2E test. Safe to delete.',
  'human',
  'e2e-admin-reply-20260716'
)
on conflict (session_id, client_message_id) where client_message_id is not null do nothing;

update public.chat_sessions
set status='active',
    last_message_at=now(),
    last_admin_message_at=now(),
    updated_at=now()
where session_id='irha-e2e-livechat-20260716';

commit;
