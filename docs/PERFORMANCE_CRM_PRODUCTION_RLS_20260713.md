# CRM and Production RLS optimization — 2026-07-13

## Scope

Optimize private CRM and Production policies so authenticated identity is initialized once per query.

Covered modules:

- CRM tasks, activity events, contacts, notes, files and record links;
- production jobs, events, materials, operations and tasks;
- QC inspections, defects and sample approvals;
- private production evidence read/upload policies.

The evidence upload rule still requires both database admin access and `uploaded_by = auth.uid()`.

## Live activation

Applied to owner Supabase project `pvzjiozismyxqrzmtfbi` as migration:

`20260713204251_optimize_crm_production_rls_auth_initplan`

## Verification

- owner admin role check remained true;
- owner access to CRM, production and private evidence tables remained available;
- a non-admin authenticated session returned no protected rows;
- focused direct per-row Auth calls remaining: 0;
- no table rows were created, modified or deleted.

## Not changed

- no public visibility policy;
- no user or role;
- no storage object;
- no buyer communication or production action;
- no website deployment.
