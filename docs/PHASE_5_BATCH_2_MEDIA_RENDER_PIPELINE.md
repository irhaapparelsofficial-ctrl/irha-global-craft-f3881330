# Phase 5.2 — Media Library and Verified Social Rendering

## Delivered

- Media Library technical verification fields: dimensions, duration, SHA-256 checksum and verification status.
- Owner-controlled social approval for verified active image/video assets only.
- Reel and carousel render manifests built from Media Library assets.
- Exactly five 2-second scenes for a 10-second 9:16 reel.
- Two to ten unique slides for a carousel.
- Controlled workflow: draft → owner review → queued → rendering → verified ready / failed.
- Admin renderer health status with truthful `Needs configuration` handling.
- Service-only queue claim, completion, failure and media verification functions.
- Renderer dispatch Edge Function with signed upload destinations.
- Callback Edge Function that downloads real outputs, recalculates SHA-256, registers Media Library assets and only then marks a job ready.
- Unit tests for render readiness, transitions and output evidence.

## Activation order

1. Apply `20260713170000_social_media_render_pipeline.sql`.
2. Apply `20260713170100_media_social_verification_guard.sql`.
3. Deploy `social-render-worker` with JWT verification enabled.
4. Deploy `social-render-callback` with JWT verification disabled; it authenticates with a dedicated shared callback secret.
5. Configure these Supabase Edge Function secrets:
   - `SOCIAL_RENDER_PROVIDER_URL`
   - `SOCIAL_RENDER_PROVIDER_KEY`
   - `SOCIAL_RENDER_CALLBACK_SECRET`
6. Confirm the provider supports the `irha.social-render.provider.v1` contract and uploads only to the signed `social-renders` destinations supplied by the worker.
7. Run worker health from Admin → Social Posts. Do not claim renderer readiness until database, provider and callback all show ready.

## Completion evidence

A reel is not shown as verified unless it has a real Media Library output asset, HTTPS URL, SHA-256 checksum, dimensions, video MIME type, positive file size and 9.5–10.5 second duration.

A carousel is not shown as verified unless every slide has a real Media Library asset, HTTPS URL, SHA-256 checksum, image MIME type, dimensions, positive file size and unique position.

## Safety

- No social post is published by this batch.
- No renderer secret is committed to GitHub.
- Browser users cannot mark technical verification fields as verified.
- Renderer callback output is re-downloaded and hashed before ready status.
- Failed or incomplete output remains failed/incomplete; it is never presented as rendered.
- Database migrations and Edge Function deployment remain explicit activation work and are not performed by merging the code alone.
