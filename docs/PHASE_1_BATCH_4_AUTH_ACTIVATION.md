# Phase 1.4 — Owner Auth Activation

Recorded: 2026-07-14

## Verified

- Production frontend remains locked to the owner Supabase runtime.
- The existing owner Auth user and database admin role are preserved.
- Supabase Auth logs show successful password sign-in, token refresh, and authenticated user verification for the existing owner account.
- Unauthorized account creation remains blocked.
- The browser Auth client now explicitly uses PKCE.

The earlier email-login-disabled message came from the previous or stale backend path, not the current owner runtime.

## Closed safety gates

- Email delivery remains hidden until a real recovery or magic-link email is received and tested by the owner.
- Google sign-in remains hidden until provider credentials and a complete OAuth round trip are verified.
- No password was changed, no Auth email was sent, no new user was created, and no website Publish was performed.

## Dashboard-only verification still required

- Authentication > URL Configuration: production site and auth redirect allow-list.
- Authentication > Providers > Email: signup closure, password policy, and leaked-password protection when supported by the plan.
- Authentication > SMTP Settings: production sender and real delivery test.
- Authentication > Providers > Google: keep disabled until fully configured and tested.