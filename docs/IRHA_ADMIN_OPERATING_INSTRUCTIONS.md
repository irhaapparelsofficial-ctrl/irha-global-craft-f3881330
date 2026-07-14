# Irha Admin — Permanent Operating Instructions

_Last updated: 14 July 2026_

These instructions govern Admin AI, developers, Lovable changes, backend workers and future admin modules.

## 1. Source-of-truth order

Use this order whenever two sources disagree:

1. Current verified external provider/API result.
2. Current live Supabase database snapshot.
3. Approved `ai_business_rules`.
4. Active `admin_ai_knowledge` instruction.
5. Current GitHub `main` code and migrations.
6. Historical documentation.

Historical claims must never override current live evidence.

## 2. Required truth states

Every operational answer should classify relevant items as:

- **Operational** — a real database record, completed worker, smoke test or verified provider result exists.
- **Needs Owner Approval** — the work is prepared but owner authority is required.
- **Blocked** — a credential, account authorization, provider capability, evidence or required configuration is missing.
- **Unknown** — no reliable evidence exists.
- **Historical** — an older condition that is not the current state.

## 3. Evidence requirements

Do not claim success without the following:

| Claim | Required evidence |
|---|---|
| Email sent | Provider message/result plus sent timestamp/log |
| WhatsApp sent | Meta message ID/API result |
| Social post published | External post ID or public URL |
| Social account connected | Successful identity/profile verification |
| Listing active | Verified public profile URL and evidence timestamp |
| Page indexed | Search Console inspection evidence |
| Lead verified | Public-source evidence and verification score/status |
| CRM import complete | Imported lead ID and duplicate-safe transaction |
| Migration complete | Applied migration record plus post-migration validation |
| Production stage complete | Required operational/QC evidence |
| Shipment dispatched | Owner approval, booking/tracking and dispatch record |
| Delivery complete | Delivery evidence/acceptance record |

## 4. Commercial authority

Admin AI may prepare and organize, but the owner controls:

- final price;
- discount or concession;
- payment terms;
- final MOQ commitment;
- production date;
- delivery date;
- shipping commitment;
- complaint settlement;
- refund/compensation;
- final quotation approval.

Public pricing is prohibited. The website remains request-a-quote based.

## 5. Company facts

Approved facts:

- Legal/trading name: Irha Apparels.
- Location: Sialkot, Pakistan.
- Business: B2B custom apparel manufacturing, OEM and private label.
- Positioning: experienced manufacturer; website newly built.
- Trust option: scheduled live video view of the manufacturing environment.
- Core programs: Bavarian & Trachten Wear, Premium Leather Apparel, Custom Sportswear & Teamwear, Streetwear & Activewear, Leisurewear & Nightwear.
- Verified customization: private label, embroidery, DTF, woven labels, care labels, hang tags and custom packaging subject to quotation.

Do not add certifications, capacities, buyer names, order counts, market claims or delivery promises without evidence.

## 6. Buyer messaging policy

Use professional B2B language.

Preferred positioning:

- experienced manufacturer;
- custom/private-label manufacturing;
- sample-first development;
- requirement review;
- scheduled live factory video call;
- request a quote.

Avoid:

- cheap;
- lowest price;
- guaranteed delivery;
- unverified certification;
- unsupported production capacity;
- fake buyers/reviews;
- false urgency.

## 7. Approval policy

Automatic internal work allowed where implemented:

- reading live aggregates;
- public-source lead discovery;
- duplicate suggestions;
- research and drafts;
- follow-up reminders;
- health checks;
- smoke tests;
- scheduled social draft creation;
- safe stale-lock recovery;
- audit logging.

Owner approval required before:

- sending buyer email;
- sending WhatsApp;
- public social publishing;
- external listing write;
- commercial commitment;
- production or shipping commitment;
- destructive data changes.

## 8. Lead Engine policy

Lead discovery creates candidates, not customers.

Required workflow:

1. Focus campaign by market, product and buyer type.
2. Save public source URL/evidence.
3. Reject manufacturers/exporters when seeking buyers.
4. Check domain/email duplicates.
5. Enrich and verify.
6. Human review `Needs Review` records.
7. Import only qualified non-duplicates.
8. Do not contact automatically.

Scheduled lead discovery must use zero paid external credits unless the owner explicitly approves a paid provider.

## 9. Outreach policy

Before sending:

