# Supabase cutover from mobile — exact steps and honest limitation

## Read this first (safety check)

This project runs on **Lovable Cloud**, which is a managed Supabase backend Lovable provisioned for you (`mlefxgyaqoisvdmoiapq`). There is **no in-product button** — mobile or desktop — that swaps a Lovable Cloud project's backend to a different, self-owned Supabase project (`pvzjiozismyxqrzmtfbi`). The Cloud UI only exposes: Database, Users, Files, Storage, Emails, Edge Functions, Secrets, and Advanced (Export data / instance size / Disconnect Cloud). It does not expose "Connect external Supabase project".

Disconnecting Lovable Cloud is **irreversible** and permanently deletes the current Cloud database, storage, and functions. Do not tap Disconnect expecting it to migrate you to `pvzjiozismyxqrzmtfbi` — it will not. It will wipe the current backend and leave the project with no backend at all.

## Mobile navigation to the only relevant screens

Open the project on mobile in the Lovable app / mobile web:

1. Switch to **Chat mode** (bottom toggle).
2. Tap the **`...`** (three dots) at the bottom-right of the screen.
3. Tap **Cloud**.
4. In the header dropdown at the top of the Cloud view, you can switch between: **Overview**, **Database**, **Users**, **Files**, **Storage**, **Emails**, **Edge Functions**, **Secrets**.
5. To reach the Disconnect / instance controls: header dropdown → **Overview** → scroll to **Advanced settings**. This is where **Disconnect** lives. **Do not tap it** for a cutover — see safety check above.

To confirm current backend identity before doing anything:
- Chat mode → `...` → **Cloud** → **Overview**. The project ref shown must be `mlefxgyaqoisvdmoiapq` (current) — this is what you'd be removing.

## Where the actual cutover has to happen

There is no supported Lovable UI path (mobile or desktop) to point a Lovable Cloud project at a self-owned Supabase project. To make `pvzjiozismyxqrzmtfbi` the runtime, one of the following has to happen — none of them are a tap-in-Cloud action:

1. **Keep Lovable Cloud, migrate data into it.** Export schema/data from `pvzjiozismyxqrzmtfbi` and re-apply migrations + data into the current Cloud project (`mlefxgyaqoisvdmoiapq`). No disconnect needed. This is the safe path if the goal is "one backend, owner-controlled data".
2. **Move off Lovable Cloud entirely.** This requires product support from Lovable — it is not a self-serve mobile action. Contact Lovable support and request a migration of this project's backend binding to your self-owned Supabase project ref `pvzjiozismyxqrzmtfbi`. Provide both refs and confirm you accept that the current Cloud data will be discarded.

## What I recommend you do from mobile right now

- Do **not** tap Chat → `...` → Cloud → Overview → Advanced → **Disconnect**. It will not connect `pvzjiozismyxqrzmtfbi` and it will destroy the current backend.
- Do **verify** the current ref: Chat → `...` → Cloud → Overview. Confirm it reads `mlefxgyaqoisvdmoiapq`.
- Do **export a backup** before any migration attempt: Chat → `...` → Cloud → Overview → **Advanced settings** → **Export data**. Wait for the "export ready" notification, then download from the same panel.
- Then reply here with which path you want (in-Cloud data migration, or support-assisted move to owner Supabase). I will produce the exact migration/runbook steps for that path — still without touching code or DB until you approve.

## Confirm before I proceed

Tell me one of:
- `keep-cloud` — I'll prepare a data/schema migration plan from `pvzjiozismyxqrzmtfbi` into the existing Cloud project.
- `move-off-cloud` — I'll draft the exact support request wording and the pre-cutover checklist.
- `just-verify` — I'll stop here; you only wanted to know where the buttons are.
