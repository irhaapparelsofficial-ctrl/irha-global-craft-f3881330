-- Reduce idle operations heartbeat frequency while preserving recovery and public smoke coverage.
-- Evidence before this change: 272 heartbeat runs in 24 hours, zero failures,
-- average runtime ~1.1 seconds. Notification dispatch remains unchanged at one minute.

DO $$
DECLARE
  heartbeat_job_id bigint;
BEGIN
  SELECT jobid
  INTO heartbeat_job_id
  FROM cron.job
  WHERE jobname = 'irha-operations-heartbeat'
  ORDER BY jobid
  LIMIT 1;

  IF heartbeat_job_id IS NULL THEN
    PERFORM cron.schedule(
      'irha-operations-heartbeat',
      '*/15 * * * *',
      'select public.invoke_irha_operations(''heartbeat'',''cron'',''{}''::jsonb);'
    );
  ELSE
    PERFORM cron.alter_job(
      job_id := heartbeat_job_id,
      schedule := '*/15 * * * *',
      command := 'select public.invoke_irha_operations(''heartbeat'',''cron'',''{}''::jsonb);',
      database := 'postgres',
      username := 'postgres',
      active := true
    );
  END IF;
END
$$;

DO $$
DECLARE
  matching_jobs integer;
BEGIN
  SELECT count(*)
  INTO matching_jobs
  FROM cron.job
  WHERE jobname = 'irha-operations-heartbeat'
    AND schedule = '*/15 * * * *'
    AND active
    AND command = 'select public.invoke_irha_operations(''heartbeat'',''cron'',''{}''::jsonb);';

  IF matching_jobs <> 1 THEN
    RAISE EXCEPTION 'Operations heartbeat cadence verification failed: expected one active 15-minute job, found %', matching_jobs;
  END IF;
END
$$;
