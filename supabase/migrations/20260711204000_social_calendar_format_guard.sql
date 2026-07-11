-- V1 delivery guard: carousel/reel items remain creative handoff drafts.
-- Native multi-asset/video delivery must be implemented and verified before approval is permitted.

DO $$ BEGIN
  ALTER TABLE public.social_calendar_items
    ADD CONSTRAINT social_calendar_v1_supported_delivery_check
    CHECK (
      content_type IN ('text', 'single_image')
      OR status IN ('draft', 'rejected', 'cancelled', 'manual_required')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
