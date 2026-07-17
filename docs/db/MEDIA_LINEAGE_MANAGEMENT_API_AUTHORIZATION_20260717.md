# Media lineage migration — Management API authorization evidence

Date: 2026-07-17
Owner Supabase project: `pvzjiozismyxqrzmtfbi`

## Root cause

Repository migration `20260717222000_media_duplicate_lineage_foundation.sql` updates two reviewed `media_assets` rows. The owner database already protects all media writes with `media_assets_before_write()`. Supabase Management API SQL sessions do not carry user JWT claims, so the trigger rejected the controlled migration with SQLSTATE `42501` (`admin access required`).

## Resolution on current main

The migration sets `request.jwt.claim.role` to `service_role` with transaction-local scope before the reviewed updates. The production trigger remains enabled and unchanged. A failed dry-run rolls back the local role context together with all DDL and data changes.

## Verified evidence

A production-database rollback dry-run confirmed:

- reviewed canonical and duplicate rows exist;
- both rows retain the reviewed SHA-256 checksum;
- both storage paths are distinct, active and verified;
- the duplicate has no product, category or social reference;
- the canonical asset retains the live product reference;
- existing media write guard accepts the transaction-local service role;
- canonical/duplicate lineage updates and final verification succeed;
- the transaction was rolled back, leaving production data unchanged.

The checksum-led repository workflow remains the authoritative apply and ledger-parity mechanism.
