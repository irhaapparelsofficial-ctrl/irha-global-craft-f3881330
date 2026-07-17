-- Reconcile the content trigger contract after the draft SEO seed exposed a
-- legacy polymorphic trigger body that referenced blog-only fields.
--
-- The generic trigger may touch updated_at only. Publication timestamps remain
-- a blog_posts-only concern, enforced by a table-specific trigger.

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

do $$
declare
  generic_definition text;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'blog_posts'
      and column_name = 'published_at'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'blog_posts'
      and column_name = 'is_published'
  ) then
    raise exception 'blog_posts publication columns are missing';
  end if;

  select pg_get_functiondef('public.content_touch_updated_at()'::regprocedure)
  into generic_definition;

  if position('published_at' in lower(generic_definition)) > 0
     or position('is_published' in lower(generic_definition)) > 0 then
    raise exception 'generic content updated_at trigger still references blog-only publication fields';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    where t.tgname = 'trg_blog_posts_set_published_at'
      and t.tgrelid = 'public.blog_posts'::regclass
      and t.tgfoid = 'public.blog_posts_set_published_at()'::regprocedure
      and not t.tgisinternal
  ) then
    raise exception 'blog_posts publication trigger is not installed';
  end if;

  if exists (
    select 1
    from pg_trigger t
    where t.tgfoid = 'public.blog_posts_set_published_at()'::regprocedure
      and t.tgrelid <> 'public.blog_posts'::regclass
      and not t.tgisinternal
  ) then
    raise exception 'blog_posts publication trigger function is attached to another table';
  end if;
end
$$;

commit;
