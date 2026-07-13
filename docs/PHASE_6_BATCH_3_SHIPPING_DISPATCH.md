# Phase 6.3 — Packing, Dispatch, Tracking & Delivery Evidence

## Purpose

Add an internal shipping-control layer that turns QC-released production jobs into evidence-backed dispatch records without booking couriers automatically, promising buyer dates, or treating a tracking draft as a real shipment.

## Admin workflow

1. Create one internal shipment against an existing production job.
2. Complete consignee, destination, shipping mode, Incoterm, courier/forwarder and service details.
3. Add every carton/package with units, weights, dimensions, seal and contents.
4. Upload commercial invoice, packing list and other export documents to private storage.
5. Verify required documents.
6. Run deterministic client and server dispatch-readiness checks.
7. Owner explicitly approves internal dispatch readiness.
8. Only after a real booking exists, record the exact booking reference, AWB/tracking/BL number and optional HTTPS tracking URL.
9. Record tracking events with exact timestamps and source evidence.
10. Record, verify and confirm delivery from POD/buyer/carrier evidence.

## Backend source prepared

Migration: `20260713233000_production_shipping_dispatch.sql`

It prepares:

- shipping risk/approval/timestamp fields on `production_jobs`;
- `production_shipments`;
- `production_packages`;
- `production_shipping_documents`;
- `production_tracking_events`;
- `production_delivery_evidence`;
- admin-only RLS and summary view;
- deterministic dispatch-readiness RPC;
- owner dispatch approval RPC;
- evidence-backed dispatch and delivery RPCs.

Private files reuse the non-public `production-evidence` bucket prepared in Phase 6.2.

## Dispatch rules

Owner dispatch approval is blocked when:

- owner-approved QC release is missing;
- destination or consignee details are incomplete;
- courier/forwarder or service level is missing;
- no package exists;
- package units or gross weight are invalid;
- any package is not sealed/loaded/delivered;
- no required shipping document checklist exists;
- any required document lacks a private file or verified status.

Dispatch recording additionally requires:

- prior owner dispatch approval;
- exact booking reference;
- exact tracking/AWB/BL number;
- HTTPS-only tracking URL when supplied.

## Delivery rules

Delivery confirmation requires:

- shipment already recorded as dispatched;
- exact delivery timestamp;
- recipient name;
- verified delivery evidence.

Delivery confirmation does not automatically close the commercial order or trigger repeat-order outreach.

## Evidence and safety controls

- Shipping files stay private and open through five-minute signed URLs.
- SHA-256 is recorded when browser support is available.
- Required documents are verified or rejected; they are not silently accepted.
- Tracking events store exact occurrence time and source.
- Exceptions, returns, damaged packages and rejected required documents produce blocked risk.
- Internal target dates are not buyer promises.
- No courier API call, buyer message, customs submission or shipment booking is performed by this batch.

## Final activation requirements

1. Apply all earlier production migrations through Phase 6.2.
2. Apply `20260713233000_production_shipping_dispatch.sql`.
3. Confirm the private `production-evidence` bucket and policies exist.
4. Create a non-commercial test shipment.
5. Confirm missing QC release blocks approval.
6. Confirm unsealed packages and unverified documents block approval.
7. Confirm an owner-approved shipment cannot be marked in transit without exact booking evidence.
8. Confirm HTTP tracking URLs are rejected.
9. Record an exception and verify blocked risk.
10. Verify a delivery record cannot confirm delivery until evidence is verified.
11. Confirm no buyer email, WhatsApp, courier booking or customs submission occurs.

## Not performed in this batch

- No migration or storage policy was applied.
- No courier or freight-forwarder API was called.
- No package, document, tracking event or POD was written to a live backend.
- No buyer was notified.
- No shipment was booked or dispatched.
- No customs declaration was submitted.
- No production website publish was performed.
