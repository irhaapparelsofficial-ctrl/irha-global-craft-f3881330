create table if not exists public.operations_setting_events (
  id bigint generated always as identity primary key,
  setting_group text not null,
  setting_key text not null,
  old_value jsonb,
  new_value jsonb,
  changed_at timestamptz not null default now(),
  database_user text not null default current_user,
  txid bigint not null default txid_current()
);

alter table public.operations_setting_events enable row level security;
revoke all on public.operations_setting_events from public, anon, authenticated;

create or replace function public.audit_operations_switch_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'operations_control' then
    if old.social_drafts_enabled is distinct from new.social_drafts_enabled then
      insert into public.operations_setting_events(
        setting_group, setting_key, old_value, new_value
      ) values (
        'operations_control', 'social_drafts_enabled',
        to_jsonb(old.social_drafts_enabled), to_jsonb(new.social_drafts_enabled)
      );
    end if;

    if old.lead_discovery_enabled is distinct from new.lead_discovery_enabled then
      insert into public.operations_setting_events(
        setting_group, setting_key, old_value, new_value
      ) values (
        'operations_control', 'lead_discovery_enabled',
        to_jsonb(old.lead_discovery_enabled), to_jsonb(new.lead_discovery_enabled)
      );
    end if;

    if old.email_queue_enabled is distinct from new.email_queue_enabled then
      insert into public.operations_setting_events(
        setting_group, setting_key, old_value, new_value
      ) values (
        'operations_control', 'email_queue_enabled',
        to_jsonb(old.email_queue_enabled), to_jsonb(new.email_queue_enabled)
      );
    end if;
  elsif tg_table_name = 'automation_settings' then
    if old.social_enabled is distinct from new.social_enabled then
      insert into public.operations_setting_events(
        setting_group, setting_key, old_value, new_value
      ) values (
        'automation_settings', 'social_enabled',
        to_jsonb(old.social_enabled), to_jsonb(new.social_enabled)
      );
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.audit_operations_switch_changes()
  from public, anon, authenticated;

drop trigger if exists audit_operations_control_switches
  on public.operations_control;
create trigger audit_operations_control_switches
after update on public.operations_control
for each row execute function public.audit_operations_switch_changes();

drop trigger if exists audit_automation_settings_switches
  on public.automation_settings;
create trigger audit_automation_settings_switches
after update on public.automation_settings
for each row execute function public.audit_operations_switch_changes();

update public.automation_settings
set social_enabled = true,
    updated_at = now()
where id = 'default';

update public.operations_control
set social_drafts_enabled = true,
    updated_at = now(),
    last_error = null
where id = 'default';

comment on table public.operations_setting_events is
  'Service-only audit trail for critical operations and automation switch changes.';
