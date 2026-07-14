-- Prevent full-table scans on foreign-key maintenance and audit lookups.
-- Additive and safe to re-run.

CREATE INDEX IF NOT EXISTS social_autopilot_settings_updated_by_idx
  ON public.social_autopilot_settings (updated_by)
  WHERE updated_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_autopilot_runs_campaign_id_idx
  ON public.social_autopilot_runs (campaign_id)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_autopilot_runs_requested_by_idx
  ON public.social_autopilot_runs (requested_by)
  WHERE requested_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_autopilot_events_campaign_id_idx
  ON public.social_autopilot_events (campaign_id)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_autopilot_events_actor_idx
  ON public.social_autopilot_events (actor)
  WHERE actor IS NOT NULL;
