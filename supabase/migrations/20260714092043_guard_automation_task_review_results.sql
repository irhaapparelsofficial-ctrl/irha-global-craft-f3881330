begin;

create table if not exists public.automation_task_repair_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  repair_key text not null,
  task_id uuid not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (repair_key, task_id)
);

alter table public.automation_task_repair_snapshots enable row level security;

insert into public.automation_task_repair_snapshots (repair_key, task_id, snapshot)
select
  '2026-07-14-empty-review-result-guard',
  id,
  to_jsonb(t)
from public.automation_tasks t
where status in ('ready_for_review','approved','executed')
  and result = '{}'::jsonb
on conflict (repair_key, task_id) do nothing;

create or replace function public.guard_automation_task_result_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();

  if new.status in ('ready_for_review','approved','executed')
     and coalesce(new.result, '{}'::jsonb) = '{}'::jsonb then
    raise exception 'automation task % cannot enter status % without a saved result', new.id, new.status
      using errcode = '23514';
  end if;

  if new.status = 'approved'
     and (new.approved_by is null or new.approved_at is null) then
    raise exception 'approved automation task requires approved_by and approved_at'
      using errcode = '23514';
  end if;

  if new.status = 'executed' and new.executed_at is null then
    new.executed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists guard_automation_task_result_state_trigger on public.automation_tasks;
create trigger guard_automation_task_result_state_trigger
before insert or update on public.automation_tasks
for each row execute function public.guard_automation_task_result_state();

update public.automation_tasks
set status = 'draft',
    error = 'Reset from ready_for_review because no execution result was saved. Safe re-execution required.',
    updated_at = now()
where status in ('ready_for_review','approved','executed')
  and result = '{}'::jsonb;

commit;
