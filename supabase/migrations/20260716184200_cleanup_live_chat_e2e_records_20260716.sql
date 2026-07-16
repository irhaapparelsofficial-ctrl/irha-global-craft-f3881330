begin;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

delete from public.crm_notifications
where dedupe_key='live_chat:irha-e2e-livechat-20260716';

delete from public.chat_messages
where session_id='irha-e2e-livechat-20260716';

delete from public.chat_sessions
where session_id='irha-e2e-livechat-20260716';

commit;
