# Irha Apparels — Final One-Time Backend Activation Runbook

This runbook is the controlled release path for connecting the permanent backend, applying all deferred migrations, configuring integrations and publishing the website. It must be executed in small checkpoints. Never continue after a failed critical check.

## 0. Release authority

Only the owner may approve:

- the permanent Supabase project;
- production Auth-provider changes;
- database migration execution;
- backend secrets;
- Edge Function deployment;
- website Publish;
- external email, WhatsApp, social or payment tests.

Record the approved Git commit SHA and the selected Supabase project reference before starting.

## 1. Preflight — no writes

1. Confirm GitHub `main` is the intended source of truth.
2. Confirm the latest Quality Gate is green.
3. Run locally or in CI:
   - `npm run verify:deployment-source`
   - `npm run verify:secrets`
   - `npm run verify:migrations`
   - `npx tsc --noEmit`
   - `npm test -- --passWithNoTests`
   - `npm run build`
4. Confirm no service-role key, OAuth secret, password or private API token exists in frontend source.
5. Confirm production domains:
   - `https://irhaapparels.com`
   - `https://www.irhaapparels.com` redirects to the canonical apex domain.
6. Confirm the owner email and existing admin-role strategy.
7. Freeze unrelated database/schema changes for the activation window.

**Checkpoint A:** stop unless every item is verified.

## 2. Backup and rollback checkpoint

Before changing the permanent backend:

1. Export the current database schema.
2. Export all application tables and Auth metadata allowed by the platform.
3. Export storage bucket inventory and preserve private files.
4. Record active Auth providers, Site URL and redirect URLs.
5. Record deployed Edge Functions and their versions.
6. Record existing secret names without copying secret values into documents.
7. Record the last known-good website deployment/commit.
8. Verify that the backup can be located and that restore permissions exist.

Create a release checkpoint containing:

- timestamp;
- Git commit SHA;
- Supabase project reference;
- backup identifiers;
- current deployment identifier;
- owner approval.

**Checkpoint B:** do not migrate without a verified rollback checkpoint.

## 3. Permanent runtime identity

1. Select the permanent Supabase project once.
2. Confirm the project URL and browser-safe publishable key.
3. Update the immutable runtime source only when the selected project is final.
4. Never place a service-role key in frontend source or `VITE_` variables.
5. Re-run deployment-source and secret-safety checks.
6. Build and verify that the retired project reference is absent from deployable output.

**Checkpoint C:** stop on any project-ID mismatch.

## 4. Database migrations — atomic batches

1. List migration files in timestamp order.
2. Confirm every timestamp is unique.
3. Apply a small migration batch.
4. Validate the new tables, columns, constraints, RLS policies, views, triggers and RPCs.
5. Record the last successful migration timestamp.
6. Continue only after validation.
7. Never run a large blind one-shot migration when smaller checkpoints are possible.
8. Do not delete source data merely because a new model exists.
9. Preserve idempotency where supported.

Suggested checkpoints:

- CMS and website editor;
- catalog/product/category controls;
- CRM, Buyer 360 and commercial workflows;
- lead acquisition and outreach;
- social/content/analytics;
- production, QC, shipping and closeout;
- supporting audit, health and automation tables.

**Checkpoint D:** after every batch, run read-only health queries and compare record counts.

## 5. Authentication and authorization

1. Preserve the existing owner user where possible.
2. Confirm the owner email is verified.
3. Confirm `public.user_roles` contains the owner user with `role = admin`.
4. Enable only the required Auth providers.
5. For email/password:
   - enable email authentication;
   - use Supabase Auth for password storage;
   - never hardcode or log the password;
   - test recovery with a fresh link.
6. For Google:
   - configure a real OAuth Client ID and Client Secret;
   - configure the approved redirect URI;
   - keep the UI hidden/disabled until credentials are verified.
7. Configure Site URL and approved redirects for the production domains and required preview URL.
8. Verify authentication and admin authorization separately.
9. Verify a non-admin account cannot access `/admin` or admin data.
10. Verify sign-out removes the local session.

**Checkpoint E:** no Publish until owner login and role checks pass in preview.

## 6. Edge Functions and backend-only secrets

1. Deploy functions in dependency order.
2. Configure only required secret names.
3. Never copy secret values into GitHub, docs, screenshots or chat.
4. Run each function's health action.
5. Confirm health checks do not create leads, messages, posts, payments or files.
6. Keep schedulers and unattended workers disabled until manual tests pass.
7. For callbacks/webhooks, verify signatures or shared secrets.
8. Confirm retry locks and idempotency controls.

**Checkpoint F:** stop if any function reports an unknown identity, missing permission or unsafe write behavior.

## 7. Preview smoke tests — read-only first

Run in this order:

1. Public homepage, products, categories, blog, FAQ and trust pages.
2. Sitemap, robots and canonical host.
3. `/auth` page and owner session.
4. `/admin` authorization.
5. System Health Center.
6. CMS draft/preview without Publish.
7. Product/category reads.
8. CRM reads and search.
9. Media signed-URL read.
10. AI/service health without generation or external delivery.

**Checkpoint G:** resolve every critical read failure before controlled write tests.

## 8. Controlled write smoke tests

Use clearly labeled test records and remove/archive them only through supported workflows.

1. Submit one test inquiry.
2. Submit one test catalogue request.
3. Confirm each record appears once in CRM.
4. Create and update one internal CRM task.
5. Create one CMS draft; do not publish until reviewed.
6. Upload one private test evidence file and verify signed access.
7. Generate one internal AI draft with no external send.
8. Create one social draft with no publication.
9. Create one production test record with no supplier/buyer action.
10. Verify audit logs and exact result evidence.

External delivery tests require separate owner approval:

- one Gmail message to an owner-controlled address;
- one WhatsApp test to an owner-controlled number;
- one private/unlisted social test where platform support permits;
- no real buyer campaign, payment or shipment booking.

**Checkpoint H:** confirm idempotency and duplicate protection before enabling automation.

## 9. Publish

1. Confirm the exact Git commit to publish.
2. Confirm all critical preview checks passed.
3. Confirm the backup checkpoint is still available.
4. Publish once.
5. Record the production deployment identifier and time.
6. Run public-route, Auth, admin-role and lead-gateway checks immediately.
7. Do not enable schedulers until the production checks pass.

## 10. Post-publish monitoring

During the first verification window:

- monitor Auth failures;
- monitor Edge Function errors;
- monitor lead creation and duplicates;
- monitor email/social queues;
- monitor database/storage errors;
- monitor canonical/sitemap health;
- verify no secret appears in browser output;
- verify no false external-success state is recorded.

## 11. Rollback triggers

Rollback immediately when any of these occur:

- owner cannot authenticate or authorize;
- public forms lose data or create duplicates;
- wrong Supabase project is in the frontend build;
- RLS exposes private/admin data;
- migrations corrupt or remove required data;
- external sends/posts occur without approval;
- payment or shipment actions are triggered unexpectedly;
- severe production route/build failure.

## 12. Rollback procedure

1. Disable schedulers and externally writing functions.
2. Revert the website to the last verified deployment.
3. Stop further migration execution.
4. Restore database/storage only when required and only from the verified checkpoint.
5. Re-run owner Auth, admin-role, public-route and lead-gateway checks.
6. Record the exact failed step, error and evidence.
7. Fix in a new atomic branch and repeat from the appropriate checkpoint.

A release is complete only when production evidence confirms the real action. A queued task, draft, configuration screen or successful frontend toast is not proof of an external result.
