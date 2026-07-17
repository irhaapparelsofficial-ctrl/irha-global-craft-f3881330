-- Preserve the owner approval boundary for external buyer messages.
-- The buyer-confirmation trigger remains absent until a separately approved release enables it.

begin;

drop trigger if exists inquiries_buyer_confirmation_outbox on public.inquiries;

comment on function public.notification_enqueue_buyer_confirmation() is
  'Dormant buyer-confirmation queue function. No inquiry trigger is attached; external buyer messages remain approval-gated.';

commit;
