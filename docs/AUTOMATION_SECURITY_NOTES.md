# Automation Security Notes

- `public_submission_events` is intentionally inaccessible through the Data API; only the secured rate-limit function writes it.
- Queue helper RPCs are restricted to `service_role`.
- Automation tables are admin-only through `has_role(auth.uid(),'admin')` policies.
- Planning functions create internal tasks only.
- External connectors and public publication require separate verified delivery actions and explicit approvals.
