# Irha Apparels — Lovable-Free Operations

_Status: proposed production operating model. GitHub is the source of truth; Cloudflare Pages and owner Supabase are the runtime authorities._

## Objective

Irha Apparels must continue to build, test, publish and operate without buying or consuming Lovable agent credits.

Lovable may remain available as an optional visual editor, but it is not required for:

- source-code changes;
- pull-request review;
- TypeScript/tests/build validation;
- production website deployment;
- owner Supabase migrations;
- Supabase Edge Function deployment;
- release evidence or rollback.

## Production authority

| Layer | Authority | Lovable required? |
|---|---|---:|
| Source code | GitHub `main` | No |
| Quality checks | GitHub Actions `Quality Gate` | No |
| Frontend hosting | Cloudflare Pages | No |
| Custom domain | `irhaapparels.com` on Cloudflare | No |
| Database/Auth/Storage | owner Supabase `pvzjiozismyxqrzmtfbi` | No |
| Edge Functions | owner Supabase CLI release | No |
| Release audit | GitHub issue #375 and workflow logs | No |

## Frontend release flow

Workflow: `.github/workflows/cloudflare-pages-auto-production.yml`

1. A focused pull request is reviewed and merged into `main`.
2. `Quality Gate` runs on the exact `main` commit.
3. Only a successful **push** run from this repository is eligible.
4. The deployment workflow verifies that the successful SHA is still the exact current `main`; superseded runs are skipped.
5. The workflow repeats source lock, secret scan, migration-order check, TypeScript, tests, build, release identity and blocked-claim checks.
6. The exact build is uploaded directly to the Cloudflare Pages production branch.
7. Both `irha-apparels.pages.dev` and `irhaapparels.com` must serve the same source SHA and deterministic fingerprint.
8. The `www` redirect and private-route `X-Robots-Tag` are verified.
9. Success evidence is written to GitHub issue #375. A failed attempt never writes success evidence.

Result: no Lovable Update or Publish button is part of the release chain.

## Owner Supabase release flow

Workflow: `.github/workflows/supabase-owner-release.yml`

This workflow is deliberately manual because database migrations can permanently change production data.

Available scopes:

- `functions`: deploy repository Edge Functions using `supabase/config.toml` JWT settings;
- `database`: preview and then apply only pending timestamped migrations;
- `both`: migrations first, functions second.

Safety controls:

- can run only from exact current `main`;
- requires typed confirmation `APPLY_SUPABASE_RELEASE`;
- uses the GitHub `production` environment;
- serializes releases so two database pushes cannot overlap;
- locks the target to `pvzjiozismyxqrzmtfbi`;
- performs a migration dry run before applying;
- uses Supabase migration history so already-applied migrations are skipped;
- records success/failure evidence in issue #375.

### One-time GitHub secrets

Store these under **Repository Settings → Secrets and variables → Actions**. Never commit their values.

Frontend secrets already used by the existing Cloudflare workflow:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PROJECT_NAME`

Owner Supabase release secrets:

- `SUPABASE_ACCESS_TOKEN` — needed for Edge Function and Management API deployment;
- `SUPABASE_DB_PASSWORD` — required only for database migration scope.

The owner project ID is not secret and remains locked in `supabase/config.toml`.

## Normal development without Lovable

1. Create a GitHub branch from current `main`.
2. Make a small atomic change using ChatGPT/GitHub tools or a local editor.
3. Open a pull request.
4. Do not merge until `Quality Gate` is green.
5. Merge the pull request; frontend production deployment then runs automatically.
6. Run the guarded Supabase workflow only when migrations or Edge Functions changed.

## Rollback

Frontend rollback options:

- revert the faulty GitHub commit through a pull request; the green revert commit is deployed automatically;
- in an urgent incident, roll back the Cloudflare Pages deployment in Cloudflare, then create the GitHub revert so source and production return to parity.

Backend rollback:

- use a new forward migration whenever possible;
- never run remote `db reset`;
- restore from an owner Supabase backup only for a confirmed destructive incident;
- Edge Functions can be redeployed from a previously verified Git commit.

## WhatsApp decision

WhatsApp is **not required** for the Irha Apparels website or core B2B operation.

The following remain fully usable without WhatsApp:

- public Live Chat;
- Request a Quote and inquiry forms;
- catalogue and repeat-order requests;
- Buyer CRM and admin inbox;
- Gmail drafts, replies and meeting coordination;
- factory video-call scheduling.

### When WhatsApp is useful

A simple click-to-chat link is useful when a buyer wants to open WhatsApp manually. This does not require a WhatsApp Cloud API integration; it only needs an approved public business number and must not expose a private personal number unintentionally.

WhatsApp Cloud API is needed only for advanced automation such as:

- receiving buyer messages through a webhook inside the admin inbox;
- sending approved replies from the admin system;
- synchronizing message status and conversation history with CRM;
- approved template notifications;
- assigning conversations to a team.

### Current policy

Keep WhatsApp automation **optional and inactive** until all of the following exist:

- an owner-approved business number;
- verified Meta/WhatsApp Business access;
- required runtime secrets;
- a successful real webhook verification;
- owner-approved message and template rules.

Do not describe WhatsApp as active merely because `whatsapp-webhook` or `whatsapp-admin` source files exist. Until credentials and live evidence are present, website Live Chat + forms + Gmail are the official communication stack.
