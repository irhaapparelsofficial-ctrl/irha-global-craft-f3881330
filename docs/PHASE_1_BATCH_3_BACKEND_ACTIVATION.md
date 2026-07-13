# Phase 1.3 — Backend Activation

Recorded: 2026-07-13

## Runtime

- Repository: `irhaapparelsofficial-ctrl/irha-global-craft-f3881330`
- Lovable project: `da72a40a-7df3-44c3-a72d-f180d9ffcd25`
- Owner Supabase project: `pvzjiozismyxqrzmtfbi`

## Activated database modules

- social rendering jobs and verified media controls;
- owner-approved social scheduling and exact publication evidence;
- social analytics, attribution and internal recommendations;
- production materials, operations, tasks, risk and progress;
- QC inspections, defects, rework and private evidence;
- samples and owner QC release;
- packages, shipping documents, dispatch and tracking;
- verified delivery evidence;
- commercial closeout, costs, issues and repeat-order opportunities;
- hardened owner-admin claim and Auth-readiness functions.

## Activated storage

- `production-evidence`: private, 20 MB limit.
- `social-renders`: public rendered-output bucket, 100 MB limit.

## Activated Edge Functions

- `social-render-worker`
- `social-render-callback`
- `social-analytics`
- `social-publish-scheduler`

The callback remains deliberately fail-closed until an approved renderer is configured. The scheduler refuses external delivery until an approved publishing gateway is configured.

## Verified evidence

- recorded migrations after final parity activation: 117;
- latest recorded activation migration: `backend_activation_repairs`;
- Auth users preserved: 1;
- admin roles preserved: 1;
- enabled social accounts: 0;
- publishing items: 0;
- queued/rendering jobs: 0;
- new operational tables checked with RLS enabled;
- new Edge Functions checked as ACTIVE.

## Source repairs

Historical Phase 6.3 source contained two defects caught before real workflow execution:

1. invalid multi-target PostgreSQL `RETURNING` syntax;
2. shipping readiness referenced `qc_released_at` instead of `quality_release_status` and `quality_released_at`.

Append-only migration `20260714033000_backend_activation_repairs.sql` preserves the corrected definitions. Historical migrations were not edited.

## Still requires provider/dashboard configuration

- Supabase Email/password Auth;
- Google OAuth credentials, or keep Google hidden;
- production Auth redirect URLs;
- leaked-password protection;
- approved rendering, social publishing and analytics credentials.

No external post, render completion, buyer message, shipment booking, payment or production Publish was executed during activation.
