-- Draft-only B2B SEO foundation.
-- No page, link, blog post, keyword cluster or localized page is published by this migration.
-- Search-volume, certification, capacity, MOQ, material and timing claims remain unverified.

begin;

insert into public.seo_locales (
  locale, language_name, native_name, target_markets, direction,
  priority, status, requires_native_review, notes
) values (
  'en', 'English', 'English', array['Global'], 'ltr',
  100, 'active', false,
  'Source-language workspace. Individual pages remain draft or unpublished until owner and commercial-claim review.'
)
on conflict (locale) do update
set language_name = excluded.language_name,
    native_name = excluded.native_name,
    target_markets = excluded.target_markets,
    direction = excluded.direction,
    priority = excluded.priority,
    status = excluded.status,
    requires_native_review = excluded.requires_native_review,
    notes = excluded.notes,
    updated_at = now();

-- Repair the three existing localized drafts without making them indexable.
update public.seo_localized_pages p
set base_route = '/products/bavarian-trachten-wear',
    json_ld = case
      when p.json_ld ? 'url' then jsonb_set(
        p.json_ld,
        '{url}',
        to_jsonb(replace(p.json_ld->>'url', 'https://www.irhaapparels.com', 'https://irhaapparels.com')),
        true
      )
      else p.json_ld
    end,
    internal_links = coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'href', case link.value->>'href'
            when '/bavarian-heritage' then '/products/bavarian-trachten-wear'
            when '/request-quote' then '/inquiry?intent=rfq'
            else link.value->>'href'
          end,
          'label', link.value->>'label'
        )
        order by link.ordinality
      )
      from jsonb_array_elements(p.internal_links) with ordinality as link(value, ordinality)
    ), '[]'::jsonb),
    quality_report = p.quality_report || jsonb_build_object(
      'canonical_host', 'https://irhaapparels.com',
      'modern_base_route', '/products/bavarian-trachten-wear',
      'taxonomy_cutover_required', true,
      'native_review_required', true,
      'search_volume_claims', false,
      'invented_certifications', false
    ),
    status = 'draft',
    noindex = true,
    native_review_status = 'required',
    reviewed_by = null,
    reviewed_at = null,
    approved_by = null,
    approved_at = null,
    published_at = null,
    updated_at = now()
where p.locale in ('de-DE', 'de-AT', 'nl-NL')
  and p.status <> 'published';

