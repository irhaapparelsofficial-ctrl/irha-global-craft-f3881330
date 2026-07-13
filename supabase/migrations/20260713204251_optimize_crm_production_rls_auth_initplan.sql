-- Optimize CRM and Production RLS policies so auth.uid() is initialized once per query.
-- Existing roles, commands and authorization semantics are preserved.

DROP POLICY IF EXISTS crm_activity_events_admin_all ON public.crm_activity_events;
CREATE POLICY crm_activity_events_admin_all ON public.crm_activity_events
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS crm_contacts_admin_all ON public.crm_contacts;
CREATE POLICY crm_contacts_admin_all ON public.crm_contacts
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS crm_files_admin_all ON public.crm_files;
CREATE POLICY crm_files_admin_all ON public.crm_files
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS crm_notes_admin_all ON public.crm_notes;
CREATE POLICY crm_notes_admin_all ON public.crm_notes
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS crm_record_links_admin_all ON public.crm_record_links;
CREATE POLICY crm_record_links_admin_all ON public.crm_record_links
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS crm_tasks_admin_all ON public.crm_tasks;
CREATE POLICY crm_tasks_admin_all ON public.crm_tasks
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS production_evidence_admin_insert ON public.production_evidence_files;
CREATE POLICY production_evidence_admin_insert ON public.production_evidence_files
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    AND uploaded_by = (select auth.uid())
  );

DROP POLICY IF EXISTS production_evidence_admin_read ON public.production_evidence_files;
CREATE POLICY production_evidence_admin_read ON public.production_evidence_files
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage production job events" ON public.production_job_events;
CREATE POLICY "Admins manage production job events" ON public.production_job_events
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage production jobs" ON public.production_jobs;
CREATE POLICY "Admins manage production jobs" ON public.production_jobs
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage production materials" ON public.production_material_requirements;
CREATE POLICY "Admins manage production materials" ON public.production_material_requirements
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage production operations" ON public.production_operations;
CREATE POLICY "Admins manage production operations" ON public.production_operations
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS production_defects_admin_all ON public.production_qc_defects;
CREATE POLICY production_defects_admin_all ON public.production_qc_defects
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS production_qc_admin_all ON public.production_qc_inspections;
CREATE POLICY production_qc_admin_all ON public.production_qc_inspections
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS production_samples_admin_all ON public.production_sample_approvals;
CREATE POLICY production_samples_admin_all ON public.production_sample_approvals
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage production tasks" ON public.production_tasks;
CREATE POLICY "Admins manage production tasks" ON public.production_tasks
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
