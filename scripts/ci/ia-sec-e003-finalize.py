from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    if text.count(old) != 1:
        raise SystemExit(f"{path}: expected one exact match, found {text.count(old)}")
    target.write_text(text.replace(old, new, 1))


replace_once(
    "supabase/functions/_shared/durable-rate-limit.ts",
    '''  } else {
    subjectKind = "bootstrap";
    subjectMaterial = `bootstrap:${input.clientSessionId}`;
  }
''',
    '''  } else {
    subjectKind = "bootstrap";
    // The first request and the subsequently signed anonymous session consume
    // the same subject bucket, so token issuance cannot reset allowance.
    subjectMaterial = `session:${input.clientSessionId}`;
  }
''',
)

replace_once(
    "supabase/tests/ia-sec-e003-durable-rate-limit.sql",
    '''-- Expired windows reset rather than carrying stale request counts.
do $test$
declare
  v_now timestamptz := clock_timestamp();
  v_decision text;
begin
  select decision into v_decision
  from public.consume_edge_rate_limit(
    'test.ia-sec-e003', repeat('f', 64), repeat('4', 64), null, 1, v_now
  );
  if v_decision <> 'ALLOW' then raise exception 'expiry setup call failed'; end if;

  select decision into v_decision
  from public.consume_edge_rate_limit(
    'test.ia-sec-e003', repeat('f', 64), repeat('4', 64), null, 1, v_now + interval '301 seconds'
  );
''',
    '''-- Expired windows reset rather than carrying stale request counts.
do $test$
declare
  v_now timestamptz := clock_timestamp() - interval '301 seconds';
  v_decision text;
begin
  select decision into v_decision
  from public.consume_edge_rate_limit(
    'test.ia-sec-e003', repeat('f', 64), repeat('4', 64), null, 1, v_now
  );
  if v_decision <> 'ALLOW' then raise exception 'expiry setup call failed'; end if;

  select decision into v_decision
  from public.consume_edge_rate_limit(
    'test.ia-sec-e003', repeat('f', 64), repeat('4', 64), null, 1, clock_timestamp()
  );
''',
)

print("IA-SEC-E003 consistency corrections applied")
