-- IRHA APPARELS — GP-3 keyword universe + information architecture authority
-- Model: IRHA-GP3-20260810-V1
-- Scope: reconcile the existing seo_keyword_clusters source of truth only.
-- No public pages are created here; GP-4 remains responsible for commercial-page content.

-- Approved English drive clusters own each published product's exact canonical URL.
with mapped as (
  select
    k.id,
    p.id as product_id,
    p.reference_code,
    p.canonical_path,
    p.main_category,
    p.audience_group,
    p.product_type,
    regexp_replace(p.canonical_path, '/[^/]+$', '') as parent_path
  from seo_keyword_clusters k
  join products p
    on k.cluster_name = 'drive-' || lower(p.reference_code) || '-en'
  where k.locale = 'en'
    and k.status = 'approved'
    and p.is_published
    and p.publish_state = 'published'
)
update seo_keyword_clusters k
set source_notes = jsonb_set(
      coalesce(k.source_notes, '{}'::jsonb),
      '{gp3}',
      jsonb_build_object(
        'model_version','IRHA-GP3-20260810-V1',
        'disposition','PRODUCT TARGET',
        'language',k.locale,
        'market',k.market,
        'intent_classification',k.search_intent,
        'query_family','product:' || m.reference_code,
        'preferred_url',m.canonical_path,
        'destination_status','published_product',
        'authority_kind','product',
        'division',m.main_category,
        'audience',m.audience_group,
        'product_type',m.product_type,
        'product_reference',m.reference_code,
        'product_id',m.product_id,
        'indexation_status','indexable',
        'conflict_status','primary_owner',
        'internal_link_parent',m.parent_path,
        'evidence_sources',jsonb_build_array('approved_keyword_cluster','authoritative_product_record','current_published_taxonomy')
      ),
      true
    ),
    updated_at = now()
from mapped m
where k.id = m.id;

-- Reviewed localized drive research inherits the English product authority but stays non-indexable.
with mapped as (
  select
    k.id,
    p.id as product_id,
    p.reference_code,
    p.canonical_path,
    p.main_category,
    p.audience_group,
    p.product_type,
    regexp_replace(p.canonical_path, '/[^/]+$', '') as parent_path,
    owner.id as owner_cluster_id
  from seo_keyword_clusters k
  join products p
    on k.cluster_name like 'drive-' || lower(p.reference_code) || '-%'
  join seo_keyword_clusters owner
    on owner.cluster_name = 'drive-' || lower(p.reference_code) || '-en'
   and owner.locale = 'en'
   and owner.status = 'approved'
  where k.status = 'reviewed'
    and k.locale <> 'en'
    and k.cluster_name ~ '^drive-p[0-9]{3}-'
    and p.is_published
    and p.publish_state = 'published'
)
update seo_keyword_clusters k
set source_notes = jsonb_set(
      coalesce(k.source_notes, '{}'::jsonb),
      '{gp3}',
      jsonb_build_object(
        'model_version','IRHA-GP3-20260810-V1',
        'disposition','LOCALIZED CANDIDATE — DO NOT INDEX YET',
        'language',k.locale,
        'market',k.market,
        'intent_classification',k.search_intent,
        'query_family','product:' || m.reference_code,
        'preferred_url',m.canonical_path,
        'destination_status','published_english_canonical',
        'authority_kind','product',
        'division',m.main_category,
        'audience',m.audience_group,
        'product_type',m.product_type,
        'product_reference',m.reference_code,
        'product_id',m.product_id,
        'authority_owner_cluster_id',m.owner_cluster_id,
        'indexation_status','do_not_index_until_native_review',
        'conflict_status','localized_supporting_nonindex',
        'internal_link_parent',m.parent_path,
        'evidence_sources',jsonb_build_array('localized_keyword_research','authoritative_product_record','current_published_taxonomy')
      ),
      true
    ),
    updated_at = now()
from mapped m
where k.id = m.id;

