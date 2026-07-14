-- Lead Conversion Engine: in-app alerts, duplicate review and daily owner reporting.
-- Safe defaults: no buyer message is sent, duplicates are never auto-merged, and all admin surfaces use RLS.

CREATE TABLE IF NOT EXISTS public.crm_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL CHECK (notification_type IN (
    'new_lead','overdue_follow_up','overdue_task','duplicate_candidate','daily_summary','system'
  )),
  source_type text CHECK (source_type IS NULL OR source_type IN ('inquiry','catalogue','prospect','task','system')),
  source_id uuid,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 240),
  body text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','attention','urgent')),
  status text NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read','archived')),
  dedupe_key text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_notifications_status_created_idx
  ON public.crm_notifications (status, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_notifications_source_idx
  ON public.crm_notifications (source_type, source_id, created_at DESC);

ALTER TABLE public.crm_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_notifications_admin_all ON public.crm_notifications;
CREATE POLICY crm_notifications_admin_all ON public.crm_notifications
  FOR ALL TO authenticated
  USING ((select public.has_role((select auth.uid()), 'admin')))
  WITH CHECK ((select public.has_role((select auth.uid()), 'admin')));
REVOKE ALL ON TABLE public.crm_notifications FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.crm_notification_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;
  NEW.title := btrim(NEW.title);
  NEW.updated_at := now();
  IF NEW.status = 'read' AND NEW.read_at IS NULL THEN NEW.read_at := now(); END IF;
  IF NEW.status = 'archived' AND NEW.archived_at IS NULL THEN NEW.archived_at := now(); END IF;
  IF NEW.status = 'unread' THEN NEW.read_at := NULL; NEW.archived_at := NULL; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_notification_before_write_trigger ON public.crm_notifications;
CREATE TRIGGER crm_notification_before_write_trigger
  BEFORE UPDATE ON public.crm_notifications
  FOR EACH ROW EXECUTE FUNCTION public.crm_notification_before_write();

CREATE OR REPLACE FUNCTION public.crm_new_public_lead_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _source_type text;
  _display text;
  _request text;
  _country text;
BEGIN
  IF TG_TABLE_NAME = 'inquiries' THEN
    _source_type := 'inquiry';
    _display := COALESCE(NULLIF(btrim(NEW.company), ''), NULLIF(btrim(NEW.name), ''), 'New buyer');
    _request := COALESCE(NULLIF(btrim(NEW.category), ''), NULLIF(btrim(NEW.intent), ''), 'General inquiry');
    _country := NULLIF(btrim(NEW.country), '');
  ELSIF TG_TABLE_NAME = 'catalogue_leads' THEN
    _source_type := 'catalogue';
    _display := COALESCE(NULLIF(btrim(NEW.company_name), ''), NULLIF(btrim(NEW.name), ''), 'New catalogue buyer');
    _request := COALESCE(NULLIF(btrim(NEW.category_interest), ''), 'Catalogue request');
    _country := NULLIF(btrim(NEW.country), '');
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.crm_notifications (
    notification_type, source_type, source_id, title, body, severity, dedupe_key, metadata
  ) VALUES (
    'new_lead', _source_type, NEW.id,
    'New ' || CASE WHEN _source_type = 'inquiry' THEN 'buyer inquiry' ELSE 'catalogue request' END,
    _display || ' · ' || _request || CASE WHEN _country IS NOT NULL THEN ' · ' || _country ELSE '' END,
    'attention', 'new-lead:' || _source_type || ':' || NEW.id::text,
    jsonb_build_object('name', NEW.name, 'request', _request, 'country', _country, 'created_at', NEW.created_at)
  ) ON CONFLICT (dedupe_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_new_inquiry_notification_trigger ON public.inquiries;
CREATE TRIGGER crm_new_inquiry_notification_trigger
  AFTER INSERT ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.crm_new_public_lead_notification();
DROP TRIGGER IF EXISTS crm_new_catalogue_notification_trigger ON public.catalogue_leads;
CREATE TRIGGER crm_new_catalogue_notification_trigger
  AFTER INSERT ON public.catalogue_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_new_public_lead_notification();

REVOKE EXECUTE ON FUNCTION public.crm_notification_before_write() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_new_public_lead_notification() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_notification_before_write() TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_new_public_lead_notification() TO service_role;

CREATE OR REPLACE FUNCTION public.crm_find_duplicate_candidates(_limit integer DEFAULT 100)
RETURNS TABLE (
  left_source_type text,
  left_source_id uuid,
  left_display text,
  right_source_type text,
  right_source_id uuid,
  right_display text,
  match_reason text,
  confidence integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH records AS (
    SELECT 'inquiry'::text AS source_type, id,
      COALESCE(NULLIF(btrim(company), ''), NULLIF(btrim(name), ''), 'Inquiry') AS display,
      lower(NULLIF(btrim(email), '')) AS email_norm,
      NULLIF(regexp_replace(COALESCE(phone, ''), '[^0-9]+', '', 'g'), '') AS phone_norm,
      lower(NULLIF(regexp_replace(btrim(COALESCE(company, '')), '\s+', ' ', 'g'), '')) AS company_norm,
      lower(NULLIF(btrim(country), '')) AS country_norm
    FROM public.inquiries
    UNION ALL
    SELECT 'catalogue', id,
      COALESCE(NULLIF(btrim(company_name), ''), NULLIF(btrim(name), ''), 'Catalogue lead'),
      lower(NULLIF(btrim(email), '')),
      NULLIF(regexp_replace(COALESCE(whatsapp, ''), '[^0-9]+', '', 'g'), ''),
      lower(NULLIF(regexp_replace(btrim(COALESCE(company_name, '')), '\s+', ' ', 'g'), '')),
      lower(NULLIF(btrim(country), ''))
    FROM public.catalogue_leads
    UNION ALL
    SELECT 'prospect', id,
      COALESCE(NULLIF(btrim(company_name), ''), 'Prospect'),
      lower(NULLIF(btrim(email), '')),
      NULLIF(regexp_replace(COALESCE(phone, whatsapp, ''), '[^0-9]+', '', 'g'), ''),
      lower(NULLIF(regexp_replace(btrim(COALESCE(company_name, '')), '\s+', ' ', 'g'), '')),
      lower(NULLIF(btrim(country), ''))
    FROM public.b2b_leads
  ), pairs AS (
    SELECT a.source_type AS l_type, a.id AS l_id, a.display AS l_display,
           b.source_type AS r_type, b.id AS r_id, b.display AS r_display,
           CASE
             WHEN a.email_norm IS NOT NULL AND a.email_norm = b.email_norm THEN 'Same email'
             WHEN a.phone_norm IS NOT NULL AND length(a.phone_norm) >= 7 AND a.phone_norm = b.phone_norm THEN 'Same phone or WhatsApp'
             ELSE 'Same company and country'
           END AS reason,
           CASE
             WHEN a.email_norm IS NOT NULL AND a.email_norm = b.email_norm THEN 100
             WHEN a.phone_norm IS NOT NULL AND length(a.phone_norm) >= 7 AND a.phone_norm = b.phone_norm THEN 95
             ELSE 80
           END AS score
    FROM records a
    JOIN records b
      ON (a.source_type || ':' || a.id::text) < (b.source_type || ':' || b.id::text)
    WHERE (
      (a.email_norm IS NOT NULL AND a.email_norm = b.email_norm)
      OR (a.phone_norm IS NOT NULL AND length(a.phone_norm) >= 7 AND a.phone_norm = b.phone_norm)
      OR (a.company_norm IS NOT NULL AND a.company_norm = b.company_norm
          AND a.country_norm IS NOT NULL AND a.country_norm = b.country_norm)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.crm_record_links l
      WHERE (l.left_source_type=a.source_type AND l.left_source_id=a.id
             AND l.right_source_type=b.source_type AND l.right_source_id=b.id)
         OR (l.left_source_type=b.source_type AND l.left_source_id=b.id
             AND l.right_source_type=a.source_type AND l.right_source_id=a.id)
    )
  )
  SELECT p.l_type, p.l_id, p.l_display, p.r_type, p.r_id, p.r_display, p.reason, p.score
  FROM pairs p
  ORDER BY p.score DESC, p.l_display, p.r_display
  LIMIT greatest(1, least(COALESCE(_limit,100),500));
END;
$$;

REVOKE ALL ON FUNCTION public.crm_find_duplicate_candidates(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_find_duplicate_candidates(integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.crm_refresh_action_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _actor uuid := auth.uid();
  _inserted integer := 0;
  _step integer := 0;
BEGIN
  IF _actor IS NULL OR NOT public.has_role(_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  INSERT INTO public.crm_notifications (
    notification_type, source_type, source_id, title, body, severity, dedupe_key, metadata
  )
  SELECT 'overdue_follow_up', 'inquiry', i.id, 'Overdue buyer follow-up',
         COALESCE(NULLIF(btrim(i.company), ''), NULLIF(btrim(i.name), ''), 'Inquiry') ||
         ' · due ' || to_char(i.follow_up_at AT TIME ZONE 'Asia/Karachi', 'DD Mon YYYY HH24:MI'),
         CASE WHEN i.priority = 'urgent' THEN 'urgent' ELSE 'attention' END,
         'overdue-followup:inquiry:' || i.id::text || ':' || extract(epoch from i.follow_up_at)::bigint::text,
         jsonb_build_object('due_at', i.follow_up_at, 'priority', i.priority, 'status', i.status)
  FROM public.inquiries i
  WHERE i.follow_up_at < now() AND i.status NOT IN ('won','lost','spam','unqualified')
  ON CONFLICT (dedupe_key) DO NOTHING;
  GET DIAGNOSTICS _step = ROW_COUNT; _inserted := _inserted + _step;

  INSERT INTO public.crm_notifications (
    notification_type, source_type, source_id, title, body, severity, dedupe_key, metadata
  )
  SELECT 'overdue_follow_up', 'catalogue', c.id, 'Overdue catalogue follow-up',
         COALESCE(NULLIF(btrim(c.company_name), ''), NULLIF(btrim(c.name), ''), 'Catalogue buyer') ||
         ' · due ' || to_char(c.follow_up_at AT TIME ZONE 'Asia/Karachi', 'DD Mon YYYY HH24:MI'),
         CASE WHEN c.priority = 'urgent' THEN 'urgent' ELSE 'attention' END,
         'overdue-followup:catalogue:' || c.id::text || ':' || extract(epoch from c.follow_up_at)::bigint::text,
         jsonb_build_object('due_at', c.follow_up_at, 'priority', c.priority, 'status', c.status)
  FROM public.catalogue_leads c
  WHERE c.follow_up_at < now() AND c.status NOT IN ('won','lost','spam','unqualified')
  ON CONFLICT (dedupe_key) DO NOTHING;
  GET DIAGNOSTICS _step = ROW_COUNT; _inserted := _inserted + _step;

  INSERT INTO public.crm_notifications (
    notification_type, source_type, source_id, title, body, severity, dedupe_key, metadata
  )
  SELECT 'overdue_follow_up', 'prospect', b.id, 'Overdue prospect follow-up',
         COALESCE(NULLIF(btrim(b.company_name), ''), 'Prospect') ||
         ' · due ' || to_char(b.follow_up_at AT TIME ZONE 'Asia/Karachi', 'DD Mon YYYY HH24:MI'),
         CASE WHEN b.priority = 'urgent' THEN 'urgent' ELSE 'attention' END,
         'overdue-followup:prospect:' || b.id::text || ':' || extract(epoch from b.follow_up_at)::bigint::text,
         jsonb_build_object('due_at', b.follow_up_at, 'priority', b.priority, 'status', b.crm_status)
  FROM public.b2b_leads b
  WHERE b.follow_up_at < now() AND b.crm_status NOT IN ('won','lost','spam','unqualified')
  ON CONFLICT (dedupe_key) DO NOTHING;
  GET DIAGNOSTICS _step = ROW_COUNT; _inserted := _inserted + _step;

  INSERT INTO public.crm_notifications (
    notification_type, source_type, source_id, title, body, severity, dedupe_key, metadata
  )
  SELECT 'overdue_task', 'task', t.id, 'Overdue CRM task',
         t.title || ' · due ' || to_char(t.due_at AT TIME ZONE 'Asia/Karachi', 'DD Mon YYYY HH24:MI'),
         CASE WHEN t.priority = 'urgent' THEN 'urgent' ELSE 'attention' END,
         'overdue-task:' || t.id::text || ':' || extract(epoch from t.due_at)::bigint::text,
         jsonb_build_object('due_at', t.due_at, 'priority', t.priority, 'source_type', t.source_type, 'source_id', t.source_id)
  FROM public.crm_tasks t
  WHERE t.status = 'open' AND t.due_at < now()
  ON CONFLICT (dedupe_key) DO NOTHING;
  GET DIAGNOSTICS _step = ROW_COUNT; _inserted := _inserted + _step;

  RETURN jsonb_build_object('inserted', _inserted, 'refreshed_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.crm_refresh_action_notifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_refresh_action_notifications() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.crm_generate_daily_owner_report(_report_date date DEFAULT current_date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _actor uuid := auth.uid();
  _start timestamptz;
  _finish timestamptz;
  _metrics jsonb;
  _workload jsonb;
  _highlights jsonb;
  _report public.crm_daily_reports%rowtype;
  _duplicates integer;
BEGIN
  IF _actor IS NULL OR NOT public.has_role(_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  _start := (_report_date::timestamp AT TIME ZONE 'Asia/Karachi');
  _finish := ((_report_date + 1)::timestamp AT TIME ZONE 'Asia/Karachi');
  PERFORM public.crm_refresh_action_notifications();
  SELECT count(*) INTO _duplicates FROM public.crm_find_duplicate_candidates(500);

  _metrics := jsonb_build_object(
    'active_pipeline',
      (SELECT count(*) FROM public.inquiries WHERE status NOT IN ('won','lost','spam','unqualified')) +
      (SELECT count(*) FROM public.catalogue_leads WHERE status NOT IN ('won','lost','spam','unqualified')) +
      (SELECT count(*) FROM public.b2b_leads WHERE crm_status NOT IN ('won','lost','spam','unqualified')),
    'new_today',
      (SELECT count(*) FROM public.inquiries WHERE created_at >= _start AND created_at < _finish) +
      (SELECT count(*) FROM public.catalogue_leads WHERE created_at >= _start AND created_at < _finish) +
      (SELECT count(*) FROM public.b2b_leads WHERE created_at >= _start AND created_at < _finish),
    'overdue_follow_ups',
      (SELECT count(*) FROM public.inquiries WHERE follow_up_at < now() AND status NOT IN ('won','lost','spam','unqualified')) +
      (SELECT count(*) FROM public.catalogue_leads WHERE follow_up_at < now() AND status NOT IN ('won','lost','spam','unqualified')) +
      (SELECT count(*) FROM public.b2b_leads WHERE follow_up_at < now() AND crm_status NOT IN ('won','lost','spam','unqualified')),
    'overdue_tasks', (SELECT count(*) FROM public.crm_tasks WHERE status='open' AND due_at < now()),
    'meetings_today', (SELECT count(*) FROM public.crm_meetings WHERE status='scheduled' AND start_at >= _start AND start_at < _finish),
    'quote_reviews', (SELECT count(*) FROM public.crm_quotations WHERE status='owner_review'),
    'active_samples', (SELECT count(*) FROM public.crm_samples WHERE status NOT IN ('accepted','rejected','cancelled')),
    'won_today',
      (SELECT count(*) FROM public.inquiries WHERE status='won' AND updated_at >= _start AND updated_at < _finish) +
      (SELECT count(*) FROM public.catalogue_leads WHERE status='won' AND updated_at >= _start AND updated_at < _finish) +
      (SELECT count(*) FROM public.b2b_leads WHERE crm_status='won' AND updated_at >= _start AND updated_at < _finish),
    'duplicate_candidates', _duplicates,
    'unread_notifications', (SELECT count(*) FROM public.crm_notifications WHERE status='unread')
  );

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'assignee', assignee, 'buyers', buyers, 'tasks', tasks, 'overdue', overdue
  ) ORDER BY total DESC), '[]'::jsonb)
  INTO _workload
  FROM (
    SELECT assignee,
           sum(buyers)::int AS buyers,
           sum(tasks)::int AS tasks,
           sum(overdue)::int AS overdue,
           sum(buyers + tasks + overdue)::int AS total
    FROM (
      SELECT COALESCE(assignee, 'Unassigned') AS assignee, count(*) AS buyers, 0 AS tasks,
             count(*) FILTER (WHERE follow_up_at < now()) AS overdue
      FROM (
        SELECT assignee, follow_up_at FROM public.inquiries WHERE status NOT IN ('won','lost','spam','unqualified')
        UNION ALL SELECT assignee, follow_up_at FROM public.catalogue_leads WHERE status NOT IN ('won','lost','spam','unqualified')
        UNION ALL SELECT assignee, follow_up_at FROM public.b2b_leads WHERE crm_status NOT IN ('won','lost','spam','unqualified')
      ) buyers_union GROUP BY COALESCE(assignee, 'Unassigned')
      UNION ALL
      SELECT COALESCE(assigned_to, 'Unassigned'), 0, count(*), count(*) FILTER (WHERE due_at < now())
      FROM public.crm_tasks WHERE status='open' GROUP BY COALESCE(assigned_to, 'Unassigned')
    ) combined GROUP BY assignee
  ) workload_rows;

  _highlights := jsonb_build_array(
    'Overdue follow-ups: ' || (_metrics->>'overdue_follow_ups'),
    'Overdue tasks: ' || (_metrics->>'overdue_tasks'),
    'Quotes awaiting owner review: ' || (_metrics->>'quote_reviews'),
    'Duplicate candidates needing review: ' || (_metrics->>'duplicate_candidates')
  );

  INSERT INTO public.crm_daily_reports (
    report_date, metrics, workload, highlights, generated_by, generated_by_user_id, generated_at
  ) VALUES (
    _report_date, _metrics, _workload, _highlights, 'owner-command-center', _actor, now()
  )
  ON CONFLICT (report_date) DO UPDATE SET
    metrics=EXCLUDED.metrics,
    workload=EXCLUDED.workload,
    highlights=EXCLUDED.highlights,
    generated_by=EXCLUDED.generated_by,
    generated_by_user_id=EXCLUDED.generated_by_user_id,
    generated_at=now(),
    updated_at=now()
  RETURNING * INTO _report;

  INSERT INTO public.crm_notifications (
    notification_type, source_type, title, body, severity, dedupe_key, metadata
  ) VALUES (
    'daily_summary','system','Daily owner report ready',
    'New: ' || (_metrics->>'new_today') ||
    ' · Overdue follow-ups: ' || (_metrics->>'overdue_follow_ups') ||
    ' · Overdue tasks: ' || (_metrics->>'overdue_tasks') ||
    ' · Quote reviews: ' || (_metrics->>'quote_reviews'),
    CASE WHEN ((_metrics->>'overdue_follow_ups')::int + (_metrics->>'overdue_tasks')::int) > 0
      THEN 'attention' ELSE 'info' END,
    'daily-summary:' || _report_date::text,
    jsonb_build_object('report_id', _report.id, 'metrics', _metrics)
  )
  ON CONFLICT (dedupe_key) DO UPDATE SET
    body=EXCLUDED.body,
    severity=EXCLUDED.severity,
    metadata=EXCLUDED.metadata,
    updated_at=now();

  RETURN jsonb_build_object(
    'report_id', _report.id,
    'report_date', _report.report_date,
    'metrics', _metrics,
    'workload', _workload,
    'highlights', _highlights
  );
END;
$$;

REVOKE ALL ON FUNCTION public.crm_generate_daily_owner_report(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_generate_daily_owner_report(date) TO authenticated, service_role;