with clusters(
  cluster_key, cluster_name, product_focus, seed_keywords,
  primary_keywords, supporting_keywords, questions, target_route
) as (
  values
  (
    'lederhosen-manufacturer',
    'Lederhosen Manufacturer and Wholesale Supplier',
    array['Short Lederhosen', 'Embroidered Lederhosen', 'Private-label Trachten'],
    array['lederhosen manufacturer', 'wholesale lederhosen supplier', 'private label lederhosen manufacturer'],
    '[{"keyword":"Lederhosen manufacturer","priority":"primary"},{"keyword":"wholesale Lederhosen supplier","priority":"primary"},{"keyword":"private-label Lederhosen manufacturer","priority":"primary"}]'::jsonb,
    '[{"keyword":"custom embroidered Lederhosen"},{"keyword":"Trachten manufacturer Pakistan"},{"keyword":"OEM Lederhosen supplier"}]'::jsonb,
    '["Can the manufacturer develop Lederhosen against an approved sample or technical specification?","Which leather, embroidery, lining, hardware, branding and packaging options can be reviewed?","Can the factory be shown to a qualified buyer by live video call?"]'::jsonb,
    '/products/bavarian-trachten-wear/men/short-lederhosen'
  ),
  (
    'dirndl-private-label',
    'Private-label Dirndl Manufacturer',
    array['Dirndl Dresses', 'Dirndl Blouses', 'Dirndl Aprons'],
    array['dirndl manufacturer', 'private label dirndl dresses', 'wholesale dirndl supplier'],
    '[{"keyword":"private-label Dirndl manufacturer","priority":"primary"},{"keyword":"wholesale Dirndl supplier","priority":"primary"},{"keyword":"custom Dirndl dress manufacturer","priority":"primary"}]'::jsonb,
    '[{"keyword":"OEM Dirndl dresses"},{"keyword":"Dirndl blouse manufacturer"},{"keyword":"Oktoberfest apparel manufacturer"}]'::jsonb,
    '["Can a Dirndl collection be developed from buyer-approved measurements, materials and trims?","Are blouse, apron, dress and private-label packaging programs available?","How are samples and production requirements reviewed before quotation?"]'::jsonb,
    '/products/bavarian-trachten-wear/women/dirndl-dresses'
  ),
  (
    'trachten-shirts-vests',
    'Trachten Shirt and Vest Manufacturer',
    array['Trachten Shirts', 'Trachten Vests', 'Bavarian Menswear'],
    array['trachten shirt manufacturer', 'trachten vest manufacturer', 'wholesale bavarian shirts'],
    '[{"keyword":"Trachten shirt manufacturer","priority":"primary"},{"keyword":"Trachten vest manufacturer","priority":"primary"},{"keyword":"wholesale Bavarian shirts supplier","priority":"primary"}]'::jsonb,
    '[{"keyword":"custom checkered Trachten shirts"},{"keyword":"embroidered Trachten vest supplier"},{"keyword":"private-label Bavarian menswear"}]'::jsonb,
    '["Which shirt, vest, embroidery, button and label specifications can be developed?","Can coordinated wholesale Trachten collections be reviewed as one program?","What information is required for a buyer-specific quotation?"]'::jsonb,
    '/products/bavarian-trachten-wear/men/trachten-shirts'
  ),
  (
    'leather-jacket-manufacturer',
    'Private-label Leather Jacket Manufacturer',
    array['Biker Jackets', 'Bomber Jackets', 'Leather Vests', 'Leather Trousers'],
    array['leather jacket manufacturer', 'private label biker jacket manufacturer', 'custom leather bomber supplier'],
    '[{"keyword":"private-label leather jacket manufacturer","priority":"primary"},{"keyword":"custom biker jacket manufacturer","priority":"primary"},{"keyword":"wholesale leather bomber supplier","priority":"primary"}]'::jsonb,
    '[{"keyword":"OEM leather apparel Pakistan"},{"keyword":"custom leather vest manufacturer"},{"keyword":"private-label leather trousers"}]'::jsonb,
    '["Can leather outerwear be developed from a buyer tech pack or approved reference?","Which leather, lining, hardware, fit, branding and packaging details require confirmation?","Can pre-production samples and factory evidence be reviewed before an order commitment?"]'::jsonb,
    '/products/premium-leather-apparel/men/biker-jackets'
  ),
  (
    'leather-accessories-manufacturer',
    'Private-label Leather Accessories Manufacturer',
    array['Leather Bags', 'Leather Belts', 'Leather Gloves', 'Leather Wallets'],
    array['leather accessories manufacturer', 'private label leather bags supplier', 'custom leather wallet manufacturer'],
    '[{"keyword":"private-label leather accessories manufacturer","priority":"primary"},{"keyword":"custom leather bag manufacturer","priority":"primary"},{"keyword":"wholesale leather wallet supplier","priority":"primary"}]'::jsonb,
    '[{"keyword":"OEM leather belts"},{"keyword":"custom leather gloves supplier"},{"keyword":"leather accessories factory Pakistan"}]'::jsonb,
    '["Can bags, belts, gloves and wallets be developed as a coordinated private-label range?","Which leather, hardware, dimensions, branding and packaging details are required?","How are duplicate media and approved product references controlled?"]'::jsonb,
    '/products/premium-leather-apparel/accessories/leather-bags'
  ),
  (
    'football-kit-manufacturer',
    'Custom Football Kit and Teamwear Manufacturer',
    array['Football Kits', 'Soccer Uniforms', 'Team and Club Programs'],
    array['custom football kit manufacturer', 'soccer uniform manufacturer', 'wholesale teamwear supplier'],
    '[{"keyword":"custom football kit manufacturer","priority":"primary"},{"keyword":"soccer uniform manufacturer","priority":"primary"},{"keyword":"private-label teamwear supplier","priority":"primary"}]'::jsonb,
    '[{"keyword":"sublimated football kits"},{"keyword":"custom club uniforms"},{"keyword":"football jersey manufacturer Pakistan"}]'::jsonb,
    '["Can kits be developed for clubs, academies, schools and private labels?","Which fabric, fit, decoration, numbering, sponsor and packaging details need approval?","How are sample, sizing and production requirements confirmed before quotation?"]'::jsonb,
    '/products/sportswear/team-club/football-kits'
  ),
  (
    'private-label-sportswear',
    'Private-label Sportswear Manufacturer',
    array['Performance Tops', 'Tracksuits', 'Training Outerwear', 'Running Shorts'],
    array['private label sportswear manufacturer', 'custom activewear supplier', 'OEM training wear manufacturer'],
    '[{"keyword":"private-label sportswear manufacturer","priority":"primary"},{"keyword":"custom activewear supplier","priority":"primary"},{"keyword":"OEM training wear manufacturer","priority":"primary"}]'::jsonb,
    '[{"keyword":"custom tracksuit manufacturer"},{"keyword":"performance top supplier"},{"keyword":"sportswear factory Pakistan"}]'::jsonb,
    '["Can sportswear be developed from buyer-approved performance and fit requirements?","Which fabric composition, GSM, construction and testing claims require evidence?","What information is needed before sampling and quotation?"]'::jsonb,
    '/products/sportswear/unisex/performance-tops'
  ),
  (
    'heavyweight-hoodie-manufacturer',
    'Private-label Heavyweight Hoodie and Streetwear Manufacturer',
    array['Hoodies', 'Sweatshirts', 'Oversized T-Shirts', 'Joggers', 'Cargo Pants'],
    array['heavyweight hoodie manufacturer', 'private label streetwear manufacturer', 'oversized t shirt manufacturer'],
    '[{"keyword":"heavyweight hoodie manufacturer","priority":"primary"},{"keyword":"private-label streetwear manufacturer","priority":"primary"},{"keyword":"oversized T-shirt manufacturer","priority":"primary"}]'::jsonb,
    '[{"keyword":"custom jogger manufacturer"},{"keyword":"private-label cargo pants"},{"keyword":"streetwear manufacturer Pakistan"}]'::jsonb,
    '["Can heavyweight streetwear be developed against a buyer-approved GSM and construction specification?","Which wash, print, embroidery, label and packaging details are available after review?","How are fit samples and production tolerances approved?"]'::jsonb,
    '/products/streetwear-activewear/unisex/hoodies-sweatshirts'
  ),
  (
    'private-label-activewear',
    'Private-label Activewear Manufacturer',
    array['Leggings', 'Sports Bras', 'Performance Tops', 'Athletic Bodysuits'],
    array['private label activewear manufacturer', 'custom leggings manufacturer', 'sports bra manufacturer'],
    '[{"keyword":"private-label activewear manufacturer","priority":"primary"},{"keyword":"custom leggings manufacturer","priority":"primary"},{"keyword":"sports bra manufacturer","priority":"primary"}]'::jsonb,
    '[{"keyword":"OEM gym wear supplier"},{"keyword":"women activewear manufacturer"},{"keyword":"custom athletic bodysuits"}]'::jsonb,
    '["Can activewear be developed from approved stretch, opacity, recovery and fit requirements?","Which performance or testing statements require buyer-approved evidence?","What sample and construction information is needed before a commercial offer?"]'::jsonb,
    '/products/sportswear/women/leggings-performance-bottoms'
  ),
  (
    'nightwear-pajama-manufacturer',
    'Private-label Nightwear and Pajama Manufacturer',
    array['Pajama Sets', 'Nightshirts', 'Nightgowns', 'Bathrobes', 'Sleep T-Shirts'],
    array['private label nightwear manufacturer', 'pajama manufacturer Pakistan', 'wholesale sleepwear supplier'],
    '[{"keyword":"private-label nightwear manufacturer","priority":"primary"},{"keyword":"pajama manufacturer Pakistan","priority":"primary"},{"keyword":"wholesale sleepwear supplier","priority":"primary"}]'::jsonb,
    '[{"keyword":"custom pajama sets"},{"keyword":"nightgown manufacturer"},{"keyword":"private-label bathrobe supplier"}]'::jsonb,
    '["Can nightwear collections be developed for brands, retailers and hospitality buyers?","Which fabric, fit, trim, label and packaging details require confirmation?","How are sample, quantity and production timing reviewed before quotation?"]'::jsonb,
    '/products/leisure-nightwear/men/pajama-sets'
  )
)
insert into public.seo_keyword_clusters (
  id, locale, cluster_name, search_intent, market, product_focus,
  seed_keywords, primary_keywords, supporting_keywords, questions,
  negative_keywords, source_notes, status
)
select
  md5('irha-seo-cluster:en:' || c.cluster_key)::uuid,
  'en',
  c.cluster_name,
  'commercial',
  'Global B2B',
  c.product_focus,
  c.seed_keywords,
  c.primary_keywords,
  c.supporting_keywords,
  c.questions,
  '["retail price","single piece","costume rental","free sample","guaranteed delivery","certified supplier"]'::jsonb,
  jsonb_build_object(
    'method', 'internal B2B buyer-intent architecture',
    'search_volume_claims', false,
    'commercial_claim_review_required', true,
    'target_route', c.target_route,
    'taxonomy_cutover_required', true,
    'source_language', 'English'
  ),
  'draft'
