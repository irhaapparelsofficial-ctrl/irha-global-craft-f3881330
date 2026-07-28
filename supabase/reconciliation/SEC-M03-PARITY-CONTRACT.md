# SEC-M03 post-deployment parity contract

Execution: `IA-CTRL-E001R2`  
Goal lock: `IRHA-PRODUCTION-SECURITY-01`  
Supabase project: `pvzjiozismyxqrzmtfbi`

## Authoritative inputs

Canonical evidence is generated only after authenticated project-identity and health checks pass. Edge metadata is retrieved from the Supabase Management API function metadata endpoint. Source files are retrieved separately from the authenticated function `/body` endpoint as `multipart/form-data`.

The source verifier preserves each multipart filename, decodes file content as UTF-8, sorts files by filename for deterministic serialization, and applies only the line-ending normalization already defined by `verify-sec-m03-deployed-sources.mjs`. A repository Git blob SHA-1, normalized repository SHA-256, and live bundle/source SHA-256 remain separate hash domains.

## Sealed live baseline

- Public schema: 158 tables, 13 views, 204 function signatures, 4 enums.
- Live migration history: 375 entries; P1=4, P2=371, P3=0, P4=0, P5=0.
- Edge classifications: F1=33, F2=14, F3=9, F4=1, F5=0, F6=31.
- Active cron jobs: 8.
- Storage buckets: 11.
- Official public browser types include `consume_edge_rate_limit` and `cleanup_edge_rate_limit_state` and exclude private limiter relations.

## Scope boundary

This seal changes generated evidence, official public types, deterministic parity checks, and the authenticated source-retrieval contract only. It does not deploy an Edge Function, apply a migration, change `verify_jwt`, change notification authorization, modify product/category data, or alter buyer-facing content.
