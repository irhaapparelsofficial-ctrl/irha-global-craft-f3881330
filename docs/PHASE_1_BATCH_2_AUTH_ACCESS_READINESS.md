# Phase 1.2 — Auth & Access Control Readiness

## Purpose

Make the private owner sign-in page reflect the real Supabase Auth configuration, keep unsupported providers hidden, validate the browser session against Supabase before trusting it, and harden the one-time owner admin bootstrap without applying any backend change yet.

## Frontend behavior

The Auth page now reads the official public Supabase Auth settings endpoint before showing a sign-in method.

- Password sign-in appears only when the Auth server reports the email provider enabled.
- Magic-link and password-recovery controls require both the email provider and the public `emailDeliveryVerified` release gate.
- Google sign-in requires both the Auth server provider setting and the public `googleOAuthVerified` release gate.
- Both release gates remain `false` until a controlled owner test produces exact evidence.
- When settings cannot be read, sign-in controls remain disabled and the owner can retry the read-only check.
- Known backend errors are converted into safe owner-facing messages instead of displaying raw provider responses.
- Redirects are same-origin and HTTPS-only, except localhost development.
- Recovery mode is recognized from the query string or Supabase recovery fragment.

## Session and authorization behavior

- The browser session is revalidated with Supabase Auth before the database role is queried.
- Old asynchronous role checks cannot overwrite a newer sign-in/sign-out state.
- Authentication and admin authorization remain separate.
- `/admin` access still requires a real row in `public.user_roles` with `role = admin`.
- Missing or denied role checks do not weaken Row Level Security.

## Deferred backend migration

`20260714030000_owner_auth_access_hardening.sql` prepares:

- a security-definer `claim_owner_admin()` function;
- exact normalized owner-email enforcement;
- authenticated-session enforcement;
- prevention of claiming when a different admin already exists;
- restricted execute privileges;
- a non-secret `owner_auth_readiness()` evidence RPC.

The migration is source only until the final one-time backend activation.

## Final activation sequence for Auth

1. Preserve or create the exact owner Auth user.
2. Enable the email provider.
3. Configure Site URL and approved redirects.
4. Verify password sign-in for the existing owner.
5. Verify one password-recovery email and newest-link recovery session.
6. Set `emailDeliveryVerified` to `true` only after exact delivery and recovery evidence.
7. Configure Google Client ID, Client Secret and callback only when Google is required.
8. Complete one controlled Google owner sign-in.
9. Set `googleOAuthVerified` to `true` only after the callback returns to the dashboard successfully.
10. Verify `public.user_roles` contains the same owner user with the admin role.
11. Verify a non-owner or non-admin session cannot enter `/admin` or read admin data.
12. Verify sign-out removes the local session.

## Not performed in this batch

- No Auth provider was enabled.
- No OAuth credential was configured.
- No password was set or stored.
- No recovery or magic-link email was sent.
- No user or role was created in a live database.
- No migration was applied.
- No website Publish was performed.
