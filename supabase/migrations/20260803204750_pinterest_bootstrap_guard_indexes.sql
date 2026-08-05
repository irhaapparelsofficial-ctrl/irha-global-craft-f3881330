create index if not exists pinterest_oauth_states_expires_idx on public.pinterest_oauth_states(expires_at);
create index if not exists pinterest_oauth_bootstrap_tokens_expires_idx on public.pinterest_oauth_bootstrap_tokens(expires_at);