-- Semantic duplicate product clusters merge into the canonical English product owner.
with mapped as (
  select
    k.id,
    p.id as product_id,
    p.reference_code,
    p.canonical_path,
    p.main_category,
    p.audience_group,
    p.product_type,
    regexp_replace(p.canonical_path, '/[^/]+$', '') as parent_path,
    owner.id as owner_cluster_id
  from seo_keyword_clusters k
  join products p
    on p.slug = k.product_focus[1]
   and p.is_published
   and p.publish_state = 'published'
  join seo_keyword_clusters owner
    on owner.cluster_name = 'drive-' || lower(p.reference_code) || '-en'
   and owner.locale = 'en'
   and owner.status = 'approved'
  where k.status = 'reviewed'
    and k.cluster_name !~* 'p[0-9]{3}'
)
update seo_keyword_clusters k
set source_notes = jsonb_set(
      coalesce(k.source_notes, '{}'::jsonb),
      '{gp3}',
      jsonb_build_object(
        'model_version','IRHA-GP3-20260810-V1',
        'disposition',case when k.locale = 'en' then 'MERGE WITH ANOTHER CLUSTER' else 'LOCALIZED CANDIDATE — DO NOT INDEX YET' end,
        'language',k.locale,
        'market',k.market,
        'intent_classification',k.search_intent,
        'query_family','product:' || m.reference_code,
        'preferred_url',m.canonical_path,
        'destination_status',case when k.locale = 'en' then 'published_product' else 'published_english_canonical' end,
        'authority_kind','product',
        'division',m.main_category,
        'audience',m.audience_group,
        'product_type',m.product_type,
        'product_reference',m.reference_code,
        'product_id',m.product_id,
        'authority_owner_cluster_id',m.owner_cluster_id,
        'indexation_status',case when k.locale = 'en' then 'merge_into_primary_cluster' else 'do_not_index_until_native_review' end,
        'conflict_status','duplicate_cluster_supporting_only',
        'internal_link_parent',m.parent_path,
        'evidence_sources',jsonb_build_array('semantic_duplicate_keyword_cluster','authoritative_product_record','current_published_taxonomy')
      ),
      true
    ),
    updated_at = now()
from mapped m
where k.id = m.id;

-- Legacy semantic research whose exact product is non-public resolves to a current product-type authority.
with legacy_focus(focus_slug,preferred_url,division,audience,product_type,query_family) as (
  values
    ('custom-soccer-uniform-kit','/products/sportswear/team-club/team-uniforms','Custom Sportswear & Teamwear','Team & Club','Team Uniforms','product-type:sportswear:team-uniforms'),
    ('leather-trousers','/products/premium-leather-apparel/men/pants-joggers','Custom Leather Apparel','Men','Pants & Joggers','product-type:leather:men:pants-joggers'),
    ('oversized-graphic-t-shirt','/products/streetwear-activewear/unisex/tops','Private Label Streetwear & Activewear','Unisex','Tops','product-type:streetwear:unisex:tops'),
    ('womens-silk-nightgown','/products/leisure-nightwear/women/nightgowns-sleep-shirts','Private Label Leisurewear & Nightwear','Women','Nightgowns & Sleep Shirts','product-type:nightwear:women:nightgowns-sleep-shirts')
), mapped as (
  select k.id,k.locale,k.market,k.search_intent,l.*
  from seo_keyword_clusters k
  join legacy_focus l on l.focus_slug = k.product_focus[1]
  where k.status = 'reviewed'
    and k.cluster_name !~* 'p[0-9]{3}'
)
update seo_keyword_clusters k
set source_notes = jsonb_set(
      coalesce(k.source_notes, '{}'::jsonb),
      '{gp3}',
      jsonb_build_object(
        'model_version','IRHA-GP3-20260810-V1',
        'disposition',case when k.locale = 'en' then 'PRODUCT-TYPE TARGET' else 'LOCALIZED CANDIDATE — DO NOT INDEX YET' end,
        'language',k.locale,
        'market',k.market,
        'intent_classification',k.search_intent,
        'query_family',m.query_family,
        'preferred_url',m.preferred_url,
        'destination_status','published_product_type',
        'authority_kind','product_type',
        'division',m.division,
        'audience',m.audience,
        'product_type',m.product_type,
        'legacy_product_focus',m.focus_slug,
        'indexation_status',case when k.locale = 'en' then 'indexable_via_product_type' else 'do_not_index_until_native_review' end,
        'conflict_status','legacy_nonpublic_product_reconciled',
        'internal_link_parent',regexp_replace(m.preferred_url, '/[^/]+$', ''),
        'evidence_sources',jsonb_build_array('legacy_keyword_research','current_published_taxonomy')
      ),
      true
    ),
    updated_at = now()
