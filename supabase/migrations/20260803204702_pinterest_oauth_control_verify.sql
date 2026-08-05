do $$
begin
  if to_regclass('public.pinterest_oauth_states') is null then raise exception 'missing pinterest_oauth_states'; end if;
  if to_regclass('public.pinterest_oauth_credentials') is null then raise exception 'missing pinterest_oauth_credentials'; end if;
  if to_regclass('public.pinterest_oauth_bootstrap_tokens') is null then raise exception 'missing pinterest_oauth_bootstrap_tokens'; end if;
end
$$;
