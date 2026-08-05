alter table public.pinterest_oauth_bootstrap_tokens
  add column if not exists max_uses smallint not null default 1,
  add column if not exists use_count smallint not null default 0;

alter table public.pinterest_oauth_bootstrap_tokens
  drop constraint if exists pinterest_oauth_bootstrap_tokens_max_uses_check,
  drop constraint if exists pinterest_oauth_bootstrap_tokens_use_count_check;

alter table public.pinterest_oauth_bootstrap_tokens
  add constraint pinterest_oauth_bootstrap_tokens_max_uses_check check (max_uses between 1 and 3),
  add constraint pinterest_oauth_bootstrap_tokens_use_count_check check (use_count between 0 and max_uses);