from mapped m
where k.id = m.id;

-- P135 exists only as a draft product; retain its eight research clusters without inventing a public target.
with mapped as (
  select k.id,p.id as product_id,p.reference_code,p.main_category,p.audience_group,p.product_type
  from seo_keyword_clusters k
  join products p on p.reference_code = 'P135'
  where k.status = 'draft'
    and k.cluster_name ~* 'p135'
)
update seo_keyword_clusters k
set source_notes = jsonb_set(
      coalesce(k.source_notes, '{}'::jsonb),
      '{gp3}',
      jsonb_build_object(
        'model_version','IRHA-GP3-20260810-V1',
        'disposition','NEEDS MORE DATA',
        'language',k.locale,
        'market',k.market,
        'intent_classification',k.search_intent,
        'query_family','draft-product:P135',
        'preferred_url',null,
        'destination_status','draft_product_nonpublic',
        'authority_kind','nonpublic_product_research',
        'division',m.main_category,
        'audience',m.audience_group,
        'product_type',m.product_type,
        'product_reference',m.reference_code,
        'product_id',m.product_id,
        'indexation_status','nonpublic',
        'conflict_status','no_public_destination',
        'internal_link_parent',null,
        'evidence_sources',jsonb_build_array('draft_keyword_research','authoritative_nonpublic_product_record')
      ),
      true
    ),
    updated_at = now()
from mapped m
where k.id = m.id;

