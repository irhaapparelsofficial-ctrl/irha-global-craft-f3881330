-- Align existing localized drafts to the canonical hierarchical URL contract.
-- Draft/noindex/native-review locks remain in place; no page is published.

begin;

update public.seo_localized_pages
set slug = 'bavarian-trachten-wear',
    base_route = '/products/bavarian-trachten-wear',
    path = '/intl/' || locale || '/products/bavarian-trachten-wear',
    json_ld = jsonb_set(
      json_ld,
      '{url}',
      to_jsonb('https://irhaapparels.com/intl/' || locale || '/products/bavarian-trachten-wear'),
      true
    ),
    quality_report = quality_report || jsonb_build_object(
      'localized_url_contract', '/intl/{locale}/products/{main-category}',
      'canonical_host', 'https://irhaapparels.com',
      'route_alignment_reviewed', false
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
where locale in ('de-DE', 'de-AT', 'nl-NL')
  and status <> 'published';

do $$
begin
  if (
    select count(*)
    from public.seo_localized_pages
    where locale in ('de-DE', 'de-AT', 'nl-NL')
      and slug = 'bavarian-trachten-wear'
      and base_route = '/products/bavarian-trachten-wear'
      and path = '/intl/' || locale || '/products/bavarian-trachten-wear'
      and json_ld->>'url' = 'https://irhaapparels.com/intl/' || locale || '/products/bavarian-trachten-wear'
      and status = 'draft'
      and noindex = true
      and native_review_status = 'required'
      and reviewed_at is null
      and approved_at is null
      and published_at is null
  ) <> 3 then
    raise exception 'all three localized drafts must use the hierarchical apex URL and remain locked from indexing';
  end if;
end
$$;

commit;
