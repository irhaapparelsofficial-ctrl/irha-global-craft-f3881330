# P0 Admin Real Workflows Validation — 14 July 2026

## Goal

The owner admin must operate against real owner-controlled Supabase data and authenticated Edge Functions. A screen is not considered working merely because it renders, calculates locally, shows an alert or has a deployed backend function.

## Production identity and authorization

Production project:

`pvzjiozismyxqrzmtfbi`

Verified owner account:

- Email: `irhaapparelsofficial@gmail.com`.
- Auth user ID: `fa4adb2d-0665-4528-b562-116420aa7e01`.
- Email confirmed.
- Successful owner sign-in recorded.
- Exactly one `admin` role exists and it belongs to this owner account.

The frontend independently verifies the Auth user and the database admin role. Public registration remains closed.

## Rollback-only owner RLS test

A transaction was executed in production using the authenticated owner JWT identity. Every mutation was rolled back, and residue checks returned zero.

The test proved authenticated admin access for:

- Read access to all 64 products and 26 categories.
- Inquiry update and delete.
- Catalogue lead update and delete.
- Website chat deletion.
- Category insert and delete under an existing canonical parent.
- Product insert, update, read-back verification and delete.
- B2B lead insert, CRM status update and delete.
- Persistent CRM quotation insert and update.
- Persistent quotation item insert and delete.
- Internal automation task insert, update and delete.

Final result:

- `rollback_only_admin_crud`: `passed`.
- Product residue: `0`.
- Category residue: `0`.
- Inquiry residue: `0`.
- Catalogue lead residue: `0`.
- Chat residue: `0`.

No genuine product, category, buyer, lead, quotation, chat or automation record was changed.

## Real modules already backed by production data

### Products and categories

The dedicated Products and Product Categories panels perform real Supabase create, read, update and delete operations behind authenticated admin RLS. Product saves perform a database read-back before reporting success. Product CSV export is generated from the loaded database records.

### Buyer CRM

The New Requests panel combines:

- `inquiries`.
- `catalogue_leads`.
- `b2b_leads`.

It verifies CRM schema readiness, saves real status, priority, assignee, follow-up, quotation link, PI link, sample status, notes and timeline history. Private inquiry files are opened through short-lived signed URLs from the private `inquiry-uploads` bucket.

### Commercial Hub

Meetings, samples, quotations and quotation line items are stored in persistent CRM tables. Commercial work remains draft or owner-controlled until deliberately approved.

### Website chat and traffic

The admin reads server-persisted `chat_messages` and consented `page_views`. Public chat writes are performed by the server-side chat function; anonymous public table insert access is not enabled.

### Outreach, AI, social, WhatsApp, SEO and lead research

The corresponding authenticated Edge Functions are ACTIVE in owner Supabase. Sensitive functions require JWT authentication. Deployment alone is not treated as connector verification.

## Production connection state

### Gmail

The production Gmail sync state reported:

- Last status: `success`.
- Messages seen: `140`.
- Gmail inbox items currently stored: `8`.
- Last error: none.

### Social platforms

Facebook, Instagram, LinkedIn and TikTok account records exist, but all currently report:

- `enabled = false`.
- `verification_status = missing`.
- No external account ID.
- No successful verification timestamp.

Therefore social publishing must remain blocked even though the publishing functions are deployed.

### Automation safety

Automation settings are enabled for internal preparation, but:

- Lead auto-import is disabled.
- SEO auto-publish is disabled.
- Social auto-publish is disabled.
- External listing publish is disabled.

This preserves owner approval for external or commercial actions.

## Defects repaired in this checkpoint

### Browser-only PI mockup

The previous PI screen generated a temporary number from browser time and printed local state. It did not save a buyer, quotation or line item.

Repair:

- The PI entrypoint now opens the persistent Commercial Hub directly on Quotations.
- Real quotation numbers, buyer data, line items, totals, status and approval state remain in owner Supabase.

### Placeholder pricing and mockup screen

The previous screen displayed a fake mesh-render node, calculated an unused estimate and used a browser alert for “Lock Spec”.

Repair:

- Pricing requirements are now saved as persistent `automation_tasks` with action `pricing_review`.
- Tasks require approval and are internal-only.
- Payload stores product, quantity, preferred currency, verified material brief, branding, destination and owner notes.
- Commercial state begins as `unquoted`.
- No FOB, EXW, MOQ, sample fee, production time or shipping value is invented.
- The screen links to the actual public Custom Lab route for deterministic mockup previews.

### Duplicate destructive catalog editor

The old Catalog panel duplicated Products and Categories mutations and could create unsafe top-level structures or misleadingly delete a category “and all products”.

Repair:

- The panel is now a read-only live catalog structure view.
- It reads current owner Supabase categories and products.
- It reports published counts, orphan products and verified category PDF URLs.
- It provides public preview links.
- Mutations remain only in the dedicated guarded Products and Product Categories panels.
- A PDF is not labelled available unless a real `catalog_url` exists.

### Unverified social channel selection

The previous manual social console allowed selecting channels without first reading the actual platform account state.

Repair:

- The console now loads `social_platform_accounts`.
- A channel is selectable only when it is enabled, has an external account ID and has `verification_status = verified`.
- Missing or unverified channels remain visibly blocked.
- The authenticated backend still returns and displays the exact per-channel result.

## Automated regression contracts

Tests now guard that:

- PI uses the persistent quotation workflow and no longer creates a local time-based draft.
- Pricing reviews write to the persistent approval queue and do not call the old calculator or alert placeholder.
- The catalog release view contains no insert, update or delete operation.
- PDF availability is tied to a real category URL.
- Social actions read platform account state and block unverified accounts.
- Core Products, Categories and Buyer CRM mutations remain present.
- Sensitive admin, outreach, social and WhatsApp functions remain JWT-protected.

## Still requiring owner-session browser acceptance

This checkpoint proves production schema, RLS, deployment and source behavior. The following must still be exercised through the final published admin UI with the real owner session:

- Password sign-in from the final live build.
- Visual navigation and layout on iPhone and desktop.
- Create/edit/delete interactions through the browser for a controlled draft record.
- Browser CSV download.
- Browser private-file signed download.
- Commercial quotation create/edit/print flow.
- Pricing review creation through the browser.
- Confirming that unverified social channels are disabled in the published build.
- Gmail, WhatsApp, AI and outreach health responses while authenticated.
- Exact GitHub, Lovable and live-production source parity before final activation.

## Rollback

All source changes are isolated in the focused admin workflow pull request. Reverting it restores the prior UI. This checkpoint contains no database migration, no persistent test data, no paid purchase, no buyer communication and no external publish action.
