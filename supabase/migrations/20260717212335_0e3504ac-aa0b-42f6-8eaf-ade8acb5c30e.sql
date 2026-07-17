-- PR #3 — Legacy route redirect registry.
-- Non-destructive. Idempotent.
begin;

create table if not exists public.legacy_route_redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null,
  to_path text not null,
  confidence text not null default 'review' check (confidence in ('auto','review')),
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_path <> to_path),
  check (from_path like '/%'),
  check (to_path like '/%'),
  unique (from_path)
);

grant select on public.legacy_route_redirects to anon;
grant select on public.legacy_route_redirects to authenticated;
grant all on public.legacy_route_redirects to service_role;

alter table public.legacy_route_redirects enable row level security;

drop policy if exists "legacy redirects readable when auto" on public.legacy_route_redirects;
create policy "legacy redirects readable when auto"
  on public.legacy_route_redirects
  for select
  to anon, authenticated
  using (confidence = 'auto');

drop policy if exists "admins manage legacy redirects" on public.legacy_route_redirects;
create policy "admins manage legacy redirects"
  on public.legacy_route_redirects
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create index if not exists legacy_route_redirects_confidence_idx
  on public.legacy_route_redirects (confidence, from_path);

create or replace function public.legacy_route_redirects_touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists legacy_route_redirects_touch on public.legacy_route_redirects;
create trigger legacy_route_redirects_touch
  before update on public.legacy_route_redirects
  for each row execute function public.legacy_route_redirects_touch_updated_at();

create or replace view public.admin_legacy_redirect_queue as
select id, from_path, to_path, reason, created_at, updated_at
from public.legacy_route_redirects
where confidence = 'review';

grant select on public.admin_legacy_redirect_queue to authenticated;
grant select on public.admin_legacy_redirect_queue to service_role;

comment on table public.legacy_route_redirects is
  'PR #3 legacy URL 301 registry. auto = live; review = pending owner promotion.';
comment on view public.admin_legacy_redirect_queue is
  'Uncertain legacy redirects awaiting admin promotion to confidence=auto.';

insert into public.legacy_route_redirects (from_path, to_path, confidence, reason) values
  ('/catalog', '/catalogue', 'auto', 'spelling alias'),
  ('/catalogs/master-catalogue-2026.pdf', '/catalogue', 'auto', 'retired PDF'),
  ('/privacy', '/privacy-policy', 'auto', 'canonical path'),
  ('/privacy/', '/privacy-policy', 'auto', 'trailing slash'),
  ('/terms', '/terms-of-service', 'auto', 'canonical path'),
  ('/terms/', '/terms-of-service', 'auto', 'trailing slash'),
  ('/terms-and-conditions', '/terms-of-service', 'auto', 'canonical path'),
  ('/buyer-trust-center', '/buyer-trust', 'auto', 'canonical path'),
  ('/buyer-trust-centre', '/buyer-trust', 'auto', 'canonical path'),
  ('/buyer-resources', '/resources', 'auto', 'canonical path'),
  ('/buyer-faq', '/faq', 'auto', 'canonical path'),
  ('/germany', '/markets/germany', 'auto', 'market landing'),
  ('/austria', '/markets/austria', 'auto', 'market landing'),
  ('/switzerland', '/markets/switzerland', 'auto', 'market landing'),
  ('/netherlands', '/markets/netherlands', 'auto', 'market landing'),
  ('/usa', '/markets/united-states', 'auto', 'market landing'),
  ('/united-states', '/markets/united-states', 'auto', 'market landing'),
  ('/uk', '/markets/united-kingdom', 'auto', 'market landing'),
  ('/united-kingdom', '/markets/united-kingdom', 'auto', 'market landing'),
  ('/canada', '/markets/canada', 'auto', 'market landing'),
  ('/australia', '/markets/australia', 'auto', 'market landing'),
  ('/new-zealand', '/markets/new-zealand', 'auto', 'market landing'),
  ('/sportswear-manufacturer-pakistan', '/products/sportswear', 'auto', 'legacy SEO alias'),
  ('/leatherwear-manufacturer-pakistan', '/products/premium-leather-apparel', 'auto', 'legacy SEO alias'),
  ('/lederhosen-manufacturer', '/products/bavarian-trachten-wear', 'auto', 'legacy SEO alias'),
  ('/trachten-manufacturer', '/products/bavarian-trachten-wear', 'auto', 'legacy SEO alias'),
  ('/streetwear-manufacturer-pakistan', '/products/streetwear-activewear', 'auto', 'legacy SEO alias'),
  ('/login', '/auth', 'auto', 'auth canonical'),
  ('/signin', '/auth', 'auto', 'auth canonical'),
  ('/sign-in', '/auth', 'auto', 'auth canonical'),
  ('/log-in', '/auth', 'auto', 'auth canonical'),
  ('/dashboard', '/admin', 'auto', 'admin entry'),
  ('/journal', '/blog', 'auto', 'canonical path')
on conflict (from_path) do nothing;

commit;