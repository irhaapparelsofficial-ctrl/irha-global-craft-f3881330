# Phase 6.1 — Production Control Center

## Purpose

Add a real internal factory-control layer on top of the existing sample/order workflow without turning internal planning dates into buyer promises or sending buyer notifications automatically.

## Admin workflow

1. Create an internal sample or order job from an approved brief.
2. Select the job in Production Control Center.
3. Add the material plan / BOM with required quantity, current availability, criticality and procurement state.
4. Add sequenced production operations, work centers, planned dates and evidence requirements.
5. Add internal tasks, priorities, due dates and blockers.
6. Review deterministic risk, shortages, overdue work and operation progress.
7. Run the server release-readiness check.
8. Owner explicitly approves internal production release.
9. Continue using the existing controlled sample, QC, buyer-approval and shipping stages.

## Backend source prepared

- additional production planning fields on `production_jobs`;
- `production_material_requirements`;
- `production_operations`;
- `production_tasks`;
- admin-only `production_control_summary` view;
- deterministic release-readiness RPC;
- owner-approved internal release RPC;
- automatic derived risk/progress refresh triggers;
- expanded append-only production event types.

Repository migrations:

- `20260713213000_production_operations_control.sql`
- `20260713213500_production_status_refresh.sql`

## Release rules

Internal release is blocked when any of the following is true:

- approved specification reference is missing;
- no material requirements exist;
- a critical material is blocked or short;
- no production operations exist;
- an operation is blocked;
- an internal task is blocked.

A release does not:

- notify the buyer;
- promise a delivery date;
- approve a price;
- create a shipment;
- bypass QC or buyer approval.

## Risk rules

- `blocked`: critical material shortage, blocked operation or blocked task.
- `attention`: non-critical shortage, overdue operation/task or an internal target due within two days.
- `clear`: no current deterministic blocker or due-risk evidence.

Progress is the percentage of sequenced operations marked completed or skipped. It is not a claim that an order is commercially complete.

## Final activation requirements

1. Apply all earlier production migrations first.
2. Apply the two Phase 6.1 migrations in order.
3. Sign in as the authorised admin.
4. Create one internal test job.
5. Verify critical material shortages block release.
6. Verify blocked operations/tasks block release.
7. Verify owner release creates an append-only event and no buyer notification.
8. Verify risk/progress refresh after child-row updates.
9. Keep buyer communication and production publication disabled until later Phase 6 batches are tested.

## Not performed in this batch

- No database migration was applied.
- No production job was created in a live backend.
- No buyer was notified.
- No supplier order was placed.
- No shipment was booked.
- No production website deployment was published.
