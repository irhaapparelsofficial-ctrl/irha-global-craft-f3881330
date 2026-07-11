# Irha AI Outreach Engine v1

## Purpose

Create evidence-based one-to-one B2B outreach from verified Buyer CRM records, keep every send behind explicit owner confirmation, store exact Gmail results and detect replies in the original thread.

## Workflow

1. Select eligible Buyer CRM leads with valid business emails.
2. Enter a campaign objective, product focus, target market, language mode and call to action.
3. Generate drafts. This step does not send anything.
4. Review and edit each subject/body/language.
5. Approve drafts individually or select a maximum of 10 for an explicit approve-and-send action.
6. Gmail returns its message ID, thread ID and history ID; the exact connector response is stored.
7. Sync replies by reading the same Gmail thread and checking for a message from the recipient.
8. Generate follow-up drafts for sent initial messages older than five days with no detected reply.
9. Every follow-up remains a draft until explicitly approved and sent.

## Gmail transport

The Edge Function calls the connected Gmail account through Lovable's connector gateway:

- profile: `/google-mail/gmail/v1/users/me/profile`
- send: `/google-mail/gmail/v1/users/me/messages/send`
- message lookup: `/google-mail/gmail/v1/users/me/messages`
- thread read: `/google-mail/gmail/v1/users/me/threads/{threadId}`

Runtime requires both the project `LOVABLE_API_KEY` and the opaque Gmail connection key exposed as `GOOGLE_MAIL_API_KEY`. Credentials are never placed in the browser.

The UI distinguishes:

- configured connection
- verified Gmail profile
- ready to generate AI drafts
- ready to send

## Duplicate-send protection

Each outreach row has a unique idempotency key and a deterministic RFC 2822 Message-ID.

Before retrying a failed send, the engine searches Gmail for that Message-ID. If Gmail already contains it, the row is recovered as sent instead of sending a duplicate.

## Personalization policy

The AI may use only stored Buyer CRM evidence:

- company name
- country
- website
- buyer type
- apparel/product segment
- verification evidence
- internal notes
- prior outreach status

It must not invent:

- contact names
- buyer interest
- orders or stock needs
- certifications
- customers
- prices
- delivery promises
- compliments unsupported by evidence

Allowed Irha Apparels trust facts:

- experienced apparel manufacturer in Sialkot, Pakistan
- website is newly built; the company is not new
- live factory video call is available
- OEM, ODM, private-label and custom manufacturing
- custom quote after requirement review; no public price

## Opt-out and suppression

Every sent message includes:

- a visible opt-out URL
- `List-Unsubscribe`
- `List-Unsubscribe-Post: List-Unsubscribe=One-Click`

The public `outreach-unsubscribe` function:

- validates the unique token
- adds the email to `suppressed_emails`
- marks the outreach message unsubscribed
- marks the CRM lead opted out
- prevents future sends

Suppression and opt-out are rechecked immediately before every Gmail send.

## Tables

- `outreach_campaigns`
- `outreach_messages`
- `outreach_events`

Buyer CRM also gains:

- `outreach_opt_out`
- `last_outreach_at`
- `last_outreach_status`
- `last_gmail_thread_id`
- `last_reply_at`

## Limits

- up to 50 leads per AI generation request
- up to 10 irreversible Gmail sends per explicit confirmation
- up to 30 sent threads per reply-sync request
- up to 20 first follow-up drafts per request

## Current boundary

This release does not automatically send on a schedule. It prepares drafts and follow-ups automatically, but an owner confirmation is still required for every irreversible Gmail send batch.
