# Phase 6.2 — QC, Defects, Sample Approvals & Private Evidence

## Purpose

Add an evidence-backed quality-control workspace without turning internal records into buyer claims, sending messages automatically, or exposing factory files publicly.

## Admin workflow

1. Open Admin and press **Quality Control**.
2. Select an internal sample or production job.
3. Create incoming, inline, final, sample or packing inspections.
4. Add required and optional checkpoints with tolerances.
5. Record pass/fail/N/A results and optional measurement values.
6. Record defects by severity and affected quantity.
7. Add rework actions and require verification evidence before serious rework is treated as verified.
8. Finalize an inspection through the server readiness function.
9. Create sample approval rounds and track internal workflow separately from buyer decisions.
10. Record buyer approval, change requests or rejection only from retained evidence.
11. Upload QC photos, measurement reports, sample photos, buyer feedback, rework proof and certificates to a private bucket.
12. Run the deterministic quality-gate check before treating a job as ready internally.

## Backend source prepared

Migration: `20260713223000_production_quality_sample_evidence.sql`

It prepares:

- `production_qc_inspections`;
- `production_qc_checkpoints`;
- `production_defects`;
- `production_rework_actions`;
- `production_sample_approvals`;
- `production_evidence_files`;
- admin-only RLS;
- inspection readiness and finalization RPCs;
- evidence-backed buyer sample decision RPC;
- deterministic quality-gate readiness RPC;
- `production_quality_summary`;
- private `production-private-evidence` storage bucket;
- 50 MB limit and explicit MIME allow-list;
- short signed-file access policies.

All backend source remains deferred until the final one-time activation.

## Inspection rules

An inspection cannot be finalized while required checkpoints remain unchecked.

The derived result is:

- `failed` when a required checkpoint fails or an open major/critical defect exists;
- `conditional` when only minor defects or optional failed checkpoints remain;
- `passed` when required checks pass and no unresolved defect requires attention.

Finalization requires an authenticated admin and creates an audit event. It does not send a buyer notification.

## Defect and rework rules

- Critical and major unresolved defects block quality readiness.
- Accepted/closed serious defects require an owner note or corrective-action evidence.
- Rework verification requires a verification note.
- Serious rework that is not verified remains visible in the server quality gate.
- Internal QC status is not represented as buyer acceptance.

## Sample decision rules

Internal sample workflow and buyer decision are separate fields.

A buyer decision can only be recorded as approved, changes requested or rejected when at least one of the following exists:

- an evidence note;
- a private file categorized as buyer feedback and linked to the same production job.

Recording a decision does not send a message and does not fabricate external evidence.

## Private evidence rules

- Bucket is private.
- No public URL is created.
- Access uses a five-minute signed URL.
- Files are limited to approved image, PDF, video, document, spreadsheet, CSV and text types.
- Maximum size is 50 MB.
- SHA-256 checksum is calculated before upload and stored with metadata.
- Metadata insert failure rolls back the uploaded object.

## Final activation tests

1. Apply all earlier production migrations first.
2. Apply the Phase 6.2 migration.
3. Verify anon users cannot read tables or bucket objects.
4. Verify a required unchecked checkpoint blocks finalization.
5. Verify an open major/critical defect produces a failed inspection result.
6. Verify only minor open defects can produce conditional status.
7. Verify buyer decision RPC rejects missing evidence.
8. Verify evidence files receive no public URL and signed access expires.
9. Verify upload rollback when metadata storage fails.
10. Verify no action sends a buyer message or books a shipment.

## Not performed in this batch

- No migration was applied.
- No storage bucket was activated.
- No live inspection, defect, sample decision or production file was created.
- No buyer or supplier was contacted.
- No shipment was booked.
- No production website publish was performed.
