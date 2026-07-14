# Owner-Approved Lead File Outreach v2

## Live workflow

1. The owner uploads a CSV or XLSX lead workbook through the private lead intake center.
2. The workbook is retained in the private CRM storage bucket with checksum, campaign, sheet and restartable staging checkpoints.
3. Candidate rows can use a valid business email or WhatsApp route.
4. The owner explicitly activates reviewed candidates into Buyer CRM. Activation does not send any message.
5. AI generates one truthful draft per eligible buyer.
6. The owner reviews and edits the channel, subject and message.
7. One **Approve & Send** click passes exactly one approved email to the verified Gmail outreach engine or one prepared WhatsApp draft to the verified WhatsApp admin sender.
8. WhatsApp provider restrictions, opt-out state and customer-service window are enforced. A blocked provider action is stored as manual-required or failed and is never marked sent.

## File scope

The original uploaded lead workbook remains privately linked to activated CRM leads for evidence and audit. Buyer documents can also be stored privately in Buyer 360. The current provider handoff sends the approved message text and does not claim that private files were transmitted as email or WhatsApp attachments.

## Guardrails

- AI generation never sends.
- No bulk auto-send.
- No invented price, MOQ, delivery, certification or buyer-intent claims.
- No public storage URLs.
- Owner confirmation is required for CRM activation and each provider dispatch.
- Every meaningful transition is stored in database audit records.
