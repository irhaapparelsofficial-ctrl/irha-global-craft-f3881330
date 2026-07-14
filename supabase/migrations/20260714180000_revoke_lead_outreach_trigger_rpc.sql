begin;

-- These SECURITY DEFINER functions are table-trigger implementations only.
-- They must never be callable through PostgREST RPC by browser roles.
revoke all on function public.lead_import_files_before_write() from public;
revoke all on function public.lead_import_files_before_write() from anon;
revoke all on function public.lead_import_files_before_write() from authenticated;
grant execute on function public.lead_import_files_before_write() to service_role;

revoke all on function public.outreach_attachment_before_write() from public;
revoke all on function public.outreach_attachment_before_write() from anon;
revoke all on function public.outreach_attachment_before_write() from authenticated;
grant execute on function public.outreach_attachment_before_write() to service_role;

commit;
