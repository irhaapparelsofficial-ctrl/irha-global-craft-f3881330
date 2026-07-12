-- Supabase advisor hardening after Phase 3.2 activation.
-- Keeps intentional public read/admin RPCs unchanged while removing direct API
-- execution from trigger-only SECURITY DEFINER functions.

REVOKE ALL ON FUNCTION public.crm_task_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_task_activity_audit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_buyer360_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_buyer360_activity_audit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.media_assets_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.media_assets_audit() FROM PUBLIC, anon, authenticated;

-- Remove duplicate policies left by the earlier CMS bootstrap and the final
-- content-CMS migration. The retained policies have the same or stricter scope.
DROP POLICY IF EXISTS "blog_posts public read published" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts admin read all" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts admin write" ON public.blog_posts;
DROP POLICY IF EXISTS "faqs public read published" ON public.faqs;
DROP POLICY IF EXISTS "faqs admin write" ON public.faqs;
DROP POLICY IF EXISTS "seo_overrides public read published" ON public.seo_page_overrides;
DROP POLICY IF EXISTS "seo_overrides admin write" ON public.seo_page_overrides;
DROP POLICY IF EXISTS "internal_links public read published" ON public.internal_links;
DROP POLICY IF EXISTS "internal_links admin write" ON public.internal_links;

-- Unique constraints already provide these indexes.
DROP INDEX IF EXISTS public.blog_posts_slug_locale_uidx;
DROP INDEX IF EXISTS public.seo_page_overrides_route_locale_uidx;

-- Keep one of the two identical page-view timestamp indexes.
DROP INDEX IF EXISTS public.page_views_created_at_idx;

-- Cover high-use operational foreign keys without indexing every low-volume
-- audit actor field reported by the advisor.
CREATE INDEX IF NOT EXISTS b2b_leads_lead_campaign_id_idx
  ON public.b2b_leads (lead_campaign_id)
  WHERE lead_campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lead_candidates_imported_lead_id_idx
  ON public.lead_candidates (imported_lead_id)
  WHERE imported_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS outreach_events_lead_id_idx
  ON public.outreach_events (lead_id)
  WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS outreach_messages_parent_message_id_idx
  ON public.outreach_messages (parent_message_id)
  WHERE parent_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS social_calendar_items_product_id_idx
  ON public.social_calendar_items (product_id)
  WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS social_campaigns_product_id_idx
  ON public.social_campaigns (product_id)
  WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS social_delivery_attempts_campaign_id_idx
  ON public.social_delivery_attempts (campaign_id)
  WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS whatsapp_messages_contact_id_idx
  ON public.whatsapp_messages (contact_id);
CREATE INDEX IF NOT EXISTS media_asset_events_media_asset_id_idx
  ON public.media_asset_events (media_asset_id)
  WHERE media_asset_id IS NOT NULL;

COMMENT ON FUNCTION public.catalog_get_public_release() IS
  'Intentional anon SECURITY DEFINER read RPC. Returns only explicitly filtered published catalog fields.';
COMMENT ON FUNCTION public.owner_bootstrap_open() IS
  'Intentional public boolean bootstrap-state RPC; returns no account identity or secret data.';
