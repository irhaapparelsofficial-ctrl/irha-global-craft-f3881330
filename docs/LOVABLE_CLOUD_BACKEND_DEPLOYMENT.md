# Lovable Cloud backend deployment

## Scope

The active production backend remains the existing Lovable Cloud / Supabase project:

`mlefxgyaqoisvdmoiapq`

This workflow does **not** create, connect, or migrate to another Supabase project.

## Deployment workflow

`.github/workflows/deploy-lovable-cloud-backend.yml`

The workflow:

1. Verifies the repository `supabase/config.toml` targets the approved Lovable Cloud project ref.
2. Links Supabase CLI to that exact project.
3. Shows local/remote migration history.
4. Runs a migration dry-run.
5. Applies pending repository migrations.
6. Deploys `public-lead-gateway` with JWT verification disabled, matching `supabase/config.toml`.
7. Sends a non-destructive invalid-action request and requires HTTP 400 with `Unsupported action`.

It never creates a real buyer lead or uploads a real file during smoke testing.

## Required GitHub secrets

Configure these as repository or `production` environment secrets:

- `SUPABASE_ACCESS_TOKEN`
  - Supabase personal access token with access to the Lovable Cloud project.
  - Used by the CLI Management API for project and Edge Function operations.
- `SUPABASE_DB_PASSWORD`
  - Database password for project `mlefxgyaqoisvdmoiapq`.
  - Used only by Supabase CLI to inspect and apply migrations.

Never commit either value to the repository or share it in chat, screenshots, logs, or documentation.

## Trigger

The workflow runs automatically on `main` when any of these paths change:

- `supabase/migrations/**`
- `supabase/functions/**`
- `supabase/config.toml`
- the deployment workflow itself

It can also be run manually with `workflow_dispatch`.

## Expected production proof

A successful run proves:

- the exact Lovable Cloud project was targeted;
- pending migrations were accepted by the remote database;
- `public-lead-gateway` was deployed;
- the public endpoint responded with the expected function behavior.

Frontend publication remains a separate Lovable publish action.

## Failure behavior

The workflow stops before database or function changes when either credential is missing. It also stops on migration dry-run errors, migration failures, function deployment failures, or an unexpected smoke-test response.

The public website currently retains a database fallback for text-only inquiry and catalogue submissions. Secure signed file uploads require the Edge Function to be deployed successfully.
