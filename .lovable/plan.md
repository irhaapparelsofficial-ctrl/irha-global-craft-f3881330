
# Supabase Project Migration Plan
**Source:** `mlefxgyaqoisvdmoiapq` (current Lovable Cloud backend, 15 tables, 662+ rows)
**Destination:** `pvzjiozismyxqrzmtfbi` (empty target project)
**Rule:** No destructive action on source until destination is fully validated and live.

---

## ⚠️ Risk Points (Read Before Approving)

1. **Lovable Cloud lock-in.** The current backend is Lovable-managed. Lovable Cloud auto-provisions `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) and the generated client at `src/integrations/supabase/client.ts` — both are auto-regenerated and cannot be permanently pointed at a non-Lovable project. Any manual override will be overwritten on the next Cloud sync. **This is the #1 blocker.** Before touching data, confirm whether `pvzjiozismyxqrzmtfbi` is (a) a second Lovable Cloud project that we can swap Cloud onto, or (b) an external Supabase project you own directly. Path (b) means detaching Lovable Cloud from this project permanently (irreversible per Cloud docs).
2. **Auth users cannot be exported with passwords** via SQL. `auth.users` rows can be recreated but password hashes require admin API access; users may need password reset. Confirm whether any real end-users exist (currently the only auth users are admin accounts).
3. **Storage files** (`social-uploads`, `mockup-uploads`, `mockup-cache`) must be downloaded and re-uploaded — bucket contents are not part of a SQL dump.
4. **Edge Function secrets** (`LOVABLE_API_KEY`, `META_ACCESS_TOKEN`, `IG_ACCOUNT_ID`, `META_PAGE_ID`, connector-managed `TIKTOK_API_KEY`, `LINKEDIN_API_KEY`, `GOOGLE_SEARCH_CONSOLE_API_KEY`) must be re-added at destination. Connector-managed ones require reconnecting the connector (cannot be copied).
5. **pgmq + pg_cron email pipeline.** The `email_queue_wake` / `email_queue_dispatch` functions reference the source project URL hard-coded and pull a service role key from `vault.decrypted_secrets`. Both must be rewritten for the destination URL, and the vault secret re-seeded.
6. **Cron jobs** (`process-email-queue`) live in `cron.job` and must be re-scheduled on destination.
7. **Extensions** (`pgmq`, `pg_cron`, `pg_net`, `vault`) must be enabled on destination before functions/migrations replay.
8. **SEO impact.** Sitemap/prerender rely on live DB reads at build time. Any downtime during cutover = temporary loss of dynamic routes. Mitigation: dual-run before switching DNS/`.env`.
9. **Custom domains** (`irhaapparels.com`, `www.irhaapparels.com`) continue to point at the Lovable-hosted frontend — no DNS change needed, but the frontend rebuild must succeed with the new client before we publish.
10. **Rollback**: keep source untouched and read-only-in-practice during cutover. If destination fails validation, revert `.env` + client, republish — no data loss.

---

## Phase 1 — Export Everything (no writes anywhere)

Artifacts land in `/mnt/documents/migration-<timestamp>/`.

| # | Item | Method | Output |
|---|---|---|---|
| 1 | Table data (all 19 tables incl. new blog/faq/seo/internal_links) | `COPY … TO STDOUT CSV` per table | `data/*.csv` |
| 2 | Schema DDL (tables, columns, defaults, indexes, FKs) | `pg_dump --schema-only` via read-only introspection queries | `schema.sql` |
| 3 | RLS policies | Query `pg_policies` | `policies.sql` |
| 4 | Database functions | Query `pg_proc` for `public` schema | `functions.sql` |
| 5 | Triggers | Query `pg_trigger` | `triggers.sql` |
| 6 | Sequences + current values | Query `pg_sequences` | `sequences.sql` |
| 7 | Enums / custom types (`app_role`, etc.) | Query `pg_type` | `types.sql` |
| 8 | Grants | Query `information_schema.role_table_grants` | `grants.sql` |
| 9 | Storage bucket metadata + all files | List `storage.buckets` + download every object via signed URLs | `storage/<bucket>/…` |
| 10 | Edge Function source | Copy `supabase/functions/*` from repo (already versioned) | `edge-functions/` |
| 11 | Secrets inventory (names only, never values) | `fetch_secrets` | `secrets.txt` |
| 12 | Cron jobs | Query `cron.job` | `cron.sql` |
| 13 | Webhooks / net.http calls | Grep functions for `net.http_post` | `webhooks.md` |
| 14 | Auth users (id, email, role, metadata — no password hashes) | Query `auth.users` (read-only view) | `auth-users.csv` |

**Checkpoint:** I present the export summary + row counts + storage file counts. You confirm before Phase 2.

---

## Phase 2 — Prepare Destination (`pvzjiozismyxqrzmtfbi`)

**Requires:** you granting me access to the destination project (right now I only have tool access to the source). I'll need you to either:
- (a) Confirm `pvzjiozismyxqrzmtfbi` is a Lovable Cloud project and we swap this Lovable project's Cloud binding to it, **or**
- (b) Provide destination service role key + URL as secrets so I can run migrations via a one-off edge function or `psql` from exec.

Then, in order:
1. Enable extensions: `pgcrypto`, `pgmq`, `pg_cron`, `pg_net`, `vault`.
2. Replay `types.sql` → `schema.sql` → `grants.sql` → `functions.sql` → `triggers.sql` → RLS policies → sequences.
3. Rewrite hard-coded source URL in `email_queue_wake` / `email_queue_dispatch` to destination URL.
4. Create storage buckets (private) matching source.
5. Re-add secrets (I request each via `add_secret`; connector-managed ones need reconnect via Connectors UI).
6. Seed `email_queue_service_role_key` into `vault`.

---

## Phase 3 — Data + Files Copy

1. `COPY … FROM STDIN` each CSV in FK-safe order:
   `user_roles → categories → products → master_cartons → business_suits → faqs → blog_posts → seo_page_overrides → internal_links → inquiries → b2b_leads → catalogue_leads → chat_messages → page_views → social_posts → email_send_log → email_send_state → email_unsubscribe_tokens → suppressed_emails`.
2. Reset sequences to `max(id)+1`.
3. Upload storage files bucket-by-bucket.
4. Recreate cron `process-email-queue` schedule (only after edge function is deployed at destination).

**Checkpoint:** row-count diff between source and destination must be 0. I show you the table.

---

## Phase 4 — Frontend Cutover

1. Update `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` → destination.
2. Regenerate `src/integrations/supabase/types.ts` against destination.
3. Update any hard-coded source URLs (grep for `mlefxgyaqoisvdmoiapq`) — currently in DB functions only, but sweep the repo anyway.
4. Republish via Publish button. Source stays untouched.

---

## Phase 5 — Validation Checklist (before touching source)

- [ ] Homepage loads, hero slideshow, categories render
- [ ] `/admin` dashboard opens, role check passes, live visitor panel populated
- [ ] Products list (64) + category tree (26) render with correct counts
- [ ] Product detail page loads with images from destination storage
- [ ] `/catalogue` + all 11 catalogue category pages
- [ ] Quote form submits → row lands in `inquiries` + WhatsApp + gtag conversion fires
- [ ] Catalogue lead form submits → `catalogue_leads`
- [ ] Chat widget writes to `chat_messages`
- [ ] Blog index + article pages (schema-driven)
- [ ] FAQ schema present on category pages
- [ ] Compliance page renders
- [ ] Storage images resolve (product hero, mockup cache)
- [ ] Sitemap.xml regenerated with destination data, contains all routes
- [ ] Prerendered pages match live
- [ ] Email queue: submit test inquiry → email sent, cron re-arms and disarms
- [ ] Google Ads pixel + hreflang tags intact

**Only after every item passes:** mark source as archived (I'll NOT delete it). You decide when/if to delete it from the Cloud dashboard.

---

## Deliverables Right Now (if you approve this plan)

I'll produce Phase 1 exports and a summary report. Zero writes to source, zero writes to destination. You review, then greenlight Phase 2.

## Open Questions I Need Answered Before Phase 2

1. Is `pvzjiozismyxqrzmtfbi` a **Lovable Cloud** project or an **external Supabase** project you fully own?
2. If external: you accept that disconnecting Lovable Cloud from this project is **irreversible** (per Cloud docs — reverts don't undo it).
3. Any real end-users in `auth.users` who must retain their passwords? (If yes, we plan password-reset emails.)
4. Confirm you'll reconnect TikTok / LinkedIn / Google Search Console connectors on destination after cutover.
