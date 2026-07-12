-- Irha Apparels owner-controlled Business Rules draft.
-- This seed is intentionally not approved. AI remains plan-only until the owner reviews and approves it.

INSERT INTO public.ai_business_rules (id, version, status, rules)
VALUES (
  'default',
  1,
  'draft',
  jsonb_build_object(
    'business', jsonb_build_object(
      'name', 'Irha Apparels',
      'model', 'B2B custom apparel manufacturing',
      'location', 'Sialkot, Pakistan',
      'website_state', 'Experienced manufacturer; website newly built',
      'trust_point', 'Factory view is available through a live video call',
      'public_pricing', false
    ),
    'target_markets', jsonb_build_array(
      'Germany','Austria','Switzerland','Netherlands','United Kingdom','United States','Canada','Australia',
      'France','Italy','Spain','Belgium','Denmark','Sweden','Norway','Finland','Poland','Czech Republic',
      'Ireland','Portugal','Romania','Hungary','Greece'
    ),
    'market_priority', jsonb_build_object(
      'bavarian_first', jsonb_build_array('Germany','Austria','Switzerland','Netherlands'),
      'broad_private_label_first', jsonb_build_array('United Kingdom','United States','Canada','Australia')
    ),
    'allowed_without_owner_approval', jsonb_build_array(
      'internal research','lead verification','duplicate checks','buyer-fit scoring','draft outreach',
      'draft SEO','draft listings','draft social content','internal reports','website health checks'
    ),
    'owner_approval_required', jsonb_build_array(
      'send prospect email','publish social post','publish SEO page','change external listing',
      'import lead into active outreach','final quotation','price','MOQ','payment terms','delivery commitment',
      'sample approval','production commitment','shipment claim','complaint settlement'
    ),
    'truth_rules', jsonb_build_array(
      'Never invent certifications, customer counts, countries served, order counts, capacity, testimonials, MOQ, prices or timelines',
      'Never mark a draft, connector identity check or internal listing task as externally published',
      'Use no public prices and route commercial requests to Request a Quote',
      'Use only verified original product or factory media for public creative work'
    ),
    'automation', jsonb_build_object(
      'lead_auto_import', false,
      'outreach_auto_send', false,
      'seo_auto_publish', false,
      'listing_auto_publish', false,
      'social_auto_publish', false,
      'plan_only_until_approved', true
    )
  )
)
ON CONFLICT (id) DO UPDATE
SET rules = EXCLUDED.rules,
    status = CASE
      WHEN public.ai_business_rules.status = 'approved' THEN public.ai_business_rules.status
      ELSE 'draft'
    END,
    version = GREATEST(public.ai_business_rules.version, EXCLUDED.version),
    updated_at = now();