from clusters c
on conflict (id) do update
set cluster_name = excluded.cluster_name,
    search_intent = excluded.search_intent,
    market = excluded.market,
    product_focus = excluded.product_focus,
    seed_keywords = excluded.seed_keywords,
    primary_keywords = excluded.primary_keywords,
    supporting_keywords = excluded.supporting_keywords,
    questions = excluded.questions,
    negative_keywords = excluded.negative_keywords,
    source_notes = excluded.source_notes,
    status = 'draft',
    approved_by = null,
    approved_at = null,
    updated_at = now();

with overrides(route, seo_title, seo_description) as (
  values
    ('/products/bavarian-trachten-wear/men/short-lederhosen', 'Lederhosen Manufacturer & Wholesale Supplier | Irha Apparels', 'Custom Lederhosen manufacturing for wholesale, OEM, ODM and private-label buyer programs. Specifications are confirmed after requirement review.'),
    ('/products/bavarian-trachten-wear/women/dirndl-dresses', 'Private-label Dirndl Manufacturer | Irha Apparels', 'Custom Dirndl dress manufacturing for wholesalers, importers, retailers and private-label brands. Materials and commercial terms are confirmed after review.'),
    ('/products/premium-leather-apparel/men/biker-jackets', 'Private-label Leather Jacket Manufacturer | Irha Apparels', 'Custom biker and leather jacket development for wholesale, OEM, ODM and private-label programs. Exact specifications require buyer and factory approval.'),
    ('/products/sportswear/team-club/football-kits', 'Custom Football Kit Manufacturer | Irha Apparels', 'Custom football and soccer kit manufacturing for clubs, academies, schools, distributors and private-label buyers.'),
    ('/products/streetwear-activewear/unisex/hoodies-sweatshirts', 'Heavyweight Hoodie & Streetwear Manufacturer | Irha Apparels', 'Private-label hoodie, sweatshirt and streetwear manufacturing developed against buyer-approved specifications.'),
    ('/products/leisure-nightwear/men/pajama-sets', 'Private-label Pajama & Nightwear Manufacturer | Irha Apparels', 'Custom pajama and nightwear manufacturing for brands, wholesalers, retailers and hospitality buyer programs.')
)
insert into public.seo_page_overrides (
  id, route, locale, seo_title, seo_description, canonical_url,
  noindex, is_published, notes
)
select
  md5('irha-seo-override:en:' || o.route)::uuid,
  o.route,
  'en',
  o.seo_title,
  o.seo_description,
  'https://irhaapparels.com' || o.route,
  true,
  false,
  'Draft only. Requires taxonomy cutover, product verification, buyer-value copy review and owner approval before indexing.'
