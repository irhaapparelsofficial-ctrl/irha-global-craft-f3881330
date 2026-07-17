begin;

-- Owner alerts are activated first. Buyer-facing automatic confirmation remains
-- disabled until the owner explicitly approves the final sender domain and copy.
drop trigger if exists inquiries_buyer_confirmation_outbox on public.inquiries;
drop trigger if exists catalogue_buyer_confirmation_outbox on public.catalogue_leads;
drop function if exists public.notification_enqueue_buyer_confirmation();

commit;
