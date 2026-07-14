-- Irha Social Autopilot Approval Queue v2
-- Draft preparation only. Owner approval remains mandatory before scheduling/delivery.

CREATE TABLE IF NOT EXISTS public.social_autopilot_settings (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  enabled BOOLEAN NOT NULL DEFAULT false,
  timezone TEXT NOT NULL DEFAULT 'Asia/Karachi' CHECK (timezone = 'Asia/Karachi'),
  horizon_days INTEGER NOT NULL DEFAULT 7 CHECK (horizon_days BETWEEN 1 AND 14),
  daily_draft_limit INTEGER NOT NULL DEFAULT 2 CHECK (daily_draft_limit BETWEEN 1 AND 4),
  weekly_reels INTEGER NOT NULL DEFAULT 3 CHECK (weekly_reels BETWEEN 0 AND 7),
  platforms JSONB NOT NULL DEFAULT '{"facebook":true,"instagram":true,"linkedin":true,"tiktok":true}'::jsonb,
  posting_windows JSONB NOT NULL DEFAULT '{"facebook":["13:00","19:00"],"instagram":["13:30","20:00"],"linkedin":["11:00"],"tiktok":["20:30"]}'::jsonb,
  content_mix TEXT[] NOT NULL DEFAULT ARRAY['single_image','carousel','reel']::text[],
  product_cooldown_days INTEGER NOT NULL DEFAULT 30 CHECK (product_cooldown_days BETWEEN 0 AND 120),
  category_rotation BOOLEAN NOT NULL DEFAULT true,
  language TEXT NOT NULL DEFAULT 'English',
  target_markets TEXT[] NOT NULL DEFAULT ARRAY['Germany','Austria','Switzerland','United Kingdom','United States']::text[],
  visual_preset JSONB NOT NULL DEFAULT '{
    "id":"irha-premium-b2b-v1",
    "name":"Irha Premium B2B Studio",
    "background":"Dark charcoal-to-navy seamless studio background with consistent soft directional lighting and clean negative space.",
    "accents":"Restrained gold accents only; no decorative colours that compete with the product.",
    "logoPlacement":"Use the official Irha Apparels crest in the top-right only, with safe margins and no replacement logo.",
    "subjectRules":["Product-only composition; no models or mannequins.","Keep product colour, construction and proportions faithful to verified source media.","Use consistent framing across image, carousel and reel scenes."],
    "truthRules":["Do not invent text, labels, logos, certifications, client marks, prices, MOQ, materials, delivery claims or production claims.","Generated media remains a draft until an owner verifies the product and brand details."],
    "imageAspectRatio":"4:5",
    "reelAspectRatio":"9:16",
    "reelDurationSeconds":10
  }'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_autopilot_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_key DATE NOT NULL,
  settings_fingerprint TEXT NOT NULL,
  dry_run BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing','preview','ready','failed','cancelled')),
  campaign_id UUID REFERENCES public.social_campaigns(id) ON DELETE SET NULL,
  selected_products JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (week_key, settings_fingerprint, dry_run)
);