from overrides o
on conflict (route, locale) do update
set seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    canonical_url = excluded.canonical_url,
    noindex = true,
    is_published = false,
    notes = excluded.notes,
    updated_at = now();

with links(from_route, to_route, anchor_text, priority) as (
  values
    ('/products/bavarian-trachten-wear', '/products/bavarian-trachten-wear/men/short-lederhosen', 'Wholesale Lederhosen manufacturing', 100),
    ('/products/bavarian-trachten-wear', '/products/bavarian-trachten-wear/women/dirndl-dresses', 'Private-label Dirndl manufacturing', 95),
    ('/products/premium-leather-apparel', '/products/premium-leather-apparel/men/biker-jackets', 'Custom biker jacket manufacturing', 100),
    ('/products/premium-leather-apparel', '/products/premium-leather-apparel/accessories/leather-bags', 'Private-label leather accessories', 90),
    ('/products/sportswear', '/products/sportswear/team-club/football-kits', 'Custom football kit manufacturing', 100),
    ('/products/sportswear', '/products/sportswear/unisex/performance-tops', 'Private-label performance sportswear', 90),
    ('/products/streetwear-activewear', '/products/streetwear-activewear/unisex/hoodies-sweatshirts', 'Heavyweight hoodie manufacturing', 100),
    ('/products/leisure-nightwear', '/products/leisure-nightwear/men/pajama-sets', 'Private-label pajama manufacturing', 100),
    ('/products/bavarian-trachten-wear/men/short-lederhosen', '/inquiry?intent=rfq', 'Request a Lederhosen manufacturing quote', 100),
    ('/products/bavarian-trachten-wear/women/dirndl-dresses', '/catalogue', 'Request the B2B Trachten catalogue', 90),
    ('/products/sportswear/team-club/football-kits', '/contact?intent=factory-video', 'Request a live factory video call', 90),
    ('/products/streetwear-activewear/unisex/hoodies-sweatshirts', '/inquiry?intent=sample', 'Request a streetwear sample review', 90)
)
insert into public.internal_links (
  id, from_route, to_route, anchor_text, locale, priority, is_published
)
select
  md5('irha-internal-link:en:' || l.from_route || '|' || l.to_route || '|' || l.anchor_text)::uuid,
  l.from_route,
  l.to_route,
  l.anchor_text,
  'en',
  l.priority,
  false
