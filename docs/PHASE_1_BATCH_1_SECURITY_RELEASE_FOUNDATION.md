# Phase 1.1 — Security & Release Foundation

This batch prepares the repository for the final one-time backend activation and production publish without changing the live database, applying migrations, deploying secrets, or publishing the website.

## Scope

- Owner-auth flow and admin-route safety review.
- Runtime identity checks using the immutable Supabase runtime source.
- Read-only system-health checks that never create leads or external actions.
- Browser error boundary with recoverable, non-secret diagnostics.
- Build-time environment and secret-safety validation.
- Backup, rollback, migration and release runbooks.
- Production smoke-test checklist for forms, email, admin, content and automation modules.

## Activation boundary

Repository code and validation may be merged before the backend migration. The following remain deferred until the final owner-approved activation window:

1. choose and connect the permanent Supabase project;
2. create a full database and storage backup;
3. apply all migrations once, in timestamp order;
4. configure Auth providers and approved redirect URLs;
5. deploy Edge Functions;
6. configure backend-only secrets;
7. publish the website;
8. run non-destructive smoke tests first, then controlled write tests;
9. preserve a rollback checkpoint until all critical checks pass.

## Safety rules

- Never commit passwords, service-role keys, OAuth client secrets, refresh tokens, private API keys or SMTP credentials.
- Public publishable/anon keys may be present only where intentionally required by Supabase browser clients.
- Authentication does not grant admin access; the database admin-role check remains mandatory.
- Health checks must be read-only or use an invalid-action contract that cannot create records.
- External sends, social posts, payments, migrations and production publishing require explicit owner approval.
- A failed activation step must stop the run and preserve the previous working release.

## Rollback sequence

1. Stop further writes and scheduled workers.
2. Revert the website deployment to the last verified commit.
3. Disable newly deployed workers/functions that can write externally.
4. Restore the database/storage checkpoint only when rollback of schema/data is required.
5. Re-run auth, public-route, lead-gateway and admin-role checks.
6. Record the failed step and exact evidence before retrying.

## Not performed by this batch

- No Supabase project was connected or migrated.
- No migration was applied.
- No Auth provider was enabled.
- No secret was configured or exposed.
- No Edge Function was deployed.
- No website Publish was performed.
- No email, WhatsApp, social post, payment or buyer message was sent.
