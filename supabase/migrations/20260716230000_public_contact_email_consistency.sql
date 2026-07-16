-- Keep the public-facing website contact identity consistent with the verified
-- domain mailbox. The Gmail address remains reserved for owner authentication
-- and internal account administration.

WITH updated AS (
  UPDATE public.cms_documents
  SET
    draft_content = jsonb_set(
      COALESCE(draft_content, '{}'::jsonb),
      '{brand,email}',
      to_jsonb('info@irhaapparels.com'::text),
      true
    ),
    published_content = jsonb_set(
      COALESCE(published_content, '{}'::jsonb),
      '{brand,email}',
      to_jsonb('info@irhaapparels.com'::text),
      true
    ),
    version = version + 1,
    published_version = published_version + 1,
    updated_at = now(),
    published_at = now()
  WHERE document_key = 'site.global.settings'
    AND (
      draft_content #>> '{brand,email}' IS DISTINCT FROM 'info@irhaapparels.com'
      OR published_content #>> '{brand,email}' IS DISTINCT FROM 'info@irhaapparels.com'
    )
  RETURNING id, version, published_content
)
INSERT INTO public.cms_document_revisions (document_id, version, content, action)
SELECT id, version, published_content, 'published'
FROM updated
ON CONFLICT DO NOTHING;