from links l
on conflict (from_route, to_route, anchor_text, locale) do update
set priority = excluded.priority,
    is_published = false,
    updated_at = now();

with drafts(slug, title, excerpt, body_md, tags, sort_order) as (
  values
  (
    'how-to-source-private-label-lederhosen',
    'How to Source Private-label Lederhosen for a Wholesale Program',
    'A buyer-side specification checklist for Lederhosen development, sampling, branding and factory verification.',
    E'# How to Source Private-label Lederhosen\n\nA serious B2B enquiry should begin with the intended market, product construction, reference images or technical pack, target size range, branding plan and packaging needs.\n\n## Confirm the specification\n\nAsk the manufacturer to confirm the proposed leather or alternative material, embroidery placement, lining, hardware, pockets, reinforcement, labels and packaging against an approved sample or written specification. Do not treat an illustrative website description as a production commitment.\n\n## Review the sample path\n\nDefine which details must be approved before production: measurements, fit, color, embroidery, trims, labels and pack presentation. Quantity, sample cost, production timing and delivery terms should be quoted only after the requirements are reviewed.\n\n## Verify the manufacturing partner\n\nRequest company details, recent product evidence relevant to your specification and a live factory video call where appropriate. Certification or testing claims should be supported by current documents before they are used commercially.\n\n## Send a complete RFQ\n\nInclude destination, intended quantity, size split, reference files, required branding, packaging and requested trade term. This produces a more reliable quotation than asking for a generic unit price.',
    array['B2B sourcing','Lederhosen','private label','buyer guide'],
    10
  ),
  (
    'custom-football-kit-manufacturer-checklist',
    'Custom Football Kit Manufacturer Checklist for Clubs and Distributors',
    'The information a club, academy or teamwear distributor should prepare before requesting a custom kit quotation.',
    E'# Custom Football Kit Manufacturer Checklist\n\nA custom kit quotation depends on more than artwork. Prepare the player category, use case, preferred construction, size range, decoration plan, numbering, sponsor positions, packaging and destination.\n\n## Product and fit requirements\n\nState whether the program is for match, training, academy, school or supporter use. Provide an approved size chart or request a measurement review. Fabric composition, GSM and performance statements should remain unconfirmed until evidence and samples are reviewed.\n\n## Artwork and branding\n\nSupply vector logos where possible, color references, name and number rules, sponsor placements, label artwork and packaging instructions. Confirm whether artwork is indicative or approved for production.\n\n## Sampling and order control\n\nAgree the sample approval points, size-set requirement, packing list format and how revisions will be recorded. Quantity, production timing and delivery commitments should appear only in the written quotation or order documents.\n\n## Factory verification\n\nFor a new supplier relationship, request relevant production evidence and a live factory video call before making a commercial commitment.',
    array['football kits','teamwear','B2B sourcing','club uniforms'],
    20
  ),
  (
    'private-label-leather-jacket-development-guide',
    'Private-label Leather Jacket Development: A Buyer Specification Guide',
    'A practical framework for reviewing leather, construction, hardware, fit, branding, samples and packaging.',
    E'# Private-label Leather Jacket Development\n\nBegin with a technical pack, an approved reference sample or a clearly annotated design brief. The same visual style can produce very different results depending on leather, thickness, finish, lining, hardware and construction.\n\n## Material and construction review\n\nConfirm the proposed material, finish, panel layout, seams, reinforcement, lining, zips, snaps, pockets, cuffs, hem and care requirements. Avoid publishing a leather species, grade or performance statement until it is documented and approved.\n\n## Fit and sample approval\n\nProvide the target market, fit direction and measurement chart. Record every change between prototype, fit sample, pre-production sample and approved production reference.\n\n## Private-label details\n\nReview main labels, size and care labels, hangtags, packaging, carton marks and any traceability needs.\n\n## Commercial quotation\n\nRequest quantity-based pricing only after the specification is stable. Sample terms, production timing, trade terms and delivery estimates should be documented rather than inferred from a website page.',
    array['leather jackets','private label','buyer guide','product development'],
    30
  ),
  (
    'heavyweight-hoodie-manufacturer-rfq-guide',
    'Heavyweight Hoodie Manufacturer RFQ Guide for Streetwear Brands',
    'How to prepare a buyer-ready RFQ covering fabric, GSM, fit, construction, decoration, labels and packaging.',
    E'# Heavyweight Hoodie Manufacturer RFQ Guide\n\nThe term heavyweight does not define one production specification. A reliable RFQ should identify the approved fabric composition and GSM target, face and back construction, shrinkage expectations, fit, hood shape, rib, drawcord, pocket, seams and finishing.\n\n## Fit and size chart\n\nProvide an approved measurement chart and tolerance proposal. State whether the silhouette is regular, relaxed, oversized or custom.\n\n## Decoration and branding\n\nSpecify embroidery, print or patch dimensions and positions, artwork files, label set, hangtag and packaging. Large decoration areas may change drape or handling and should be sampled.\n\n## Evidence before claims\n\nDo not use fabric composition, GSM, wash-performance or certification statements commercially until the supplier evidence and approved sample support them.\n\n## Quote inputs\n\nSend quantity, color split, size split, destination, packaging and requested trade term. The manufacturer can then review sampling and production timing for the actual program.',
    array['hoodies','streetwear','RFQ','private label'],
    40
  ),
  (
    'private-label-nightwear-specification-checklist',
    'Private-label Nightwear Specification Checklist for Brands and Hospitality Buyers',
    'A structured B2B checklist for pajamas, nightshirts, nightgowns and robes without assuming materials or commercial terms.',
    E'# Private-label Nightwear Specification Checklist\n\nNightwear programs should be defined by buyer use case, target market, fabric and construction requirements, size range, trims, branding and packaging.\n\n## Product scope\n\nList every item in the range and whether it is sold separately or as a set. Provide reference images, measurements, closure details, pocket requirements and trim instructions.\n\n## Material review\n\nConfirm composition, weight, hand feel, color, print, shrinkage and care expectations through documented specifications and approved samples. Do not infer these properties from a generic product image.\n\n## Branding and packing\n\nDefine woven or printed labels, care information, hangtags, individual packing, set packing, barcode placement and carton marks.\n\n## Commercial review\n\nProvide intended quantity, size and color split, destination and target launch window. The supplier should then confirm sample terms, production timing and delivery assumptions in writing.',
    array['nightwear','pajamas','hospitality','private label'],
    50
  )
)
insert into public.blog_posts (
  id, slug, locale, title, excerpt, body_md, tags, author,
  seo_title, seo_description, canonical_url,
  published_at, is_published, sort_order
)
select
  md5('irha-blog:en:' || d.slug)::uuid,
  d.slug,
  'en',
  d.title,
  d.excerpt,
  d.body_md,
  d.tags,
  'Irha Apparels Editorial Review',
  d.title || ' | Irha Apparels',
  d.excerpt,
  'https://irhaapparels.com/blog/' || d.slug,
  null,
  false,
  d.sort_order
