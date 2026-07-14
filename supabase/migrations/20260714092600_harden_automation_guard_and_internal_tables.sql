begin;

-- Trigger functions execute through PostgreSQL triggers and do not need client RPC access.
revoke all on function public.guard_automation_task_result_state() from public;
revoke all on function public.guard_automation_task_result_state() from anon;
revoke all on function public.guard_automation_task_result_state() from authenticated;
grant execute on function public.guard_automation_task_result_state() to service_role;

-- These tables hold repair/activation evidence for privileged maintenance only.
-- Keep them explicitly closed to browser roles while allowing service-role maintenance.
revoke all on table public.automation_task_repair_snapshots from anon, authenticated;
revoke all on table public.backend_activation_checkpoints from anon, authenticated;

drop policy if exists automation_task_repair_snapshots_deny_clients
  on public.automation_task_repair_snapshots;
create policy automation_task_repair_snapshots_deny_clients
  on public.automation_task_repair_snapshots
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists backend_activation_checkpoints_deny_clients
  on public.backend_activation_checkpoints;
create policy backend_activation_checkpoints_deny_clients
  on public.backend_activation_checkpoints
  for all
  to anon, authenticated
  using (false)
  with check (false);

commit;
