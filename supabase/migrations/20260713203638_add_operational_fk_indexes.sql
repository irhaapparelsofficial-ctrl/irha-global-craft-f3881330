-- Cover operational foreign keys used by production, shipping and social workflows.
-- These indexes support joins and parent-row maintenance without changing data.

CREATE INDEX IF NOT EXISTS production_closeout_events_job_fk_idx
  ON public.production_closeout_events (production_job_id);

CREATE INDEX IF NOT EXISTS production_closeout_issues_job_fk_idx
  ON public.production_closeout_issues (production_job_id);

CREATE INDEX IF NOT EXISTS production_cost_entries_job_fk_idx
  ON public.production_cost_entries (production_job_id);

CREATE INDEX IF NOT EXISTS production_delivery_evidence_job_fk_idx
  ON public.production_delivery_evidence (production_job_id);

CREATE INDEX IF NOT EXISTS production_packages_job_fk_idx
  ON public.production_packages (production_job_id);

CREATE INDEX IF NOT EXISTS production_qc_inspections_operation_fk_idx
  ON public.production_qc_inspections (operation_id)
  WHERE operation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS production_repeat_orders_job_fk_idx
  ON public.production_repeat_order_opportunities (production_job_id);

CREATE INDEX IF NOT EXISTS production_shipping_documents_job_fk_idx
  ON public.production_shipping_documents (production_job_id);

CREATE INDEX IF NOT EXISTS production_tasks_operation_fk_idx
  ON public.production_tasks (operation_id)
  WHERE operation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS production_tracking_events_job_fk_idx
  ON public.production_tracking_events (production_job_id);

CREATE INDEX IF NOT EXISTS social_growth_recommendations_item_fk_idx
  ON public.social_growth_recommendations (item_id)
  WHERE item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_publish_events_run_fk_idx
  ON public.social_publish_events (run_id);

CREATE INDEX IF NOT EXISTS social_render_job_items_media_fk_idx
  ON public.social_render_job_items (media_asset_id);
