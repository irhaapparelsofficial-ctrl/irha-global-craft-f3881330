-- Remove unnecessary anonymous execution access from the admin-only Instagram draft claim RPC.
-- The function remains available to authenticated admins and service-role workers.

revoke execute on function public.claim_instagram_reply_draft(uuid, uuid) from anon;
