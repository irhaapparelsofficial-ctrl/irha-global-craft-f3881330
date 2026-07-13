# Operational foreign-key indexes — 2026-07-13

## Scope

Add only the missing leading-column indexes for operational relationships used by production, shipping and social workflows.

Covered relationships include:

- production closeout events, issues and cost entries → production jobs;
- delivery evidence, packages, shipping documents and tracking events → production jobs;
- QC inspections and production tasks → operations;
- repeat-order opportunities → production jobs;
- growth recommendations → social calendar items;
- publish events → publish runs;
- render job items → media assets.

## Live activation

Applied to owner Supabase project `pvzjiozismyxqrzmtfbi` as migration:

`20260713203638_add_operational_fk_indexes`

## Verification

A catalogue of the selected operational foreign keys was checked before and after activation.

- selected operational relationships: 20
- covered by a valid leading index after activation: 20
- uncovered after activation: 0
- production jobs: 0
- production shipments: 0
- social calendar items: 0
- social render jobs: 0

No row content changed.

## Deliberately excluded

- audit-user columns such as `created_by`, `approved_by` and `updated_by`;
- archived `legacy_pre_irha` tables;
- migration backup schemas;
- mass index creation;
- removal of indexes currently reported as unused.

The system is newly activated, so zero-use statistics are not sufficient evidence for destructive index removal.