from drafts d
on conflict (slug, locale) do update
set title = excluded.title,
    excerpt = excluded.excerpt,
    body_md = excluded.body_md,
    tags = excluded.tags,
    author = excluded.author,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    canonical_url = excluded.canonical_url,
    published_at = null,
    is_published = false,
    sort_order = excluded.sort_order,
    updated_at = now();

-- Fail closed: this foundation may prepare content, never publish it.
do $$
declare
  draft_cluster_count bigint;
  draft_override_count bigint;
  draft_link_count bigint;
  draft_blog_count bigint;
begin
  select count(*) into draft_cluster_count
  from public.seo_keyword_clusters
  where id in (
    md5('irha-seo-cluster:en:lederhosen-manufacturer')::uuid,
    md5('irha-seo-cluster:en:dirndl-private-label')::uuid,
    md5('irha-seo-cluster:en:trachten-shirts-vests')::uuid,
    md5('irha-seo-cluster:en:leather-jacket-manufacturer')::uuid,
    md5('irha-seo-cluster:en:leather-accessories-manufacturer')::uuid,
    md5('irha-seo-cluster:en:football-kit-manufacturer')::uuid,
    md5('irha-seo-cluster:en:private-label-sportswear')::uuid,
    md5('irha-seo-cluster:en:heavyweight-hoodie-manufacturer')::uuid,
    md5('irha-seo-cluster:en:private-label-activewear')::uuid,
    md5('irha-seo-cluster:en:nightwear-pajama-manufacturer')::uuid
  ) and status = 'draft' and approved_at is null;

  select count(*) into draft_override_count
  from public.seo_page_overrides
  where notes like 'Draft only.%'
    and is_published = false
    and noindex = true;

  select count(*) into draft_link_count
  from public.internal_links
  where locale = 'en'
    and is_published = false
    and id::text in (
      select md5('irha-internal-link:en:' || from_route || '|' || to_route || '|' || anchor_text)::uuid::text
      from public.internal_links
      where locale = 'en'
    );

  select count(*) into draft_blog_count
  from public.blog_posts
  where author = 'Irha Apparels Editorial Review'
    and is_published = false
    and published_at is null;

  if draft_cluster_count <> 10 then
    raise exception 'expected 10 draft English B2B keyword clusters, found %', draft_cluster_count;
  end if;
  if draft_override_count < 6 then
    raise exception 'expected at least 6 unpublished noindex route overrides, found %', draft_override_count;
  end if;
  if draft_link_count < 12 then
    raise exception 'expected at least 12 unpublished internal-link plans, found %', draft_link_count;
  end if;
  if draft_blog_count < 5 then
    raise exception 'expected at least 5 unpublished buyer-guide drafts, found %', draft_blog_count;
  end if;

  if exists (
    select 1 from public.seo_localized_pages
    where locale in ('de-DE','de-AT','nl-NL')
      and (
        status <> 'draft'
        or noindex is not true
        or native_review_status <> 'required'
        or approved_at is not null
        or published_at is not null
        or base_route <> '/products/bavarian-trachten-wear'
        or json_ld->>'url' like 'https://www.irhaapparels.com%'
        or internal_links::text like '%/bavarian-heritage%'
        or internal_links::text like '%/request-quote%'
      )
  ) then
    raise exception 'localized drafts must remain noindex, unapproved and aligned to the apex modern route';
  end if;

  if exists (select 1 from public.seo_page_overrides where notes like 'Draft only.%' and is_published) then
    raise exception 'draft SEO overrides must not be published';
  end if;
  if exists (select 1 from public.internal_links where locale='en' and id::text in (
    select md5('irha-internal-link:en:' || from_route || '|' || to_route || '|' || anchor_text)::uuid::text
    from public.internal_links where locale='en'
  ) and is_published) then
    raise exception 'planned internal links must not be published';
  end if;
  if exists (select 1 from public.blog_posts where author='Irha Apparels Editorial Review' and is_published) then
    raise exception 'buyer-guide drafts must not be published';
  end if;
end
$$;

commit;
