# Irha Apparels — Full Platform Audit

**Audit date:** 14 July 2026  
**Repository:** `irhaapparelsofficial-ctrl/irha-global-craft-f3881330`  
**Production backend:** owner-controlled Supabase project `pvzjiozismyxqrzmtfbi`  
**Public domain:** `irhaapparels.com`

## 1. Executive conclusion

Irha Apparels is no longer a basic brochure website. It has a substantial B2B commerce, CRM, quotation, production, content, SEO, social, automation and administration foundation. The public catalogue and core database are production-capable, the owner Supabase runtime is isolated from Lovable-managed environment variables, and current-main CI was green at the start of this audit.

The platform is **technically advanced but operationally only partially activated**. Many modules exist in code and database schema, while several contain little or no real business data. The immediate goal is therefore not to add another large one-shot feature set. It is to certify each existing buyer and admin journey, repair verified runtime failures, activate the highest-value modules with real approved data, and keep every change reversible.

The first confirmed buyer-facing runtime defect was found in the public Custom Lab: the frontend called `generate-mockup`, but that Edge Function was not deployed. The function has now been replaced by a free deterministic PNG concept-preview renderer, deployed to the owner Supabase project, and verified with a real HTTP 200 smoke test returning valid front and back PNG data URLs.

## 2. Audit method

The audit used four separate checks:

1. **Public viewer and buyer journey:** routes, product discovery, trust, conversion actions, customisation, contact and policy surfaces.
2. **Exporter and owner workflow:** admin navigation, lead handling, quotation, production, content, SEO, social, directory and system controls.
3. **Backend reality:** exact database objects, Row Level Security, data volumes, storage, Edge Functions, security/performance advisors and runtime logs.
4. **Developer/release integrity:** current-main source, CI history, immutable production runtime configuration, stale notifications versus current status, and reversible branch-first changes.

A feature is classified separately as:

- **Built:** code/schema exists.
- **Connected:** frontend and backend are wired together.
- **Verified:** a current runtime test passed.
- **Activated:** real approved business data and operating process are present.

## 3. Current verified platform inventory

### Public catalogue and content foundation

- 26 product categories.
- 64 products.
- Public routes for home, all products, category pages, product details, comparison, shortlist, Custom Lab, FOB calculator, inquiry, contact, repeat order, catalogues, factory video-call request, about, privacy and terms.
- Request-a-quote B2B positioning rather than consumer checkout.
- SEO metadata, canonical handling, structured content foundations and multilingual SEO tooling.
- Download, compare, shortlist and buyer requirement-capture utilities.

### Owner backend

Exact production database counts at audit time:

- 97 public tables.
- 7 public views.
- 116 public functions.
- 145 RLS policies.
- 9 storage buckets.
- 144 storage objects.
- 1 authenticated owner account.
- 1 admin role assignment.
- 2,089 recorded page-view rows.

All inspected public tables had Row Level Security enabled.

### Admin and operations foundation

The admin workspace includes grouped navigation and mobile navigation for:

- Daily owner work and overview.
- Sales pipeline, Buyer 360, quotations and deals.
- Website requests, buyer discovery, chat, WhatsApp, email and follow-ups.
- Products, categories and PDF catalogues.
- Website pages, blog/FAQ/content, SEO, listings, social, traffic and Google Search data.
- Pricing/mockups, quotation/PI builder, samples/production and export contacts.
- AI assistant, approval rules, connections, market rates and system health.

### Edge and automation foundation

Active functions include public lead intake, website chat, admin AI, lead research, multilingual SEO, outreach controls, email queue processing, social rendering/publishing, WhatsApp integration, Google Search operations and system health. One-time migration endpoints remain as disabled HTTP 410 tombstones rather than active migration logic.

## 4. Real activation status

The schema is broad, but real operating data is uneven. Exact row counts at audit time included:

| Module | Rows | Interpretation |
|---|---:|---|
| Automation tasks | 23 | Foundation is configured |
| Lead candidates | 26 | Buyer research has real test/working data |
| Gmail inbox items | 8 | Gmail ingestion has data |
| Social platform accounts | 4 | Platform connection records exist |
| B2B leads | 0 | CRM has not yet been populated with approved leads |
| Buyer profiles | 0 | Buyer 360 is not operationally activated |
| Website inquiries | 0 | No verified production inquiry in the table at audit time |
| Catalogue leads | 0 | Catalogue funnel not yet proven with a real lead |
| Chat messages | 0 | Website chat storage journey not yet proven with real messages |
| Email send log | 0 | Outbound workflow is not yet activated |
| Blog posts | 0 | Content/SEO publishing workflow is not activated |
| Media assets | 0 | Central approved media library is not activated |
| Production jobs | 0 | Production workflow exists but has no live order |
| Social posts | 0 | Social planning/publishing workflow is not activated |

