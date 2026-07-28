begin;

update public.faqs
set question = 'How can a buyer verify Irha Apparels before making a commitment?',
    answer = 'Buyers can verify the relevant team, exact product and customization scope, program-specific evidence, written quotation and approval path before making a commercial commitment.',
    updated_at = now()
where locale = 'en' and lower(coalesce(answer, '')) like '%website is newly built%';

update public.admin_ai_knowledge
set content = 'Irha Apparels is a B2B custom apparel manufacturer based in Sialkot, Pakistan. Buyer verification should focus on the relevant team, exact program scope, written quotation and program-specific evidence.',
    instructions = jsonb_set(coalesce(instructions, '{}'::jsonb), '{reply_rule}', to_jsonb('Use requirement-led program verification instead of website-age claims whenever trust or company history is discussed.'::text), true),
    updated_at = now()
where knowledge_key = 'company.identity' and lower(concat_ws(' ', content, instructions::text)) like '%newly built%';

update public.admin_ai_knowledge
set content = 'For first-contact and follow-up messaging, use requirement-led OEM, ODM and private-label positioning. Offer an appointment-based live factory call as an optional verification step, subject to availability and viewing scope. Do not use cheap or lowest-price positioning, and do not make website-age claims.',
    updated_at = now()
where knowledge_key = 'outreach.positioning' and lower(concat_ws(' ', content, instructions::text)) like '%newly built%';

update public.ai_business_rules
set rules = jsonb_set(rules, '{company,websiteState}', to_jsonb('Website age is not used as a buyer-trust claim; verification is based on the exact program and written scope.'::text), true),
    updated_at = now()
where id = 'default' and status = 'approved' and lower(rules::text) like '%newly built%';

update public.social_calendar_items
set caption = case when caption is null then null else regexp_replace(caption, 'we are an experienced manufacturer and our website is newly built\.[[:space:]]*', 'Buyer verification is based on the exact program scope and requirement review. ', 'gi') end,
    reel_script = case when reel_script is null then null else regexp_replace(reel_script, 'we are an experienced manufacturer and our website is newly built\.[[:space:]]*', 'Buyer verification is based on the exact program scope and requirement review. ', 'gi') end,
    carousel_outline = case when carousel_outline is null then null else regexp_replace(carousel_outline::text, 'we are an experienced manufacturer and our website is newly built\.[[:space:]]*', 'Buyer verification is based on the exact program scope and requirement review. ', 'gi')::jsonb end,
    creative_brief = case when creative_brief is null then null else regexp_replace(creative_brief::text, 'we are an experienced manufacturer and our website is newly built\.[[:space:]]*', 'Buyer verification is based on the exact program scope and requirement review. ', 'gi')::jsonb end,
    updated_at = now()
where status = 'draft' and lower(concat_ws(' ', caption, reel_script, carousel_outline::text, creative_brief::text)) like '%website is newly built%';

update public.seo_localized_pages
set source_summary = case when source_summary is null then null else replace(replace(replace(source_summary, 'Erfahrener Hersteller; Website neu aufgebaut; Live-Fabrikbesichtigung per Video möglich.', 'Anforderungsorientierte B2B-Fertigung; direkte Abstimmung und schriftlicher Leistungsumfang; Live-Fabrikbesichtigung per Video auf Anfrage.'), 'Die Website ist neu aufgebaut; die Fertigungserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.'), 'Unsere Website wurde neu aufgebaut; unsere Produktionserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.') end,
    seo_description = case when seo_description is null then null else replace(replace(replace(seo_description, 'Erfahrener Hersteller; Website neu aufgebaut; Live-Fabrikbesichtigung per Video möglich.', 'Anforderungsorientierte B2B-Fertigung; direkte Abstimmung und schriftlicher Leistungsumfang; Live-Fabrikbesichtigung per Video auf Anfrage.'), 'Die Website ist neu aufgebaut; die Fertigungserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.'), 'Unsere Website wurde neu aufgebaut; unsere Produktionserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.') end,
    intro = case when intro is null then null else replace(replace(replace(intro, 'Erfahrener Hersteller; Website neu aufgebaut; Live-Fabrikbesichtigung per Video möglich.', 'Anforderungsorientierte B2B-Fertigung; direkte Abstimmung und schriftlicher Leistungsumfang; Live-Fabrikbesichtigung per Video auf Anfrage.'), 'Die Website ist neu aufgebaut; die Fertigungserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.'), 'Unsere Website wurde neu aufgebaut; unsere Produktionserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.') end,
    sections = case when sections is null then null else replace(replace(replace(sections::text, 'Erfahrener Hersteller; Website neu aufgebaut; Live-Fabrikbesichtigung per Video möglich.', 'Anforderungsorientierte B2B-Fertigung; direkte Abstimmung und schriftlicher Leistungsumfang; Live-Fabrikbesichtigung per Video auf Anfrage.'), 'Die Website ist neu aufgebaut; die Fertigungserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.'), 'Unsere Website wurde neu aufgebaut; unsere Produktionserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.')::jsonb end,
    faqs = case when faqs is null then null else replace(replace(replace(faqs::text, 'Erfahrener Hersteller; Website neu aufgebaut; Live-Fabrikbesichtigung per Video möglich.', 'Anforderungsorientierte B2B-Fertigung; direkte Abstimmung und schriftlicher Leistungsumfang; Live-Fabrikbesichtigung per Video auf Anfrage.'), 'Die Website ist neu aufgebaut; die Fertigungserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.'), 'Unsere Website wurde neu aufgebaut; unsere Produktionserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.')::jsonb end,
    cta = case when cta is null then null else replace(replace(replace(cta::text, 'Erfahrener Hersteller; Website neu aufgebaut; Live-Fabrikbesichtigung per Video möglich.', 'Anforderungsorientierte B2B-Fertigung; direkte Abstimmung und schriftlicher Leistungsumfang; Live-Fabrikbesichtigung per Video auf Anfrage.'), 'Die Website ist neu aufgebaut; die Fertigungserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.'), 'Unsere Website wurde neu aufgebaut; unsere Produktionserfahrung besteht seit Jahren.', 'Die Verifizierung erfolgt anhand des konkreten Programms, des schriftlichen Leistungsumfangs und direkter Abstimmung.')::jsonb end,
    updated_at = now()
where status = 'draft' and locale in ('de-DE', 'de-AT')
  and path in ('/intl/de-DE/products/bavarian-trachten-wear', '/intl/de-AT/products/bavarian-trachten-wear');

select public.refresh_admin_ai_snapshot_cache();

do $$
begin
  if exists (
    select 1 from public.faqs where lower(coalesce(answer, '')) like '%website is newly built%'
    union all select 1 from public.admin_ai_knowledge where is_active and lower(concat_ws(' ', content, instructions::text)) like '%newly built%'
    union all select 1 from public.ai_business_rules where status = 'approved' and lower(rules::text) like '%newly built%'
    union all select 1 from public.social_calendar_items where status = 'draft' and lower(concat_ws(' ', caption, reel_script, carousel_outline::text, creative_brief::text)) like '%website is newly built%'
    union all select 1 from public.seo_localized_pages where status = 'draft' and locale in ('de-DE', 'de-AT') and lower(concat_ws(' ', source_summary, seo_description, intro, sections::text, faqs::text, cta::text)) similar to '%(website neu aufgebaut|website ist neu aufgebaut|website wurde neu aufgebaut)%'
    union all select 1 from public.admin_ai_snapshot_cache where id = 'default' and lower(snapshot::text) like '%newly built%'
  ) then raise exception 'website-age trust copy remains after migration';
  end if;
end
$$;

commit;
