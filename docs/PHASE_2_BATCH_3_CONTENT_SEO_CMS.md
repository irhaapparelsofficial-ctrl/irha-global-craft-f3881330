# Phase 2 / Batch 2.3 — Content & SEO CMS

## Delivery scope

This batch adds a real admin-controlled content system for:

- buyer journal/blog articles;
- buyer FAQ answers;
- route-level SEO title, description, canonical, Open Graph, JSON-LD and noindex overrides;
- route-specific internal links;
- content audit history and admin health counts.

## Public website behavior

- `/blog` lists published CMS articles only.
- `/blog/:slug` renders published article Markdown through a safe React renderer; raw HTML is never executed.
- `/faq` reads published FAQ records and retains the verified source FAQ as a fallback before backend activation.
- the shared SEO component checks for a published route override and otherwise preserves existing page metadata.
- published internal links render before the footer on their exact source route.
- every CMS reader handles a missing migration or unavailable database without blanking the public website.

## Admin behavior

Admin → **Content & SEO → Content Library** contains four CRUD workspaces:

1. Blog
2. FAQ
3. SEO Overrides
4. Internal Links

All records support private draft/published state. Editors validate route format, locale, content length, Markdown, URL protocols and JSON-LD before writes.

## Backend files prepared

- `20260713020000_content_seo_cms.sql`
  - tables and indexes;
  - RLS policies;
  - public read RPCs;
  - admin health RPC;
  - updated-at and audit triggers;
  - explicit function privilege restrictions.
- `20260713020100_content_cms_seed_and_privileges.sql`
  - explicit authenticated CRUD grants under RLS;
  - verified English FAQ seed;
  - uniqueness indexes.

## Activation policy

Per owner instruction, these migrations are **not applied during this development batch**. They remain versioned in GitHub and will be included in the single final database migration after all phases are complete.

## Safety rules

- No external Supabase project is contacted or modified.
- Draft records never appear publicly.
- Blog Markdown does not support raw HTML or unsafe URL protocols.
- SEO JSON-LD must parse as JSON before save.
- Internal links accept internal routes only.
- Existing page SEO and FAQ content remain available when CMS RPCs are missing.
