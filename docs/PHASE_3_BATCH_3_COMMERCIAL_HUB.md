# Phase 3 / Batch 3.3 — Commercial Hub

## Delivered frontend

Admin → **Commercial Hub** contains three owner-controlled workspaces.

### Meetings

- select any inquiry, catalogue buyer or prospect;
- set meeting type, title, start time, duration, timezone, HTTPS meeting link and agenda;
- track scheduled, completed, cancelled and no-show states;
- download a standards-based `.ics` file;
- clearly state that saving or downloading does not invite the buyer automatically.

### Samples

- create a buyer-linked sample development brief;
- record product, requirements, quantity, currency, sample cost, shipping cost and private notes;
- track Requested → Quoted → Approved → Development → Ready → Sent → Feedback → Accepted/Rejected;
- record courier, tracking reference and buyer feedback;
- never claim a shipment is delivered merely because a tracking reference exists.

### Quotations

- buyer prefill from the unified CRM;
- persistent quotation number, buyer, destination, currency, validity, Incoterm, shipping scope and payment terms;
- multiple line items with quantity, unit and unit price;
- subtotal, shipping, discount and total calculation;
- Draft → Owner review → Approved → Sent → Accepted/Rejected workflow;
- explicit owner confirmation before approval;
- **Mark sent** records state but does not send an email;
- automatic three-day follow-up task preparation after a quotation is marked sent;
- copyable buyer message for manual review;
- printable/PDF quotation output.

## Backend prepared, not applied

Migration: `20260713060000_commercial_hub.sql`

It prepares:

- `crm_meetings`;
- `crm_samples`;
- `crm_quotations`;
- `crm_quotation_items`;
- human-readable meeting, sample and quotation reference sequences;
- admin-only RLS;
- quotation total recalculation;
- owner-approval and status-transition enforcement;
- meeting/sample/quotation activity events in the Buyer 360 timeline;
- indexes for buyer, schedule and commercial status queries.

Per owner instruction, no database was queried or modified. The migration remains deferred for the single final activation.

## Safety

- Prices, payment terms, Incoterms and shipping scope are owner-entered facts.
- Quotations cannot jump directly from draft to sent or accepted.
- Approved, sent and accepted states require recorded owner approval.
- Marking a quotation sent never executes an outbound email.
- Calendar downloads do not issue external invitations.
- Tracking numbers are stored as references, not delivery proof.
- Follow-up tasks are internal and do not contact the buyer automatically.
- Existing local PI/quotation readiness tools remain available; the Commercial Hub adds persistent CRM-linked records.

## Phase 3 progress

- **3.1** Sales Pipeline & CRM Tasks — complete
- **3.2** Buyer 360 — complete
- **3.3** Commercial Hub — this batch
- **3.4** Daily owner dashboard, saved views, reports and team usability — remaining
