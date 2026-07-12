-- Phase 2 / Batch 2.1: real admin-controlled website CMS.
-- Public visitors can read published JSON only through cms_get_published_document().
-- Drafts, revisions and mutations remain restricted to authenticated admins.

CREATE TABLE IF NOT EXISTS public.cms_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_key text NOT NULL UNIQUE CHECK (document_key ~ '^[a-z0-9][a-z0-9._-]{2,119}$'),
  document_type text NOT NULL CHECK (document_type IN ('site_settings', 'page', 'section')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  draft_content jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(draft_content) = 'object'),
  published_content jsonb CHECK (published_content IS NULL OR jsonb_typeof(published_content) = 'object'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  published_version integer CHECK (published_version IS NULL OR published_version > 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.cms_document_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.cms_documents(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  action text NOT NULL CHECK (action IN ('draft_saved', 'published', 'restored')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cms_documents_status_idx
  ON public.cms_documents (status, document_key);
CREATE INDEX IF NOT EXISTS cms_document_revisions_document_created_idx
  ON public.cms_document_revisions (document_id, created_at DESC);

ALTER TABLE public.cms_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_document_revisions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cms_documents' AND policyname = 'cms_documents_admin_select'
  ) THEN
    CREATE POLICY cms_documents_admin_select
      ON public.cms_documents
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cms_document_revisions' AND policyname = 'cms_document_revisions_admin_select'
  ) THEN
    CREATE POLICY cms_document_revisions_admin_select
      ON public.cms_document_revisions
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

REVOKE ALL ON TABLE public.cms_documents FROM anon;
REVOKE ALL ON TABLE public.cms_document_revisions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.cms_documents FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.cms_document_revisions FROM authenticated;
GRANT SELECT ON TABLE public.cms_documents TO authenticated;
GRANT SELECT ON TABLE public.cms_document_revisions TO authenticated;

CREATE OR REPLACE FUNCTION public.cms_get_published_document(_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.published_content
  FROM public.cms_documents d
  WHERE d.document_key = _key
    AND d.status = 'published'
    AND d.published_content IS NOT NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.cms_get_admin_document(_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'id', d.id,
    'key', d.document_key,
    'documentType', d.document_type,
    'title', d.title,
    'status', d.status,
    'version', d.version,
    'publishedVersion', d.published_version,
    'draftContent', d.draft_content,
    'publishedContent', d.published_content,
    'updatedAt', d.updated_at,
    'publishedAt', d.published_at,
    'revisions', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'version', r.version,
          'action', r.action,
          'content', r.content,
          'createdAt', r.created_at
        ) ORDER BY r.created_at DESC
      )
      FROM (
        SELECT id, version, action, content, created_at
        FROM public.cms_document_revisions
        WHERE document_id = d.id
        ORDER BY created_at DESC
        LIMIT 30
      ) r
    ), '[]'::jsonb)
  )
  INTO _result
  FROM public.cms_documents d
  WHERE d.document_key = _key
  LIMIT 1;

  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_save_draft(
  _key text,
  _document_type text,
  _title text,
  _content jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _document_id uuid;
  _version integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;
  IF _key IS NULL OR _key !~ '^[a-z0-9][a-z0-9._-]{2,119}$' THEN
    RAISE EXCEPTION 'invalid document key';
  END IF;
  IF _document_type NOT IN ('site_settings', 'page', 'section') THEN
    RAISE EXCEPTION 'invalid document type';
  END IF;
  IF _title IS NULL OR char_length(btrim(_title)) NOT BETWEEN 1 AND 160 THEN
    RAISE EXCEPTION 'invalid document title';
  END IF;
  IF _content IS NULL OR jsonb_typeof(_content) <> 'object' THEN
    RAISE EXCEPTION 'content must be a JSON object';
  END IF;

  INSERT INTO public.cms_documents (
    document_key,
    document_type,
    title,
    draft_content,
    status,
    version,
    created_by,
    updated_by
  )
  VALUES (
    _key,
    _document_type,
    btrim(_title),
    _content,
    'draft',
    1,
    auth.uid(),
    auth.uid()
  )
  ON CONFLICT (document_key) DO UPDATE
  SET document_type = EXCLUDED.document_type,
      title = EXCLUDED.title,
      draft_content = EXCLUDED.draft_content,
      status = 'draft',
      version = public.cms_documents.version + 1,
      updated_by = auth.uid(),
      updated_at = now()
  RETURNING id, version INTO _document_id, _version;

  INSERT INTO public.cms_document_revisions (document_id, version, content, action, created_by)
  VALUES (_document_id, _version, _content, 'draft_saved', auth.uid());

  RETURN public.cms_get_admin_document(_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_publish_document(_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _document_id uuid;
  _content jsonb;
  _version integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT id, draft_content, version
  INTO _document_id, _content, _version
  FROM public.cms_documents
  WHERE document_key = _key
  FOR UPDATE;

  IF _document_id IS NULL THEN
    RAISE EXCEPTION 'document not found';
  END IF;

  UPDATE public.cms_documents
  SET published_content = _content,
      published_version = _version,
      status = 'published',
      published_by = auth.uid(),
      published_at = now(),
      updated_by = auth.uid(),
      updated_at = now()
  WHERE id = _document_id;

  INSERT INTO public.cms_document_revisions (document_id, version, content, action, created_by)
  VALUES (_document_id, _version, _content, 'published', auth.uid());

  RETURN public.cms_get_admin_document(_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_restore_revision(_key text, _revision_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _document_id uuid;
  _content jsonb;
  _new_version integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT d.id, r.content
  INTO _document_id, _content
  FROM public.cms_documents d
  JOIN public.cms_document_revisions r ON r.document_id = d.id
  WHERE d.document_key = _key
    AND r.id = _revision_id
  LIMIT 1;

  IF _document_id IS NULL THEN
    RAISE EXCEPTION 'revision not found';
  END IF;

  UPDATE public.cms_documents
  SET draft_content = _content,
      status = 'draft',
      version = version + 1,
      updated_by = auth.uid(),
      updated_at = now()
  WHERE id = _document_id
  RETURNING version INTO _new_version;

  INSERT INTO public.cms_document_revisions (document_id, version, content, action, created_by)
  VALUES (_document_id, _new_version, _content, 'restored', auth.uid());

  RETURN public.cms_get_admin_document(_key);
END;
$$;

REVOKE ALL ON FUNCTION public.cms_get_published_document(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cms_get_admin_document(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cms_save_draft(text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cms_publish_document(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cms_restore_revision(text, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.cms_get_published_document(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cms_get_admin_document(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_save_draft(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_publish_document(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_restore_revision(text, uuid) TO authenticated;

-- Seed the current production hero so CMS activation causes no visual/content change.
INSERT INTO public.cms_documents (
  document_key,
  document_type,
  title,
  draft_content,
  published_content,
  status,
  version,
  published_version,
  created_at,
  updated_at,
  published_at
)
VALUES (
  'site.home.hero',
  'section',
  'Homepage Hero',
  jsonb_build_object(
    'slides', jsonb_build_array(
      jsonb_build_object(
        'eyebrow', 'Sialkot · Custom B2B Manufacturing',
        'title', 'Bavarian Wear',
        'highlight', 'Program-Based',
        'subtitle', 'Custom lederhosen, dirndl and Trachten programs for wholesalers, retailers and private-label buyers.',
        'ctaLabel', 'View Collection',
        'ctaHref', '/products/bavarian-trachten-wear'
      ),
      jsonb_build_object(
        'eyebrow', 'OEM · ODM · Private Label',
        'title', 'Streetwear & Sportswear',
        'highlight', 'Made to Requirement',
        'subtitle', 'Custom sportswear, tracksuits and streetwear programs developed around buyer specifications.',
        'ctaLabel', 'View Collection',
        'ctaHref', '/products/sportswear'
      ),
      jsonb_build_object(
        'eyebrow', 'Custom Leather Programs',
        'title', 'Leather Apparel',
        'highlight', 'Requirement-Led',
        'subtitle', 'Custom leather jackets and apparel programs reviewed against material, construction and branding requirements.',
        'ctaLabel', 'View Collection',
        'ctaHref', '/products/premium-leather-apparel'
      )
    )
  ),
  jsonb_build_object(
    'slides', jsonb_build_array(
      jsonb_build_object(
        'eyebrow', 'Sialkot · Custom B2B Manufacturing',
        'title', 'Bavarian Wear',
        'highlight', 'Program-Based',
        'subtitle', 'Custom lederhosen, dirndl and Trachten programs for wholesalers, retailers and private-label buyers.',
        'ctaLabel', 'View Collection',
        'ctaHref', '/products/bavarian-trachten-wear'
      ),
      jsonb_build_object(
        'eyebrow', 'OEM · ODM · Private Label',
        'title', 'Streetwear & Sportswear',
        'highlight', 'Made to Requirement',
        'subtitle', 'Custom sportswear, tracksuits and streetwear programs developed around buyer specifications.',
        'ctaLabel', 'View Collection',
        'ctaHref', '/products/sportswear'
      ),
      jsonb_build_object(
        'eyebrow', 'Custom Leather Programs',
        'title', 'Leather Apparel',
        'highlight', 'Requirement-Led',
        'subtitle', 'Custom leather jackets and apparel programs reviewed against material, construction and branding requirements.',
        'ctaLabel', 'View Collection',
        'ctaHref', '/products/premium-leather-apparel'
      )
    )
  ),
  'published',
  1,
  1,
  now(),
  now(),
  now()
)
ON CONFLICT (document_key) DO NOTHING;

INSERT INTO public.cms_document_revisions (document_id, version, content, action)
SELECT d.id, 1, d.published_content, 'published'
FROM public.cms_documents d
WHERE d.document_key = 'site.home.hero'
  AND NOT EXISTS (
    SELECT 1
    FROM public.cms_document_revisions r
    WHERE r.document_id = d.id
  );