This does not mean the modules are useless or broken. It means they require controlled user-acceptance testing and approved real data before they can be called complete.

## 5. Audit by perspective

### A. Viewer perspective

**What is strong**

- Clear premium B2B visual direction.
- Broad product catalogue and category hierarchy.
- Product discovery through category, compare and shortlist journeys.
- Multiple contact and conversion paths.
- Privacy, terms and consent-aware analytics surfaces.
- Mobile-oriented admin and public UI foundations.

**What remains**

- Complete page-by-page mobile acceptance on current production.
- Broken-link, image, form and download verification across every public route.
- Real factory, material, stitching, packaging and quality-control media.
- More useful buyer education through FAQs, guides and blog content.
- Accessibility verification: keyboard navigation, focus states, labels, contrast and reduced-motion behaviour.
- Clear empty, loading and failure states for every buyer action.

### B. Buyer / importer perspective

**What is strong**

- Request-a-quote model matches made-to-order manufacturing.
- Product, material, branding and customisation discussions can begin from multiple surfaces.
- Factory live video-call positioning is a useful trust mechanism.
- Custom Lab can now create an instant free non-binding front/back concept preview.
- Comparison and shortlist features help procurement review.

**What remains**

- Publish only verified certificates, export documents and factory evidence; do not use unsupported claims.
- Add real downloadable capability documents, material/specification sheets and packaging options.
- Add buyer-facing response expectations without making unverified guarantees.
- Prove inquiry, catalogue, chat, WhatsApp and email journeys end-to-end with controlled test records.
- Add genuine case studies/testimonials only after approval and evidence.
- Improve country/language landing content for priority markets.
- Configure a branded sender domain and production email authentication when DNS changes are approved.
- Connect the real WhatsApp Business production number and webhook after owner approval.

### C. Exporter / owner perspective

**What is strong**

- Owner-controlled database and role-protected admin.
- Comprehensive CRM, quotation, production, social, SEO and automation schema.
- Lead research is responding successfully in runtime logs.
- Buyer, commercial and production views are already represented in the admin architecture.
- Approval-rule concepts exist to prevent uncontrolled AI sending or publishing.

**What remains**

- Import approved buyer leads into the CRM and deduplicate before activation.
- Complete admin acceptance on iPhone and desktop for each navigation group.
- Test create, update, delete, export and recovery operations for products/categories/content.
- Activate the quotation/PI workflow with approved company, banking, Incoterm and pricing fields.
- Activate production with a test order before using it on a customer order.
- Build the approved media library and catalogue release process.
- Connect branded email, WhatsApp and social channels only with explicit owner approval.
- Keep outbound emails, WhatsApp messages, social publishing, pricing commitments and compliance claims behind owner approval.

### D. Developer perspective

**What is strong**

- Current-main Quality Gate was green at audit start.
- Production Supabase identity is held in an immutable owner runtime file and deliberately ignores Lovable-managed Supabase environment variables.
- Branch-first, atomic changes and production smoke checks are already used.
- RLS is widely enabled, and inspected security-definer admin functions include authenticated owner/admin guards.
- Migration functions are retired rather than left performing writes.

**What remains**

- Keep `docs/HANDOVER.md` synchronized; it is materially behind the current platform.
- Add a CI/runtime contract test for every public Edge Function used by the frontend.
- Add a specific smoke test for `generate-mockup` so a missing deployment cannot recur unnoticed.
- Validate all admin views on current main, not only compile/build success.
- Review legacy/backup schemas and advisor noise separately; do not apply blanket destructive cleanup.
- Add foreign-key indexes selectively based on real query paths rather than mass-adding unused indexes.
- Enable leaked-password protection in Supabase Auth dashboard settings.
- Retire temporary probe/test functions after they are no longer required.
- Keep rollback notes and production checkpoints for every migration or deployment.

## 6. Security and privacy findings

### Verified strengths

- Public tables inspected have RLS enabled.
- Admin/security-definer functions flagged by the advisor were inspected and contain `auth.uid()` plus admin/owner guard logic.
- Public functions use request validation, rate limiting or purpose-specific unauthenticated access where required.
- Public analytics tracking excludes `/admin` and `/auth` and runs only after analytics consent.
- One-time migration endpoints return HTTP 410 and no longer perform migration work.

### Follow-up items

