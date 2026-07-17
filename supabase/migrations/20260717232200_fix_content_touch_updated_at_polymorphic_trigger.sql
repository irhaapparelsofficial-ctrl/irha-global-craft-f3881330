-- Keep shared content updated_at handling schema-safe across tables.
-- Blog publication timestamps remain table-specific.

begin;

create or replace function public.content_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.blog_posts_set_published_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.is_published and new.published_at is null then
    new.published_at := now();
  end if;

  if not new.is_published then
    new.published_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_blog_posts_set_published_at on public.blog_posts;
create trigger trg_blog_posts_set_published_at
before insert or update of is_published, published_at
on public.blog_posts
for each row execute function public.blog_posts_set_published_at();

comment on function public.content_touch_updated_at() is
  'Generic content-table updated_at trigger. Table-specific fields must be handled by table-specific triggers.';
comment on function public.blog_posts_set_published_at() is
  'Maintains blog_posts.published_at only on the blog_posts table.';

commit;
