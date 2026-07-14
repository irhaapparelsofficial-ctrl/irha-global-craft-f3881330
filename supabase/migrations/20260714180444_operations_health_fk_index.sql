create index if not exists operations_health_snapshots_run_id_idx
  on public.operations_health_snapshots(run_id)
  where run_id is not null;
