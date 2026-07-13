# Phase 6.4 — Order Closeout, Profit Evidence & Repeat Business

## Purpose

Complete the internal production lifecycle after verified delivery. This batch records buyer acceptance evidence, invoice/payment review, verified costs, closeout issues, owner approval, commercial closure and repeat-order opportunities without sending messages, collecting payment, changing prices or promising future orders.

## Admin workflow

1. Prepare a closeout workspace for an existing production job.
2. Link the latest shipment and confirm that delivery plus private delivery evidence are verified.
3. Record buyer acceptance, changes requested, dispute, or an explicit owner waiver.
4. Record invoice number, amount, currency, exchange-rate snapshot and reviewed payment status.
5. Add material, labour, subcontract, packaging, quality, freight, tax, banking, overhead, claim and other costs.
6. Verify or reject each cost evidence record.
7. Record and resolve delivery, quality, quantity, document, payment, claim, buyer-feedback or internal issues.
8. Run deterministic server-side closeout readiness.
9. Owner explicitly approves the internal closeout.
10. Close the order commercially.
11. Prepare an internal repeat-order opportunity with cycle, lead time, quantity, rationale and an unsent outreach draft.
12. Review monthly management reporting for closed orders, accepted deliveries, payment status, revenue, verified cost, contribution margin and blockers.

## Backend source prepared

Migration: `20260714001000_production_order_closeout.sql`

It prepares:

- closeout status/risk fields on `production_jobs`;
- `production_order_closeouts`;
- `production_cost_entries`;
- `production_closeout_issues`;
- `production_repeat_order_opportunities`;
- immutable `production_closeout_events`;
- deterministic closeout-readiness RPC;
- owner review and final close RPCs;
- internal repeat-order preparation and status RPCs;
- admin-only closeout summary and monthly management report views.

## Closeout rules

Owner approval is blocked when:

- shipment status is not delivered;
- no verified delivery evidence exists;
- delivery acceptance or explicit owner waiver is missing;
- accepted delivery lacks an exact reference and timestamp;
- invoice evidence is incomplete;
- payment status is unreviewed or disputed;
- no verified cost evidence exists;
- any critical closeout issue remains open.

Warnings remain visible for:

- pending cost evidence;
- open non-critical issues;
- missing lessons learned;
- overdue payment;
- owner-waived buyer acceptance.

## Cost and margin evidence

- Every cost stores quantity, unit cost, currency and exchange rate to the base currency.
- Contribution margin uses only verified cost entries.
- Pending or rejected costs are never included as verified cost evidence.
- The system does not claim accounting profit, tax profit, cash received or realized foreign-exchange gain.
- Revenue is an internal base-currency conversion of the recorded invoice snapshot.

## Repeat-order controls

- Repeat-order records are internal opportunities only.
- Preparation never sends email or WhatsApp.
- Owner approval, contact preparation and contacted status are separate explicit states.
- Overdue/disputed payment, unresolved issues or missing buyer acceptance block priority.
- No price, quantity or delivery date is promised automatically.

## Final activation requirements

1. Apply all earlier production migrations through Phase 6.3.
2. Apply `20260714001000_production_order_closeout.sql`.
3. Create a non-commercial test order and delivered shipment with verified evidence.
4. Confirm missing acceptance, invoice, payment review, costs or critical issue resolution blocks owner approval.
5. Confirm pending costs remain excluded from verified contribution margin.
6. Confirm owner approval is required before final close.
7. Confirm order closure does not send buyer communication or execute payment.
8. Prepare one repeat-order draft and confirm no external message is sent.
9. Verify monthly management report totals against test records.
10. Confirm admin-only RLS and immutable event evidence.

## Not performed in this batch

- No database migration was applied.
- No production record, cost, issue or repeat-order opportunity was written to a live backend.
- No buyer acceptance was fabricated.
- No payment was collected or reconciled.
- No email, WhatsApp, quotation or reorder message was sent.
- No production website publish was performed.
