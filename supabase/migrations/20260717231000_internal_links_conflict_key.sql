-- Supply the exact conflict key used by the draft SEO foundation.
-- Fail closed if historical duplicates would make deterministic upserts unsafe.

begin;

do $$
begin
  if exists (
    select 1
    from public.internal_links
    group by from_route, to_route, anchor_text, locale
    having count(*) > 1
  ) then
    raise exception 'internal_links contains duplicate route-anchor-locale rows; review is required before adding the deterministic conflict key';
  end if;
end
$$;

create unique index if not exists internal_links_route_anchor_locale_uidx
  on public.internal_links (from_route, to_route, anchor_text, locale);

comment on index public.internal_links_route_anchor_locale_uidx is
  'Deterministic key for idempotent internal-link SEO planning and ON CONFLICT upserts.';

commit;
