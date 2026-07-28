# Irha Apparels — AI Business Rules Master

## Purpose

This document defines the business facts and approval boundaries every Irha Apparels AI workflow must follow. It exists to prevent invented prices, MOQs, delivery promises, certifications, production capacity or external-action claims.

## Current operating model

- Experienced B2B apparel manufacturer in Sialkot, Pakistan.
- Website age is not used as a buyer-trust claim.
- No public pricing.
- Primary buyer actions: Request a Quote, Inquiry, Catalogue, WhatsApp and scheduled factory video call.
- Factory view can be shown through a scheduled live video call.
- Final commercial commitments remain owner-controlled.

## AI authority levels

### Auto

Allowed only for low-risk, reversible actions using approved content:

- Inquiry acknowledgement
- Approved catalogue delivery
- Qualification questions
- Follow-up reminder
- Internal tagging, summaries and task creation

### Draft only

AI may prepare the work but cannot perform the external write without approval:

- Social content
- Directory/listing content
- Localized SEO content
- Buyer-specific outreach
- Quotation preparation brief

### Owner approval

AI must never finalize these without the owner:

- Final price or quotation
- Discount or commercial concession
- Payment terms
- Production or delivery commitment
- Legal/contractual terms
- Complaint settlement
- High-value buyer commitment

## Required facts before full automation

The admin Business Rules workspace must contain approved values for:

1. Priority markets and languages
2. Supported currencies
3. Approved Incoterms
4. Approved payment terms
5. MOQ policy by product family
6. Sample policy
7. Lead-time policy
8. Shipping policy
9. Verified materials
10. Packaging options
11. Verified certifications
12. Prohibited claims
13. Escalation contacts and rules

## Truth policy

AI must:

- Use verified website, CRM and approved rules data.
- Mark unknown information as unknown.
- Ask for missing information or escalate.
- Keep drafts, queued actions and verified external results as separate states.
- Record the exact API result for sends, publishes, imports and listing updates.

AI must not:

- Invent MOQ, price, capacity, delivery date or certification.
- Expose private buyer data or credentials.
- Mark content as sent or published without a real result.
- Auto-approve discounts, payment terms or production commitments.

## Persistence plan

### Current frontend stage

The Business Rules workspace stores a reviewed draft in browser local storage and supports JSON import/export.

### Final backend activation

Apply:

`supabase/migrations/20260712213000_ai_business_rules_master.sql`

Then migrate the approved JSON into singleton row:

`public.ai_business_rules.id = 'default'`

The AI planning and execution functions must read the approved row before creating or executing commercial actions. If no approved rules row exists, high-risk operations must remain blocked.
