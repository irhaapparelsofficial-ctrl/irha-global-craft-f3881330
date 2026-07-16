-- Idempotently return four forensic stale-lock recoveries to the protected AI
-- queue. The service-role claim is transaction-local and is required by the
-- media_assets write guard. Rows already processed or requeued are untouched.

begin;

select set_config('request.jwt.claims', '{"role":"service_role"}', true);

update public.media_assets
set ai_processing_status = 'queued',
    ai_processing_source = 'owner-audited-stale-lock-retry-20260716',
    ai_processing_error = null,
    ai_processing_locked_at = null,
    ai_processing_lock_token = null,
    ai_processing_worker = null,
    updated_at = now()
where id in (
    'd8e09bc6-22aa-4fec-8c71-027e3aec3f94'::uuid,
    'c84a7324-34dd-433c-96ae-4f9f62c8fd99'::uuid,
    '0e34f237-34e6-43f7-a39a-3f0fa7720e79'::uuid,
    '302655cd-8922-4c5a-88fc-5fb3f1971703'::uuid
  )
  and ai_processing_status = 'failed'
  and ai_processing_locked_at is null;

commit;
