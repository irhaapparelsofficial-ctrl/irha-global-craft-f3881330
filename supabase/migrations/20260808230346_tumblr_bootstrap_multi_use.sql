begin;
alter table public.tumblr_oauth_bootstrap_tokens
  add column if not exists use_count integer not null default 0,
  add column if not exists max_uses integer not null default 1;
update public.tumblr_oauth_bootstrap_tokens set use_count = 1 where used_at is not null and use_count = 0;
alter table public.tumblr_oauth_bootstrap_tokens
  add constraint tumblr_oauth_bootstrap_tokens_max_uses_check check (max_uses >= 1 and max_uses <= 20),
  add constraint tumblr_oauth_bootstrap_tokens_use_count_check check (use_count >= 0 and use_count <= max_uses);
commit;
