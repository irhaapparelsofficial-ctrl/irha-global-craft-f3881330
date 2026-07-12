-- Phase 3 / Batch 3.2: Buyer 360 profile support.
-- Deferred per owner instruction. Apply once during final backend activation.

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('inquiry', 'catalogue', 'prospect')),
  source_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  job_title text,
  email text,
  phone text,
  whatsapp text,
  linkedin_url text,
  is_primary boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR phone IS NOT NULL OR whatsapp IS NOT NULL OR linkedin_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS crm_contacts_source_idx
  ON public.crm_contacts (source_type, source_id, is_primary DESC, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_source_email_unique
  ON public.crm_contacts (source_type, source_id, lower(email))
  WHERE email IS NOT NULL AND status = 'active';

CREATE TABLE IF NOT EXISTS public.crm_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('inquiry', 'catalogue', 'prospect')),
  source_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 2 AND 10000),
  pinned boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_notes_source_idx
  ON public.crm_notes (source_type, source_id, pinned DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('inquiry', 'catalogue', 'prospect')),
  source_id uuid NOT NULL,
  bucket text NOT NULL DEFAULT 'crm-private-files',
  object_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 26214400),
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('reference', 'tech_pack', 'quotation', 'sample', 'compliance', 'shipping', 'other')),
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_files_source_idx
  ON public.crm_files (source_type, source_id, category, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_record_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  left_source_type text NOT NULL CHECK (left_source_type IN ('inquiry', 'catalogue', 'prospect')),
  left_source_id uuid NOT NULL,
  right_source_type text NOT NULL CHECK (right_source_type IN ('inquiry', 'catalogue', 'prospect')),
  right_source_id uuid NOT NULL,
  link_type text NOT NULL CHECK (link_type IN ('same_buyer', 'duplicate', 'related')),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'rejected')),
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT (left_source_type = right_source_type AND left_source_id = right_source_id)),
  UNIQUE (left_source_type, left_source_id, right_source_type, right_source_id)
);

CREATE INDEX IF NOT EXISTS crm_record_links_left_idx
  ON public.crm_record_links (left_source_type, left_source_id, status);
CREATE INDEX IF NOT EXISTS crm_record_links_right_idx
  ON public.crm_record_links (right_source_type, right_source_id, status);

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_record_links ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['crm_contacts', 'crm_notes', 'crm_files', 'crm_record_links']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public'
        AND tablename=table_name
        AND policyname=table_name || '_admin_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))',
        table_name || '_admin_all', table_name
      );
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON TABLE public.crm_contacts FROM anon;
REVOKE ALL ON TABLE public.crm_notes FROM anon;
REVOKE ALL ON TABLE public.crm_files FROM anon;
REVOKE ALL ON TABLE public.crm_record_links FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_notes TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.crm_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_record_links TO authenticated;

CREATE OR REPLACE FUNCTION public.crm_buyer360_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  IF TG_TABLE_NAME = 'crm_contacts' THEN
    NEW.name := btrim(NEW.name);
    NEW.email := NULLIF(lower(btrim(NEW.email)), '');
    NEW.phone := NULLIF(btrim(NEW.phone), '');
    NEW.whatsapp := NULLIF(btrim(NEW.whatsapp), '');
    NEW.linkedin_url := NULLIF(btrim(NEW.linkedin_url), '');
  ELSIF TG_TABLE_NAME = 'crm_notes' THEN
    NEW.body := btrim(NEW.body);
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_contacts_before_write_trigger ON public.crm_contacts;
CREATE TRIGGER crm_contacts_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.crm_buyer360_before_write();

DROP TRIGGER IF EXISTS crm_notes_before_write_trigger ON public.crm_notes;
CREATE TRIGGER crm_notes_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.crm_notes
  FOR EACH ROW EXECUTE FUNCTION public.crm_buyer360_before_write();

