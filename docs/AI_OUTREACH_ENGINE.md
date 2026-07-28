# Irha AI Outreach Engine v1

## Purpose

Create evidence-based one-to-one B2B outreach from verified or qualified Buyer CRM records, keep approval and Gmail sending as separate actions, store exact Gmail results and detect replies in the original thread.

## Eligibility

A Buyer CRM lead is eligible only when it has a valid business email, has not opted out, and either:

- has a verification score of 70 or higher, or
- has a qualified workflow status such as qualified, contacted, replied, sample requested, quote requested, quotation sent, negotiation or follow-up.

The backend enforces this rule even if a frontend request is manipulated.

## Workflow

1. Select eligible Buyer CRM leads with valid business emails.
2. Enter a campaign objective, product focus, target market, language mode and call to action.
3. Generate drafts. This step does not approve or send anything.
4. Review and edit each subject, body and language.
5. Explicitly approve each draft for sending.
6. In a separate action, select already-approved messages and send a maximum of 10.
7. Gmail returns its message ID, thread ID and history ID; the exact connector response is stored.
8. Sync replies by reading the same Gmail thread and checking for a message from the recipient.
9. Generate follow-up drafts for sent initial messages older than five days with no detected reply.
10. Every follow-up remains a draft until explicitly approved and then separately sent.

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

## Approval and retry policy

Only messages with an existing approval timestamp and approving admin can be sent.

A failed message can be retried only when it was approved before the failed send. Saving an approved message back as a draft clears its approval.

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
- verification should focus on the exact program, team and written scope
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

- up to 50 eligible leads per AI generation request
- AI generation is processed in indexed batches so drafts remain mapped to the correct lead
- up to 10 irreversible Gmail sends per separate confirmation
- up to 30 sent threads per reply-sync request
- up to 20 first follow-up drafts per request

## Current boundary

This release does not automatically send on a schedule. It prepares drafts and follow-ups automatically, but every irreversible Gmail send requires prior message approval and a separate owner confirmation.