-- Strategic commercial research: remove archived target authority and rank GP-4 candidates without publishing GP-4 pages.
with commercial_map(cluster_id,preferred_url,authority_kind,query_family,division,audience,product_type,gp4_priority,target_change) as (
  values
    ('107dd382-9213-6102-4843-1ea200d5c5b2'::uuid,'/products/sportswear/team-club/team-uniforms','product_type','commercial:custom-football-teamwear-manufacturer','Custom Sportswear & Teamwear','Team & Club','Team Uniforms',1,'remapped_from_archived'),
    ('7dc90601-0964-19b4-f266-5542317c29a2'::uuid,'/products/bavarian-trachten-wear/men/lederhosen','product_type','commercial:lederhosen-manufacturer','Bavarian & Trachten Clothing','Men','Lederhosen',2,'remapped_from_archived'),
    ('3cc50a54-6889-3ccf-1c2b-c720899972cf'::uuid,'/products/sportswear','main_category','commercial:private-label-sportswear-manufacturer','Custom Sportswear & Teamwear',null,null,3,'remapped_from_archived'),
    ('65c32851-f253-d8e8-2a99-ec0d262f398b'::uuid,'/products/premium-leather-apparel/men/jackets-outerwear','product_type','commercial:private-label-leather-jacket-manufacturer','Custom Leather Apparel','Men','Jackets & Outerwear',4,'remapped_from_archived'),
    ('645e1f0d-aa75-e49c-421d-25850e81dd0e'::uuid,'/products/streetwear-activewear','main_category','commercial:private-label-heavyweight-hoodie-streetwear-manufacturer','Private Label Streetwear & Activewear',null,null,5,'remapped_from_archived'),
    ('01b7a4a2-df80-c68d-0146-6c73cde4a994'::uuid,'/products/bavarian-trachten-wear/women/dirndl-dresses','product_type','commercial:private-label-dirndl-manufacturer','Bavarian & Trachten Clothing','Women','Dirndl Dresses',6,'kept_current_canonical'),
    ('70c1ddda-d0ea-a824-c6a3-bd0a856669f3'::uuid,'/products/leisure-nightwear','main_category','commercial:private-label-nightwear-pajama-manufacturer','Private Label Leisurewear & Nightwear',null,null,7,'remapped_from_archived'),
    ('d192ec89-23a3-6136-5c71-df66d06e46a4'::uuid,'/products/sportswear/fitness-activewear/performance-activewear','product_type','commercial:private-label-activewear-manufacturer','Custom Sportswear & Teamwear','Fitness & Activewear','Performance Activewear',8,'remapped_from_archived'),
    ('a11e0a13-0e8f-99de-9527-af20213fb46c'::uuid,'/products/premium-leather-apparel/accessories','accessories','commercial:private-label-leather-accessories-manufacturer','Custom Leather Apparel','Accessories',null,9,'remapped_from_archived'),
    ('aeb07b24-d5fc-7bfd-94b8-a137664c0839'::uuid,'/products/bavarian-trachten-wear/men','audience','commercial:trachten-shirt-vest-manufacturer','Bavarian & Trachten Clothing','Men',null,10,'kept_current_canonical')
), mapped as (
  select
    k.id,k.locale,k.market,k.search_intent,k.cluster_name,
    coalesce(k.source_notes->'gp3'->>'legacy_target_route', k.source_notes->>'target_route') as legacy_target_route,
    m.*
  from seo_keyword_clusters k
  join commercial_map m on m.cluster_id = k.id
)
update seo_keyword_clusters k
set source_notes = jsonb_set(
      jsonb_set(coalesce(k.source_notes, '{}'::jsonb), '{target_route}', to_jsonb(m.preferred_url), true),
      '{gp3}',
      jsonb_build_object(
        'model_version','IRHA-GP3-20260810-V1',
        'disposition','COMMERCIAL/MONEY-PAGE CANDIDATE FOR GP-4',
        'language',k.locale,
        'market',k.market,
        'intent_classification',k.search_intent,
        'query_family',m.query_family,
        'preferred_url',m.preferred_url,
        'destination_status','existing_current_canonical',
        'authority_kind',m.authority_kind,
        'division',m.division,
        'audience',m.audience,
        'product_type',m.product_type,
        'legacy_target_route',m.legacy_target_route,
        'target_change',m.target_change,
        'gp4_priority',m.gp4_priority,
        'gp4_candidate_name',k.cluster_name,
        'indexation_status','indexable_existing_authority',
        'conflict_status','single_current_authority_gp4_candidate',
        'internal_link_parent',case when m.authority_kind = 'main_category' then '/products' else regexp_replace(m.preferred_url, '/[^/]+$', '') end,
        'evidence_sources',jsonb_build_array('preexisting_commercial_cluster','current_published_taxonomy','gp2_gsc_baseline_reviewed')
      ),
      true
    ),
    updated_at = now()
from mapped m
where k.id = m.cluster_id;

-- Broad localized Trachten commercial research remains non-indexable pending native review.
update seo_keyword_clusters k
set source_notes = jsonb_set(
      coalesce(k.source_notes, '{}'::jsonb),
      '{gp3}',
      jsonb_build_object(
        'model_version','IRHA-GP3-20260810-V1',
        'disposition','LOCALIZED CANDIDATE — DO NOT INDEX YET',
        'language',k.locale,
        'market',k.market,
        'intent_classification',k.search_intent,
        'query_family','commercial:localized-trachten-manufacturer',
        'preferred_url','/products/bavarian-trachten-wear',
        'destination_status','published_english_canonical',
        'authority_kind','main_category',
        'division','Bavarian & Trachten Clothing',
        'audience',null,
        'product_type',null,
        'indexation_status','do_not_index_until_native_review',
        'conflict_status','localized_supporting_nonindex',
        'internal_link_parent','/products',
        'evidence_sources',jsonb_build_array('localized_commercial_research','current_published_taxonomy')
      ),
      true
    ),
    updated_at = now()
