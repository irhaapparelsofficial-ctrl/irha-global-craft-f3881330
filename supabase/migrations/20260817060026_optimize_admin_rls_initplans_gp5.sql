-- GP-5 database performance hardening: preserve the exact access model while
-- ensuring auth/admin checks are evaluated once per statement rather than once per row.

alter policy "admins insert pub events" on public.catalog_publication_events
  with check (
    (select public.has_role((select auth.uid()), 'admin'::public.app_role))
    and acted_by = (select auth.uid())
  );

alter policy "admins read pub events" on public.catalog_publication_events
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

alter policy "admins write slot completion" on public.catalog_slot_completion
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

-- This SELECT policy is redundant because the ALL policy above grants the same
-- admin-only SELECT access. Removing it reduces duplicate permissive evaluation.
drop policy if exists "admins read slot completion" on public.catalog_slot_completion;

alter policy "admins manage legacy redirects" on public.legacy_route_redirects
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

alter policy "admins write media briefs" on public.media_generation_briefs
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

-- Redundant with the admin-only ALL policy above.
drop policy if exists "admins read media briefs" on public.media_generation_briefs;

alter policy "admins insert media_placement_events" on public.media_placement_events
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

alter policy "admins read media_placement_events" on public.media_placement_events
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

alter policy "admins manage product_slot_media" on public.product_slot_media
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

alter policy "admins manage site_media_placements" on public.site_media_placements
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)))
  with check ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));

alter policy "seo_localized_pages_authenticated_read" on public.seo_localized_pages
  using (
    (
      status = 'published'::text
      and noindex = false
      and native_review_status = any (array['approved'::text, 'not_required'::text])
    )
    or (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  );