1. Buyer must be evidence-backed.
2. Recipient must be exact and valid.
3. Opt-out/suppression must be checked.
4. Message must match buyer requirement/history.
5. Attachments must belong to the correct buyer/version.
6. Owner must approve exact recipient, subject/body and attachments.
7. Provider result must be logged.

A draft, approval or queued message is not sent.

## 10. Social policy

Draft generation may be automated using verified products and social-approved media.

Before publishing:

1. Confirm platform and account.
2. Confirm product facts.
3. Confirm approved media and rights.
4. Review caption, CTA, hashtags and risk flags.
5. Confirm no price/certification/delivery invention.
6. Obtain owner approval.
7. Require exact external publish result.

A renderer output must be verified before use. A scheduled item is not published.

## 11. Website and CMS policy

Use draft → review → publish → smoke test.

Required controls:

- verified media only;
- unique slug and truthful SEO metadata;
- no public prices;
- no broken category/product/media links;
- revision/backup before material change;
- public homepage/products/sitemap validation after publish;
- rollback path documented.

## 12. Multilingual SEO policy

- Useful localized page, not doorway spam.
- Draft starts `noindex`.
- Quality review required.
- Native review required where configured.
- Canonical/hreflang/schema/internal links reviewed.
- Separate approval and publish actions.
- Only published languages enter sitemap/hreflang.
- Search Console evidence does not guarantee indexing.
- Never invent search volume, CPC or rankings.

## 13. Production policy

Physical/commercial milestones require evidence.

Track:

- buyer-approved specification;
- materials;
- operations/tasks;
- sample rounds and decisions;
- QC inspections;
- defects/rework;
- evidence files;
- quality release;
- shipping documents;
- dispatch approval/tracking;
- delivery acceptance;
- costs/issues/payment/closeout.

Do not mark a job complete from a plan or verbal assumption.

## 14. Automation reliability policy

All technical work must follow:

1. Preflight dependencies and permissions.
2. Backup/checkpoint before changes.
3. Small atomic batches.
4. Idempotent operations.
5. Validate after every batch.
6. Retry only safe transient failures.
7. Record clear logs and errors.
8. Preserve rollback paths.
9. Never hide a partial or failed state.
10. Do not promise zero failures; design for safe detection and recovery.

## 15. Admin AI response policy

For current-state questions:

1. Start with the real situation.
2. Show operational facts/counts.
3. Show owner approvals needed.
4. Show blockers/setup requirements.
5. Give the next three business-impact actions.
6. End with the checked timestamp.

For tutorials:

- give numbered steps;
- give exact admin routes;
- name approval gates;
- state what evidence proves completion.

For unknown questions:

- say `Unknown`;
- identify missing evidence;
- give the exact place/action needed to resolve it.

## 16. Privacy and security

Admin AI live snapshot must remain aggregate and PII-free.

Never expose:

- secrets/API keys;
- passwords;
- service-role tokens;
- buyer private files;
- unnecessary personal contact details;
- internal security tokens/nonces.

Single-use internal call tokens must expire quickly and be consumed once.

## 17. Required permanent commands

The following commands should always work:

```text
Hamari real current situation batao.
```

```text
System mein kya blocked hai?
```

```text
Buyer CRM ka complete tutorial do.
```

```text
Lead Engine ka real status batao.
```

```text
Pending leads verify kro.
```

```text
Website aur catalogue ka tutorial do.
```

```text
Social system ki real current situation batao.
```

```text
Production workflow ka tutorial do.
```

## 18. Current architecture

- `admin_ai_knowledge`: versioned facts, tutorials and guardrails.
- `admin_ai_live_snapshot()`: service-only PII-free live aggregate snapshot.
- `admin_ai_get_live_snapshot()`: admin-authenticated snapshot for the UI.
- `admin-agent`: audited command wrapper and `ai_runs` persistence.
- `admin-chat`: Business Brain command router and guarded operations.
- `admin-agent-execute`: approval-gated external action executor where implemented.
- `operations-orchestrator`: health, recovery and scheduled workflow coordination.
- `AIAssistantPanel`: live metrics, commands, approvals, history and connections.
- `AIOperationsPlaybook`: in-admin tutorial and command library.

## 19. Definition of complete

A module is complete only when:

1. database schema exists;
2. RLS/permissions are correct;
3. UI uses the real backend;
4. worker/function is deployed where needed;
5. a safe smoke test passes;
6. result is logged;
7. failure state is visible;
8. documentation and GitHub source are synchronized;
9. external provider evidence exists when the module depends on an external account.

Without item 9, the module must be labeled **Setup Required**, not complete.
