-- Keep the lead engine zero-credit by default and prevent accidental duplicate
-- candidates inside the same campaign. Existing application RLS remains intact.

alter table public.lead_campaigns
  alter column source_providers
  set default array['public_search_no_api_key'::text, 'direct_website'::text];

alter table public.lead_search_runs
  alter column provider
  set default 'public_search_no_api_key'::text;

alter table public.lead_candidates
  alter column source_provider
  set default 'public_search_no_api_key'::text;

update public.lead_campaigns c
set source_providers = array['public_search_no_api_key'::text, 'direct_website'::text],
    updated_at = now()
where c.status = 'draft'
  and c.source_providers = array['firecrawl'::text]
  and not exists (
    select 1 from public.lead_search_runs r where r.campaign_id = c.id
  )
  and not exists (
    select 1 from public.lead_candidates lc where lc.campaign_id = c.id
  );

create unique index if not exists lead_candidates_campaign_domain_unique
  on public.lead_candidates (campaign_id, website_domain)
  where website_domain is not null;

create unique index if not exists lead_candidates_campaign_email_unique
  on public.lead_candidates (campaign_id, lower(email))
  where email is not null;

create index if not exists lead_search_runs_campaign_started_idx
  on public.lead_search_runs (campaign_id, started_at desc);