where k.status = 'draft'
  and k.id in (
    '125be06d-7c64-4c24-b106-824dfc9f871a'::uuid,
    'ef8901b1-59e4-4c2d-aa14-096bf0960b49'::uuid,
    '2f39f364-2f62-4391-a6c0-eba545e31c16'::uuid
  );

-- Classify only modifiers that actually occur in cluster evidence; do not synthesize unsupported product facts.
with classified as (
  select
    id,
    lower(
      coalesce(array_to_string(seed_keywords, ' '), '') || ' ' ||
      coalesce(primary_keywords::text, '') || ' ' ||
      coalesce(supporting_keywords::text, '')
    ) as corpus
  from seo_keyword_clusters
  where source_notes->'gp3'->>'model_version' = 'IRHA-GP3-20260810-V1'
)
update seo_keyword_clusters k
set source_notes = jsonb_set(
      jsonb_set(
        k.source_notes,
        '{gp3,relationship_modifiers}',
        to_jsonb(array_remove(array[
          case when c.corpus like '%manufacturer%' then 'manufacturer' end,
          case when c.corpus like '%private label%' or c.corpus like '%private-label%' then 'private label' end,
          case when c.corpus ~ '\moem\M' then 'OEM' end,
          case when c.corpus ~ '\modm\M' then 'ODM' end,
          case when c.corpus like '%wholesale%' or c.corpus like '%wholesaler%' then 'wholesale' end,
          case when c.corpus like '%supplier%' then 'supplier' end,
          case when c.corpus like '%bulk%' then 'bulk' end,
          case when c.corpus like '%custom%' then 'custom' end,
          case when c.corpus like '%sourcing%' then 'sourcing' end
        ]::text[], null)),
        true
      ),
      '{gp3,specification_modifiers}',
      to_jsonb(array_remove(array[
        case when c.corpus like '%gsm%' then 'GSM' end,
        case when c.corpus like '%leather%' then 'leather' end,
        case when c.corpus like '%suede%' then 'suede' end,
        case when c.corpus like '%embroider%' then 'embroidery' end,
        case when c.corpus like '%sublimat%' then 'sublimation' end,
        case when c.corpus like '%print%' then 'printing' end,
        case when c.corpus like '%label%' then 'labels' end,
        case when c.corpus like '%packag%' then 'packaging' end,
        case when c.corpus like '%sizing%' or c.corpus like '% size %' then 'sizing' end,
        case when c.corpus like '%construct%' then 'construction' end
      ]::text[], null)),
      true
    ),
    updated_at = now()
from classified c
where k.id = c.id;

-- Fail closed if catalogue/keyword truth drifted before this migration executes.
do $$
declare
  v_total integer;
  v_reconciled integer;
  v_product_targets integer;
  v_merge_clusters integer;
  v_product_type_targets integer;
  v_gp4_candidates integer;
  v_localized_nonindex integer;
  v_needs_more_data integer;
  v_product_coverage integer;
  v_archived_targets integer;
  v_unknown_destinations integer;
  v_multi_authority integer;
  v_parentage integer;
