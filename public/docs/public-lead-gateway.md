# Irha Apparels Public Lead Gateway

The public lead gateway accepts validated B2B buyer inquiries, catalogue requests and signed upload-ticket requests. It is intentionally separate from the owner-only admin APIs.

## Endpoint

`POST https://pvzjiozismyxqrzmtfbi.supabase.co/functions/v1/public-lead-gateway`

The machine-readable contract is available at `/openapi/public-lead-gateway.json`.

## Confirmation rule

An agent must show the buyer the company, contact details, requested category, quantity and message before sending a side-effecting submission. A request must not be submitted merely because an agent discovered this API.

## Supported actions

- `submit_inquiry`: create an RFQ, inquiry, connection request or mockup request.
- `submit_catalogue`: request a relevant product catalogue.
- `create_upload`: create a short-lived signed upload ticket for a PDF or image up to 10 MB.

## Safeguards

Requests are server-validated, rate-limited and honeypot-protected. Invalid origins, unsupported methods and malformed payloads are rejected. Public callers cannot read leads, admin records, private uploads or internal automation data.

## Commercial accuracy

Product feasibility, materials, MOQ, pricing, production timing, shipping and documentation are confirmed only after Irha Apparels reviews the buyer's requirements. The API does not publish fixed commercial commitments or unverified certification claims.
