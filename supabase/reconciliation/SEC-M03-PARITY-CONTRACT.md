# SEC-M03 post-deployment parity contract

Execution: `IA-CTRL-E001R2`  
Goal lock: `IRHA-PRODUCTION-SECURITY-01`  
Supabase project: `pvzjiozismyxqrzmtfbi`

## Authoritative inputs

Canonical evidence is generated only after authenticated project-identity and health checks pass. Edge metadata is retrieved from the Supabase Management API function metadata endpoint. Source files are retrieved separately from the authenticated function `/body` endpoint as `multipart/form-data`.

The source verifier preserves each multipart filename, decodes file content as UTF-8, sorts files by filename for deterministic serialization, and applies only the line-ending normalization already defined by `verify-sec-m03-deployed-sources.mjs`. A repository Git blob SHA-1, normalized repository SHA-256, and live bundle/source SHA-256 remain separate hash domains.

## Sealed live baseline

- Public schema: 158 tables, 13 views, 204 function signatures, 4 enums.
- Live migration history: 376 entries; P1=5, P2=371, P3=0, P4=0, P5=0.
- Edge classifications: F1=33, F2=14, F3=9, F4=1, F5=0, F6=31.
- Active cron jobs: 8.
- Storage buckets: 11.
- Official public browser types include `consume_edge_rate_limit` and `cleanup_edge_rate_limit_state` and exclude private limiter relations.
- `notification-dispatcher` is sealed at live version 8 with `verify_jwt=false`, exact source SHA-256 `2b4525d022b0788c3bb6b2bf25923c90c35807a3e2b6065671b2eb90f00f1a48`, custom runtime authorization, and single-use scheduler authorization.

## Deterministic drift guards

The migration provenance generator, deployment manifest generator, and committed parity verifier derive migration correctness from the sealed production provenance plus checksum-registered repository migrations recorded as `applied` or `verified_present` in the existing private repository migration ledger. They require unique exact version-set equality with authenticated database migration versions, explicitly protect `20260731151915_align_drive_gallery_with_selected_media`, and exclude staged/future manifest entries that have no applied ledger state. The observed current count of 376 is evidence only, not an executable invariant. The manifest generator also requires the exact notification-dispatcher v8 version, authentication mode, and source hash. These guards fail closed and may not be refreshed unless authenticated live evidence and exact source provenance both pass.

## Scope boundary

This seal changes generated evidence, official public types, deterministic parity checks, and the authenticated source-retrieval contract only. It does not deploy an Edge Function, apply a migration, change `verify_jwt`, change notification authorization, modify product/category data, or alter buyer-facing content.
