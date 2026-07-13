# P0 Compare and Shortlist Validation — 14 July 2026

## Certified base

This checkpoint starts from exact certified main:

`c3769f5a7757ecddc2c2d6a13d7ac885832c3999`

## Production catalogue integrity evidence

A read-only query against owner Supabase project `pvzjiozismyxqrzmtfbi` verified:

- Published products: `64`.
- Duplicate published slugs: `0`.
- Published products missing a category: `0`.
- Published products missing a primary image: `0`.
- Published products missing a primary material: `0`.

Detailed comparison fields are not yet populated across the catalogue:

- Missing SKU: `64`.
- Missing fabric composition: `64`.
- Missing GSM/weight: `64`.
- Missing available sizes: `64`.
- Missing available colors: `64`.

No specification value was invented or mass-filled. Those fields require verified product data in a later activation phase.

## Confirmed defects

### Category row could not work

The Compare page queried `products.*` and attempted to read a non-existent `products.category_name` field. The production schema has no `category_name` column, so the Category comparison row could not be populated from the query.

### Stale saved items caused column mismatch

Table headers were rendered from all browser-saved compare items, while specification cells were rendered only from products returned by the current published-products query. If a product was unpublished, removed or unavailable, header and body columns no longer aligned.

### Query failures were silent

The database query ignored Supabase errors, leaving the buyer with an empty or incomplete comparison without a retry path.

### Legacy storage could create broken product URLs

Older or malformed browser entries without `categorySlug` produced links containing `/undefined/`. Stored values were trusted after JSON parsing without validating that each entry had a usable slug.

## Repairs

- Compare query now joins the published category name.
- Saved category context is used when available.
- One table column is preserved for every saved compare item.
- Unavailable products are clearly marked and removable.
- Database errors show an honest warning and Retry action.
- Loading state is announced to assistive technology.
- Only fields backed by available published data are shown.
- Shortlist and compare product links use a safe encoded path helper.
- Legacy entries without category context fall back to `/products` instead of a broken URL.
- Browser storage parsing rejects non-array data and entries without a valid slug.
- Compare remains capped at four newest unique products.
- Buyer-facing WhatsApp copy asks for requirement review rather than assuming a quotation can be issued immediately.
- Mobile action targets were increased for clear touch use.

## Automated coverage

- Compare remains capped at four products.
- Re-adding a product deduplicates and moves the updated item to the front.
- Malformed and non-array local storage is ignored safely.
- Clearing Compare does not clear Shortlist.
- Product path encoding and legacy fallback are tested.
- A missing/unpublished product still retains its aligned saved column.
- Category context is shown from the saved item.
- Empty SKU/GSM rows are not displayed.
- Available material and country rows remain based on actual product data.

## Deferred activation

The following are not fabricated in this P0 repair:

- SKU assignments.
- Fabric composition.
- GSM or leather weight.
- Size ranges.
- Available colors.
- MOQ, pricing, sample timing, production timing or shipping terms.

These require product-by-product verification and owner approval before publication.

## Rollback

This checkpoint contains frontend and test changes only. Revert the focused pull request to restore the previous Compare and Shortlist behavior. No database, storage, Edge Function, buyer record or commercial communication is changed.
