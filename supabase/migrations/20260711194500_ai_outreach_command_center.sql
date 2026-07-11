-- Allow the AI Command Center to produce structured outreach campaign briefs.

DO $$ BEGIN
  ALTER TABLE public.ai_actions DROP CONSTRAINT IF EXISTS ai_actions_action_type_check;
  ALTER TABLE public.ai_actions ADD CONSTRAINT ai_actions_action_type_check CHECK (action_type IN (
    'social_content_pack',
    'social_publish',
    'lead_campaign_plan',
    'listing_task',
    'buyer_reply_draft',
    'seo_localization_plan',
    'weekly_growth_plan',
    'outreach_campaign_plan'
  ));
END $$;
