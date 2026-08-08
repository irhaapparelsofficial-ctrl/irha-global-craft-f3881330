create or replace function public.notification_normalize_outbound_payload(_payload jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  p jsonb := coalesce(_payload, '{}'::jsonb);
  k text;
  v text;
begin
  if coalesce(p->>'template', '') <> 'chatgpt_outbound' then
    return p;
  end if;

  foreach k in array array['text_body', 'body'] loop
    if p ? k and jsonb_typeof(p->k) = 'string' then
      v := p->>k;
      v := replace(v, chr(92) || 'r' || chr(92) || 'n', E'\n');
      v := replace(v, chr(92) || 'n', E'\n');
      v := replace(v, E'\r\n', E'\n');
      v := replace(v, E'\r', E'\n');
      v := regexp_replace(v, E'[ \t]+\n', E'\n', 'g');
      v := regexp_replace(v, E'\n{3,}', E'\n\n', 'g');
      v := btrim(v);
      p := jsonb_set(p, array[k], to_jsonb(v), false);
    end if;
  end loop;

  return p;
end;
$$;

create or replace function public.notification_normalize_outbound_payload_trigger()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.payload := public.notification_normalize_outbound_payload(new.payload);
  return new;
end;
$$;

drop trigger if exists notification_outbox_normalize_outbound_payload on public.notification_outbox;
create trigger notification_outbox_normalize_outbound_payload
before insert or update of payload on public.notification_outbox
for each row
execute function public.notification_normalize_outbound_payload_trigger();