DROP TRIGGER IF EXISTS crm_record_links_before_write_trigger ON public.crm_record_links;
CREATE TRIGGER crm_record_links_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.crm_record_links
  FOR EACH ROW EXECUTE FUNCTION public.crm_buyer360_before_write();

CREATE OR REPLACE FUNCTION public.crm_buyer360_activity_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_source_type text;
  event_source_id uuid;
  event_summary text;
  event_metadata jsonb;
BEGIN
  IF TG_TABLE_NAME = 'crm_contacts' THEN
    event_source_type := COALESCE(NEW.source_type, OLD.source_type);
    event_source_id := COALESCE(NEW.source_id, OLD.source_id);
    event_summary := CASE TG_OP
      WHEN 'INSERT' THEN 'Buyer contact added: ' || NEW.name
      WHEN 'UPDATE' THEN 'Buyer contact updated: ' || NEW.name
      ELSE 'Buyer contact removed: ' || OLD.name
    END;
    event_metadata := jsonb_build_object('contact_id', COALESCE(NEW.id, OLD.id), 'operation', lower(TG_OP));
  ELSIF TG_TABLE_NAME = 'crm_notes' THEN
    event_source_type := COALESCE(NEW.source_type, OLD.source_type);
    event_source_id := COALESCE(NEW.source_id, OLD.source_id);
    event_summary := CASE TG_OP
      WHEN 'INSERT' THEN 'Private note added'
      WHEN 'UPDATE' THEN 'Private note updated'
      ELSE 'Private note removed'
    END;
    event_metadata := jsonb_build_object('note_id', COALESCE(NEW.id, OLD.id), 'operation', lower(TG_OP));
  ELSIF TG_TABLE_NAME = 'crm_files' THEN
    event_source_type := COALESCE(NEW.source_type, OLD.source_type);
    event_source_id := COALESCE(NEW.source_id, OLD.source_id);
    event_summary := CASE TG_OP
      WHEN 'INSERT' THEN 'Private file added: ' || NEW.file_name
      ELSE 'Private file removed: ' || OLD.file_name
    END;
    event_metadata := jsonb_build_object('file_id', COALESCE(NEW.id, OLD.id), 'operation', lower(TG_OP), 'category', COALESCE(NEW.category, OLD.category));
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.crm_activity_events (
    source_type, source_id, event_type, summary, metadata, actor_id
  ) VALUES (
    event_source_type,
    event_source_id,
    CASE WHEN TG_TABLE_NAME = 'crm_notes' THEN 'note_added' ELSE 'record_updated' END,
    event_summary,
    event_metadata,
    auth.uid()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS crm_contacts_activity_trigger ON public.crm_contacts;
CREATE TRIGGER crm_contacts_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.crm_buyer360_activity_audit();

DROP TRIGGER IF EXISTS crm_notes_activity_trigger ON public.crm_notes;
CREATE TRIGGER crm_notes_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.crm_notes
  FOR EACH ROW EXECUTE FUNCTION public.crm_buyer360_activity_audit();

DROP TRIGGER IF EXISTS crm_files_activity_trigger ON public.crm_files;
CREATE TRIGGER crm_files_activity_trigger
  AFTER INSERT OR DELETE ON public.crm_files
  FOR EACH ROW EXECUTE FUNCTION public.crm_buyer360_activity_audit();

REVOKE ALL ON FUNCTION public.crm_buyer360_before_write() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_buyer360_activity_audit() FROM PUBLIC;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm-private-files',
  'crm-private-files',
  false,
  26214400,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv', 'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='crm_private_files_admin_select') THEN
    CREATE POLICY crm_private_files_admin_select ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id='crm-private-files' AND public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='crm_private_files_admin_insert') THEN
    CREATE POLICY crm_private_files_admin_insert ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id='crm-private-files' AND public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='crm_private_files_admin_delete') THEN
    CREATE POLICY crm_private_files_admin_delete ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id='crm-private-files' AND public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