begin
  select
    count(*),
    count(*) filter (where source_notes->'gp3'->>'model_version' = 'IRHA-GP3-20260810-V1'),
    count(*) filter (where source_notes->'gp3'->>'disposition' = 'PRODUCT TARGET'),
    count(*) filter (where source_notes->'gp3'->>'disposition' = 'MERGE WITH ANOTHER CLUSTER'),
    count(*) filter (where source_notes->'gp3'->>'disposition' = 'PRODUCT-TYPE TARGET'),
    count(*) filter (where source_notes->'gp3'->>'disposition' = 'COMMERCIAL/MONEY-PAGE CANDIDATE FOR GP-4'),
    count(*) filter (where source_notes->'gp3'->>'disposition' = 'LOCALIZED CANDIDATE — DO NOT INDEX YET'),
    count(*) filter (where source_notes->'gp3'->>'disposition' = 'NEEDS MORE DATA')
  into v_total,v_reconciled,v_product_targets,v_merge_clusters,v_product_type_targets,v_gp4_candidates,v_localized_nonindex,v_needs_more_data
  from seo_keyword_clusters;

  if v_total <> 2173 or v_reconciled <> 2173 then
    raise exception 'GP-3 keyword coverage mismatch: total %, reconciled %', v_total, v_reconciled;
  end if;

  if v_product_targets <> 254
     or v_merge_clusters <> 11
     or v_product_type_targets <> 4
     or v_gp4_candidates <> 10
     or v_localized_nonindex <> 1886
     or v_needs_more_data <> 8 then
    raise exception 'GP-3 classification mismatch: product %, merge %, product_type %, gp4 %, localized %, needs_data %',
      v_product_targets,v_merge_clusters,v_product_type_targets,v_gp4_candidates,v_localized_nonindex,v_needs_more_data;
  end if;

  select count(distinct source_notes->'gp3'->>'product_id')
  into v_product_coverage
  from seo_keyword_clusters
  where source_notes->'gp3'->>'disposition' = 'PRODUCT TARGET';

  if v_product_coverage <> 254 then
    raise exception 'GP-3 published product keyword ownership mismatch: %', v_product_coverage;
  end if;

  select count(*)
  into v_archived_targets
  from seo_keyword_clusters k
  join catalog_taxonomy_nodes n
    on '/products/' || n.full_slug_path = k.source_notes->>'target_route'
  where n.publish_state = 'archived';

  if v_archived_targets <> 0 then
    raise exception 'GP-3 active keyword targets still reference archived taxonomy: %', v_archived_targets;
  end if;

  select count(*)
  into v_unknown_destinations
  from seo_keyword_clusters k
  where k.source_notes->'gp3'->>'model_version' = 'IRHA-GP3-20260810-V1'
    and k.source_notes->'gp3'->>'preferred_url' is not null
    and not exists (
      select 1 from products p
      where p.is_published
        and p.publish_state = 'published'
        and p.canonical_path = k.source_notes->'gp3'->>'preferred_url'
    )
    and not exists (
      select 1 from catalog_taxonomy_nodes n
      where n.publish_state = 'published'
        and '/products/' || n.full_slug_path = k.source_notes->'gp3'->>'preferred_url'
    );

  if v_unknown_destinations <> 0 then
    raise exception 'GP-3 preferred URLs without a published authority: %', v_unknown_destinations;
  end if;

  select count(*)
  into v_multi_authority
  from (
    select source_notes->'gp3'->>'query_family' as query_family
    from seo_keyword_clusters
    where source_notes->'gp3'->>'model_version' = 'IRHA-GP3-20260810-V1'
      and source_notes->'gp3'->>'preferred_url' is not null
    group by 1
    having count(distinct source_notes->'gp3'->>'preferred_url') > 1
  ) conflicts;

  if v_multi_authority <> 0 then
    raise exception 'GP-3 query families with multiple primary destinations: %', v_multi_authority;
  end if;

  with published_products as (
    select id,regexp_replace(canonical_path, '/[^/]+$', '') as parent_path
    from products
    where is_published and publish_state = 'published'
  )
  select count(*)
  into v_parentage
  from published_products p
  join catalog_taxonomy_nodes n
    on '/products/' || n.full_slug_path = p.parent_path
   and n.publish_state = 'published'
   and n.node_type = 'product_type'
  join product_taxonomy_assignments a
    on a.product_id = p.id
   and a.taxonomy_node_id = n.id
   and a.review_state = 'approved';

  if v_parentage <> 254 then
    raise exception 'GP-3 published product taxonomy parentage mismatch: %', v_parentage;
  end if;
end $$;
