# Phase 6.3 — Packing, Dispatch & Delivery Evidence

## Purpose

Add a controlled dispatch layer after production and QC. It records carton evidence, private shipment documents, an internal shipment record, tracking events and delivery proof without booking a carrier, contacting a buyer or treating an internal status as external confirmation.

## Admin workflow

1. Select a production job with owner-approved QC release.
2. Add cartons with item counts, net/gross weight, dimensions, contents and seal reference.
3. Verify each carton after packing checks.
4. Create an internal shipment record with mode, carrier, destination, booking/tracking references and an optional HTTPS tracking URL.
5. Upload packing list, commercial invoice and mode-specific shipment documents to a private bucket.
6. Verify or reject each document; opening uses a five-minute signed URL.
7. Record tracking events with their explicit source and evidence reference.
8. Record pickup, handover, tracking, delivery or exception evidence.
9. Verify delivery evidence separately.
10. Run client and server dispatch-readiness checks.
11. Owner explicitly approves internal dispatch release.

## Backend source prepared

Migration: `20260713234000_production_shipping_dispatch.sql`

It prepares:

- dispatch state/risk/release fields on `production_jobs`;
- `production_packages`;
- `production_shipments`;
- `production_shipping_documents`;
- `production_tracking_events`;
- `production_delivery_evidence`;
- private `production-shipping-documents` storage bucket;
- admin-only RLS and short-lived signed access;
- shipment creation/status, document verification, tracking, delivery and owner-release RPCs;
- deterministic dispatch state refresh triggers;
- admin-only `production_dispatch_summary` view.

## Dispatch release rules

Internal release is blocked when any of the following applies:

- QC release is not owner-approved;
- there are no cartons;
- carton numbers are duplicated;
- a carton has invalid item count, weight or dimensions;
- a carton is not verified;
- packing list or commercial invoice is not verified;
- a required certificate of origin is missing when explicitly enabled;
- a mode-specific label/airway bill/bill of lading is not verified;
- a shipment booking/tracking reference is missing;
- shipment status is draft, quoted, exception or cancelled;
- a rejected document remains;
- a delivered shipment lacks verified delivery evidence.

Owner dispatch release does not:

- call a courier or carrier API;
- spend freight money;
- send a buyer notification;
- mark a shipment collected, in transit or delivered;
- bypass QC, commercial approval or payment checks.

## Private document controls

- bucket is non-public;
- maximum file size is 20 MB;
- explicit MIME allow-list;
- object path is restricted to the production job prefix by the admin workflow;
- SHA-256 is stored when the browser can calculate it;
- metadata is verified/rejected, never silently overwritten;
- file opening creates a five-minute signed URL;
- no public document URL is generated.

## Tracking truth rules

- manual events are stored as `manual_verified` and never represented as carrier API results;
- source can be carrier API/email or buyer confirmation only when that exact evidence exists;
- status cannot move backwards through the controlled RPC;
- delivered/cancelled are terminal states;
- exception and customs-hold evidence remain visible;
- delivery requires separate verified evidence.

## Final activation requirements

1. Apply earlier production and quality migrations first.
2. Apply `20260713234000_production_shipping_dispatch.sql`.
3. Sign in as the authorised admin.
4. Create a non-commercial test job with approved QC release.
5. Verify invalid weights, dimensions and duplicate cartons are rejected.
6. Upload and verify test documents; confirm the signed URL expires.
7. Test courier, air and sea mode-specific document requirements.
8. Confirm backward shipment status is blocked.
9. Confirm delivered status requires verified delivery proof.
10. Confirm owner dispatch release creates internal audit evidence without external carrier or buyer action.

## Not performed in this batch

- No database migration or storage bucket was applied.
- No package, shipment, tracking or delivery record was written to a live backend.
- No private document was uploaded.
- No carrier was booked or contacted.
- No buyer message was sent.
- No freight payment was made.
- No production website publish was performed.
