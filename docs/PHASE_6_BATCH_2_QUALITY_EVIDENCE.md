# Phase 6.2 — QC, Rework, Sample Decisions & Private Evidence

## Purpose

Add a controlled factory-quality layer that records inspection evidence, defects, rework, sample decisions and private files without sending buyer messages, booking shipments or treating internal status as a buyer promise.

## Admin workflow

1. Select an existing sample or order production job.
2. Record incoming, inline, final, sample or pre-shipment inspections with observed quantities.
3. Record minor, major or critical defects against an exact inspection.
4. Track root cause, corrective action and rework verification.
5. Record sample rounds and evidence-backed internal or buyer decisions.
6. Upload QC photos, measurement sheets, sample photos, approval references and other evidence to a private bucket.
7. Verify or reject evidence metadata; opening a file creates a five-minute signed URL.
8. Run deterministic server-side QC readiness.
9. Owner explicitly approves internal QC release.

## Backend source prepared

Migration: `20260713230000_production_quality_evidence.sql`

It prepares:

- quality risk/release fields on `production_jobs`;
- `production_qc_inspections`;
- `production_qc_defects`;
- `production_sample_approvals`;
- `production_evidence_files`;
- private `production-evidence` storage bucket;
- admin-only table and storage policies;
- inspection, defect, rework, sample-decision and evidence RPCs;
- deterministic QC readiness and owner release RPCs;
- admin-only quality summary view.

## Release rules

Internal QC release is blocked when:

- no completed sample/final/pre-shipment inspection exists;
- inspection quantities are invalid;
- open critical or major defects remain;
- a sample job lacks an approved specification reference;
- no private evidence file is verified.

Owner QC release does not:

- send a buyer notification;
- approve price or delivery terms;
- book a courier or shipment;
- delete defects or evidence;
- bypass production or buyer approval stages.

## Private evidence controls

- bucket is non-public;
- maximum file size is 20 MB;
- explicit MIME allow-list;
- object path is restricted to the production job prefix;
- SHA-256 is recorded when the browser can calculate it;
- file access uses a five-minute signed URL;
- evidence is verified/rejected instead of silently overwritten or deleted.

## Final activation requirements

1. Apply earlier production migrations first.
2. Apply `20260713230000_production_quality_evidence.sql`.
3. Sign in as the authorised admin.
4. Create a non-commercial test job and test each inspection type.
5. Confirm impossible quantities are rejected.
6. Confirm critical/major defects block QC release.
7. Confirm verified rework and approved sample references remove only their own blockers.
8. Upload and verify one private file; confirm signed URL expires.
9. Confirm owner QC release records an event without sending communication or booking shipment.

## Not performed in this batch

- No database migration was applied.
- No private bucket or RPC was deployed.
- No production inspection or defect was written to a live backend.
- No file was uploaded.
- No buyer or supplier was contacted.
- No shipment was booked.
- No production website publish was performed.