CREATE TABLE IF NOT EXISTS public.social_autopilot_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.social_autopilot_runs(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.social_campaigns(id) ON DELETE SET NULL,
  calendar_item_id UUID REFERENCES public.social_calendar_items(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'settings_saved','week_previewed','week_prepared','product_selected','media_selected',
    'media_required','render_required','draft_created','draft_edited','approved','rejected',
    'scheduled','delivery_attempted','failed'
  )),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_autopilot_runs_week_idx
  ON public.social_autopilot_runs (week_key DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS social_autopilot_events_run_idx
  ON public.social_autopilot_events (run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS social_autopilot_events_item_idx
  ON public.social_autopilot_events (calendar_item_id, created_at DESC)
  WHERE calendar_item_id IS NOT NULL;

ALTER TABLE public.social_autopilot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_autopilot_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_autopilot_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_autopilot_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_autopilot_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_autopilot_events TO authenticated;
GRANT ALL ON public.social_autopilot_settings, public.social_autopilot_runs, public.social_autopilot_events TO service_role;

DO $$ BEGIN
  CREATE POLICY "Admins manage social autopilot settings" ON public.social_autopilot_settings
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage social autopilot runs" ON public.social_autopilot_runs
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage social autopilot events" ON public.social_autopilot_events
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.normalize_social_autopilot_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total_slots integer;
  reel_target integer;
  reel_interval integer;
  reel_used integer := 0;
  slot_index integer;
  non_reel_index integer := 1;
  reel_selected boolean;
  non_reel_mix text[];
  normalized_mix text[] := ARRAY[]::text[];
  locked_visual_preset jsonb := '{
    "id":"irha-premium-b2b-v1",
    "name":"Irha Premium B2B Studio",
    "background":"Dark charcoal-to-navy seamless studio background with consistent soft directional lighting and clean negative space.",
    "accents":"Restrained gold accents only; no decorative colours that compete with the product.",
    "logoPlacement":"Use the official Irha Apparels crest in the top-right only, with safe margins and no replacement logo.",
    "subjectRules":["Product-only composition; no models or mannequins.","Keep product colour, construction and proportions faithful to verified source media.","Use consistent framing across image, carousel and reel scenes."],
    "truthRules":["Do not invent text, labels, logos, certifications, client marks, prices, MOQ, materials, delivery claims or production claims.","Generated media remains a draft until an owner verifies the product and brand details."],
    "imageAspectRatio":"4:5",
    "reelAspectRatio":"9:16",
    "reelDurationSeconds":10
  }'::jsonb;
BEGIN
  NEW.timezone := 'Asia/Karachi';
  NEW.visual_preset := locked_visual_preset;

  reel_selected := 'reel' = ANY(COALESCE(NEW.content_mix, ARRAY[]::text[]));
  SELECT COALESCE(array_agg(item ORDER BY first_position), ARRAY[]::text[])
  INTO non_reel_mix
  FROM (
    SELECT item, min(position) AS first_position
    FROM unnest(COALESCE(NEW.content_mix, ARRAY[]::text[])) WITH ORDINALITY AS selected(item, position)
    WHERE item IN ('single_image','carousel')
    GROUP BY item
  ) choices;

  IF cardinality(non_reel_mix) = 0 THEN
    non_reel_mix := ARRAY['single_image']::text[];
  END IF;

  total_slots := LEAST(28, GREATEST(1, NEW.horizon_days * NEW.daily_draft_limit));
  reel_target := CASE WHEN reel_selected THEN LEAST(NEW.weekly_reels, total_slots) ELSE 0 END;
  reel_interval := CASE WHEN reel_target > 0 THEN GREATEST(1, floor(total_slots::numeric / reel_target)::integer) ELSE total_slots + 1 END;

  FOR slot_index IN 0..(total_slots - 1) LOOP
    IF reel_used < reel_target AND mod(slot_index, reel_interval) = 0 THEN
      normalized_mix := array_append(normalized_mix, 'reel');
      reel_used := reel_used + 1;
    ELSE
      normalized_mix := array_append(
        normalized_mix,
        non_reel_mix[((non_reel_index - 1) % cardinality(non_reel_mix)) + 1]
      );
      non_reel_index := non_reel_index + 1;
    END IF;
  END LOOP;

  NEW.content_mix := normalized_mix;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_social_autopilot_calendar_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  original_schedule timestamptz;
  minimum_schedule timestamptz := now() + interval '15 minutes';
BEGIN
  IF COALESCE(NEW.creative_brief #>> '{autopilot,version}', '') <> 'v2'
     OR NEW.scheduled_at IS NULL
     OR NEW.status NOT IN ('draft','approved','scheduled') THEN
    RETURN NEW;
  END IF;

  IF NEW.scheduled_at < minimum_schedule THEN
    original_schedule := NEW.scheduled_at;
    WHILE NEW.scheduled_at < minimum_schedule LOOP
      NEW.scheduled_at := NEW.scheduled_at + interval '7 days';
    END LOOP;

    NEW.creative_brief := jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(NEW.creative_brief, '{}'::jsonb),
          '{autopilot,proposed_schedule}',
          to_jsonb(NEW.scheduled_at),
          true
        ),
        '{autopilot,schedule_adjusted_from}',
        to_jsonb(original_schedule),
        true
      ),
      '{autopilot,schedule_adjustment_reason}',
      to_jsonb('Past weekly slot moved to its next future occurrence.'::text),
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_social_autopilot_settings_normalize ON public.social_autopilot_settings;
CREATE TRIGGER trg_social_autopilot_settings_normalize
  BEFORE INSERT OR UPDATE ON public.social_autopilot_settings
  FOR EACH ROW EXECUTE FUNCTION public.normalize_social_autopilot_settings();

DROP TRIGGER IF EXISTS trg_social_autopilot_settings_updated ON public.social_autopilot_settings;
CREATE TRIGGER trg_social_autopilot_settings_updated
  BEFORE UPDATE ON public.social_autopilot_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_social_autopilot_calendar_schedule ON public.social_calendar_items;
CREATE TRIGGER trg_social_autopilot_calendar_schedule
  BEFORE INSERT OR UPDATE OF scheduled_at, status, creative_brief ON public.social_calendar_items
  FOR EACH ROW EXECUTE FUNCTION public.normalize_social_autopilot_calendar_schedule();

INSERT INTO public.social_autopilot_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;