- `backend_activation_checkpoints` has RLS enabled and no policies. This is closed by default rather than publicly exposed, but its intended access model should be documented.
- Supabase leaked-password protection is disabled and should be enabled in dashboard settings.
- Public webhook/callback functions must continue to use signatures, secrets or purpose-specific verification inside their code.
- Security advisor warnings must be resolved function-by-function. A blanket EXECUTE revoke could break protected admin RPCs and is not approved.

## 7. Performance findings

The performance advisor reports unused indexes and unindexed foreign keys, especially in recently added operational tables. Most affected modules currently have zero or low rows. The safe plan is:

1. Measure real slow queries and frequently used joins.
2. Add indexes in small batches.
3. verify write cost and query-plan improvement.
4. Remove genuinely redundant indexes only after confirming no production dependency.
5. Keep legacy/backup schema cleanup separate from active-schema optimization.

No mass index or schema deletion is approved from this audit alone.

## 8. Confirmed repair completed during this audit

### Custom Lab concept preview

**Problem:** `/studio` invoked `generate-mockup`, but no deployed Edge Function existed, producing a real 404 in runtime logs.

**Repair:**

- Replaced the paid Lovable AI gateway implementation with a free deterministic TypeScript/Deno PNG renderer.
- Generates valid 480×640 front and back concept images.
- Supports broad garment silhouettes, selected colour, pattern treatment and logo-placement marker.
- Includes request-size validation, rate limiting, security headers and honest non-binding messaging.
- Uses no paid image API and no Lovable AI gateway.
- Deployed directly to the owner Supabase project.
- Real smoke request returned HTTP 200, no timeout, and valid `data:image/png;base64` front/back images.

**Important limitation:** It is a concept renderer, not a photorealistic promise. Exact logo artwork, construction, materials and production feasibility still require factory review.

## 9. Prioritized completion plan

### P0 — Release integrity and buyer-critical journeys

- Merge and certify the Custom Lab fix.
- Add Edge Function contract/smoke coverage.
- Test every public route, CTA, form, download, shortlist, comparison and contact route.
- Verify public lead gateway with controlled test submissions and cleanup.
- Complete admin desktop and mobile acceptance.
- Confirm storage permissions and signed/public download behaviour.
- Keep Lovable untouched until the full green main is ready for one final update.

### P1 — Buyer trust and conversion activation

- Build and approve the real media library.
- Publish verified factory/process/specification content.
- Rebuild/approve downloadable catalogues from real selected assets.
- Activate FAQs, buyer guides and priority-market content.
- Configure branded email authentication when DNS access is approved.
- Connect production WhatsApp and social accounts with owner approval.
- Prove inquiry, catalogue, chat, email and WhatsApp journeys end-to-end.

### P2 — Sales and operations activation

- Import and deduplicate approved buyer leads.
- Activate Buyer 360, pipeline and follow-up workflow.
- Run a controlled quotation/PI test.
- Run a controlled sample/production/shipping test order.
- Activate listings, social calendar and measurement workflows.
- Add owner-approved operational dashboards and exception alerts.

### P3 — Optimization and controlled cleanup

- Index real high-value query paths.
- Update the handover and architecture documentation.
- Remove obsolete probes and stale code after dependency checks.
- Separate active, legacy and backup schema cleanup.
- Expand automated regression and release evidence.

## 10. Free-first operating rule

Use free and owner-controlled options wherever technically reliable:

- GitHub Actions for CI within available allowance.
- Owner Supabase project and its available quota.
- Deterministic local/server rendering for concept previews.
- Free-tier AI only as an optional enhancement with deterministic fallback.
- Open-source frontend and validation libraries.

No paid service, subscription, advertising spend, domain/DNS change or external commitment is authorized automatically.

## 11. Actions that always require owner approval

- Sending buyer emails or WhatsApp messages.
- Publishing social posts or directory listings.
- Confirming prices, MOQ, production time, delivery, discounts or payment terms.
- Publishing certificates, audit claims, customer names or testimonials.
- Changing DNS, domain email, billing or paid integrations.
- Deleting production data, buckets, schemas or customer records.
- Merging a change that has not passed required checks.

## 12. Release discipline

All remaining work should follow this sequence:

1. Preflight dependencies, permissions and current-main state.
2. Create a checkpoint and small dedicated branch.
3. Make one atomic change.
4. Run compile, type, lint, unit and targeted runtime checks.
5. Test failure and rollback paths.
6. Open a focused pull request with evidence.
7. Merge only when required checks are green.
8. Verify production after merge.
9. Keep a clear audit log.
10. Perform one final Lovable update only after the consolidated main branch is certified.

No workflow can guarantee zero failures. This process is designed to catch failures early, prevent data loss and provide a safe recovery path.
