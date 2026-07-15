-- Remove browser-callable EXECUTE privileges from internal trigger helpers.
-- These functions are invoked only by database triggers and are not public RPC endpoints.

begin;

revoke all on function public.normalize_social_autopilot_settings() from public;
revoke execute on function public.normalize_social_autopilot_settings() from anon, authenticated;

revoke all on function public.normalize_social_autopilot_calendar_schedule() from public;
revoke execute on function public.normalize_social_autopilot_calendar_schedule() from anon, authenticated;

revoke all on function public.touch_admin_ai_knowledge_updated_at() from public;
revoke execute on function public.touch_admin_ai_knowledge_updated_at() from anon, authenticated;

commit;
