-- Phase 3 / Batch 3.4: Daily Owner Command Center.
-- Deferred per owner instruction. Apply once during final backend activation.

CREATE TABLE IF NOT EXISTS public.crm_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  module text NOT NULL CHECK (module IN ('pipeline', 'buyer360', 'commercial', 'leads')),
  preset_key text NOT NULL CHECK (preset_key IN (
    'all_actions', 'overdue_sales', 'unassigned', 'quote_review',
    'active_samples', 'meetings_today', 'new_buyers'
  )),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(filters) = 'object'),
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_saved_views_one_default_per_owner
  ON public.crm_saved_views (owner_user_id)
  WHERE is_default = true;
CREATE INDEX IF NOT EXISTS crm_saved_views_owner_sort_idx
  ON public.crm_saved_views (owner_user_id, sort_order, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'sales' CHECK (role IN ('owner', 'sales', 'operations', 'marketing', 'viewer')),
  active boolean NOT NULL DEFAULT true,
  can_send boolean NOT NULL DEFAULT false,
  can_approve_quotes boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'Asia/Karachi',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  CHECK (role = 'owner' OR can_approve_quotes = false)
);

CREATE INDEX IF NOT EXISTS crm_team_members_active_role_idx
  ON public.crm_team_members (active, role, name);

CREATE TABLE IF NOT EXISTS public.crm_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL UNIQUE,
  metrics jsonb NOT NULL CHECK (jsonb_typeof(metrics) = 'object'),
  workload jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(workload) = 'array'),
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(highlights) = 'array'),
  generated_by text,
  generated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_daily_reports_date_idx
  ON public.crm_daily_reports (report_date DESC);

CREATE TABLE IF NOT EXISTS public.crm_workspace_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_admin_view text NOT NULL DEFAULT 'overview',
  default_saved_view_id uuid REFERENCES public.crm_saved_views(id) ON DELETE SET NULL,
  compact_mode boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'Asia/Karachi',
  daily_report_enabled boolean NOT NULL DEFAULT false,
  daily_report_hour smallint NOT NULL DEFAULT 8 CHECK (daily_report_hour BETWEEN 0 AND 23),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(preferences) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_workspace_preferences ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'crm_saved_views',
    'crm_team_members',
    'crm_daily_reports',
    'crm_workspace_preferences'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = target_table
        AND policyname = target_table || '_admin_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))',
        target_table || '_admin_all',
        target_table
      );
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON TABLE public.crm_saved_views FROM anon;
REVOKE ALL ON TABLE public.crm_team_members FROM anon;
REVOKE ALL ON TABLE public.crm_daily_reports FROM anon;
REVOKE ALL ON TABLE public.crm_workspace_preferences FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_saved_views TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_daily_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_workspace_preferences TO authenticated;

CREATE OR REPLACE FUNCTION public.crm_owner_workspace_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  IF TG_TABLE_NAME = 'crm_saved_views' THEN
    NEW.name := btrim(NEW.name);
    NEW.owner_user_id := COALESCE(NEW.owner_user_id, auth.uid());
  ELSIF TG_TABLE_NAME = 'crm_team_members' THEN
    NEW.name := btrim(NEW.name);
    NEW.email := lower(btrim(NEW.email));
    NEW.timezone := btrim(NEW.timezone);
    IF NEW.role = 'owner' THEN
      NEW.can_approve_quotes := true;
    END IF;
  ELSIF TG_TABLE_NAME = 'crm_daily_reports' THEN
    NEW.generated_by_user_id := COALESCE(NEW.generated_by_user_id, auth.uid());
    NEW.generated_at := COALESCE(NEW.generated_at, now());
  ELSIF TG_TABLE_NAME = 'crm_workspace_preferences' THEN
    NEW.user_id := COALESCE(NEW.user_id, auth.uid());
  END IF;

  NEW.updated_at := now();
  IF TG_TABLE_NAME IN ('crm_saved_views', 'crm_team_members') THEN
    NEW.updated_by := auth.uid();
    IF TG_OP = 'INSERT' THEN
      NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_saved_views_before_write_trigger ON public.crm_saved_views;
CREATE TRIGGER crm_saved_views_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.crm_saved_views
  FOR EACH ROW EXECUTE FUNCTION public.crm_owner_workspace_before_write();

DROP TRIGGER IF EXISTS crm_team_members_before_write_trigger ON public.crm_team_members;
CREATE TRIGGER crm_team_members_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.crm_team_members
  FOR EACH ROW EXECUTE FUNCTION public.crm_owner_workspace_before_write();

DROP TRIGGER IF EXISTS crm_daily_reports_before_write_trigger ON public.crm_daily_reports;
CREATE TRIGGER crm_daily_reports_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.crm_daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.crm_owner_workspace_before_write();

DROP TRIGGER IF EXISTS crm_workspace_preferences_before_write_trigger ON public.crm_workspace_preferences;
CREATE TRIGGER crm_workspace_preferences_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.crm_workspace_preferences
  FOR EACH ROW EXECUTE FUNCTION public.crm_owner_workspace_before_write();

CREATE OR REPLACE FUNCTION public.crm_saved_view_default_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.crm_saved_views
    SET is_default = false,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE owner_user_id = NEW.owner_user_id
      AND id IS DISTINCT FROM NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_saved_view_default_guard_trigger ON public.crm_saved_views;
CREATE TRIGGER crm_saved_view_default_guard_trigger
  BEFORE INSERT OR UPDATE OF is_default ON public.crm_saved_views
  FOR EACH ROW EXECUTE FUNCTION public.crm_saved_view_default_guard();

REVOKE ALL ON FUNCTION public.crm_owner_workspace_before_write() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_saved_view_default_guard() FROM PUBLIC;
