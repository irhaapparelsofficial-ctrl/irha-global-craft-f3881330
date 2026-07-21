-- Drive import control/state tables intentionally use RLS with no browser policy.
-- Make the service-role-only contract explicit and drift-resistant.

revoke all on table public.catalog_drive_files from public, anon, authenticated;
revoke all on table public.catalog_drive_folders from public, anon, authenticated;
revoke all on table public.catalog_drive_import_control from public, anon, authenticated;
revoke all on table public.catalog_drive_import_runs from public, anon, authenticated;

grant all on table public.catalog_drive_files to service_role;
grant all on table public.catalog_drive_folders to service_role;
grant all on table public.catalog_drive_import_control to service_role;
grant all on table public.catalog_drive_import_runs to service_role;

comment on table public.catalog_drive_files is 'Private service-role-only Drive import inventory; not exposed to browser clients.';
comment on table public.catalog_drive_folders is 'Private service-role-only Drive product folder registry; not exposed to browser clients.';
comment on table public.catalog_drive_import_control is 'Private service-role-only import lock and control state.';
comment on table public.catalog_drive_import_runs is 'Private service-role-only import execution history.';
