-- Buyer-ready public taxonomy and catalogue RPC hardening.
-- Media order is validated by the public manifest and is not bulk-rewritten here,
-- because product_slot_media has per-row gallery synchronization triggers.

-- Empty audience nodes must not render as public "0 styles" pages.
update public.catalog_taxonomy_nodes audience
set publish_state = 'draft',
    seo_empty_state_reason = coalesce(seo_empty_state_reason, 'No approved published products assigned'),
    updated_at = now()
where audience.full_slug_path in ('sportswear/women', 'sportswear/unisex')
  and audience.depth = 1
  and audience.publish_state = 'published'
  and not exists (
    select 1
    from public.catalog_taxonomy_nodes leaf
    join public.product_taxonomy_assignments assignment
      on assignment.taxonomy_node_id = leaf.id
     and assignment.review_state = 'approved'
    join public.products product
      on product.id = assignment.product_id
     and product.is_published
     and product.publish_state = 'published'
    where leaf.parent_id = audience.id
      and leaf.publish_state = 'published'
  );

-- Trigger functions remain usable by PostgreSQL triggers, but must never be
-- directly executable through the public API by anonymous or generic users.
revoke all on function public.refresh_all_drive_product_galleries() from public, anon, authenticated;
revoke all on function public.sync_drive_product_gallery_from_media() from public, anon, authenticated;
revoke all on function public.sync_drive_product_gallery_from_slot() from public, anon, authenticated;
revoke all on function public.catalog_assign_drive_taxonomy_actor() from public, anon, authenticated;

grant execute on function public.refresh_all_drive_product_galleries() to service_role;
grant execute on function public.sync_drive_product_gallery_from_media() to service_role;
grant execute on function public.sync_drive_product_gallery_from_slot() to service_role;
grant execute on function public.catalog_assign_drive_taxonomy_actor() to service_role;

create index if not exists product_slot_media_media_asset_id_idx
  on public.product_slot_media(media_asset_id);
