# Role-check hardening — 2026-07-13

## Finding

`public.has_role(user_id, role)` was intentionally used by many RLS policies and guarded admin RPCs, but an authenticated caller could query role membership for an arbitrary user UUID.

## Remediation

The function remains available to `authenticated` because RLS policies depend on it, but it is now self-scoped:

- authenticated callers may check only `auth.uid()`;
- a different user UUID returns `false`;
- unauthenticated callers return `false` and have no direct execute grant;
- `service_role` retains explicit-user checks for trusted backend work;
- the fixed search path and existing SECURITY DEFINER behavior remain unchanged.

## Live verification

Applied to owner Supabase project `pvzjiozismyxqrzmtfbi` as migration `20260713202138_harden_has_role_self_scope`.

Controlled owner-session simulation verified:

- owner self admin check: `true`;
- foreign UUID role probe: `false`;
- admin-protected CMS read remained available;
- one Auth user and one admin role remained preserved.

## Advisor interpretation

Supabase may continue to report a generic warning because `authenticated` can execute a SECURITY DEFINER function. That execute grant is required by the existing RLS architecture. The information-disclosure path is closed by the self-scope rule.

Other audited browser-admin SECURITY DEFINER RPCs retain explicit `auth.uid()` plus database admin-role guards. They were not blindly revoked because doing so would break legitimate Admin operations.

## Remaining hosted setting

Leaked-password protection is still reported disabled. It is a hosted Supabase Auth setting and is not changed by this database migration.
