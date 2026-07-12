# Automation Control Center QA

Run after deployment:

1. Verify `automation_settings`, `automation_runs`, `automation_tasks` exist with RLS enabled.
2. Confirm anon and non-admin authenticated access is denied.
3. Confirm admin can read/update settings and review tasks.
4. Run `select public.create_automation_planning_cycle('qa');` once.
5. Confirm one run and deduplicated tasks are created.
6. Run it again on the same local date and confirm no duplicate active tasks are created.
7. Confirm lead tasks do not import to `b2b_leads` automatically.
8. Confirm SEO tasks do not publish or remove `noindex`.
9. Confirm listing tasks change only internal workflow state.
10. Confirm social/reel tasks stay draft and include Canva handoff metadata.
11. Confirm no external email, social post, listing or commercial commitment is executed.
12. Remove/archive QA run/tasks after evidence is recorded.
