# Supabase deployment parity serialization contract

Version: 2  
Execution: IA-SEC-E002  
Project: `pvzjiozismyxqrzmtfbi`

## Canonical bytes

1. Query only PostgreSQL catalogs, Supabase migration metadata, cron metadata, Storage bucket metadata, and the Edge Function control plane.
2. Exclude row data, Auth users, Storage objects, environment variables, Vault values, tokens, URLs containing credentials, and secret payloads.
3. Normalize identifiers as UTF-8 strings. Preserve case. Represent booleans as JSON booleans and absent values as `null`.
4. Sort object keys lexicographically. Sort arrays by their documented stable key:
   - schemas/relations/columns: schema, relation, ordinal position;
   - constraints/indexes/policies/triggers: schema, relation, object name;
   - function signatures: schema, function name, identity arguments;
   - migrations: numeric version string;
   - Edge Functions: function name;
   - cron jobs: numeric job ID;
   - Storage buckets: bucket ID/name.
5. Serialize machine-readable JSON without insignificant whitespace for checksums:
   `JSON.stringify(value, sortedKeys) + "\n"`.
6. Compute SHA-256 over UTF-8 bytes. Store hashes as lower-case hexadecimal.
7. A manifest checksum covers the object before the top-level `manifest_sha256` field is added.
8. Source hashes are supplied by the Supabase Edge Function control plane. They are not recomputed from reconstructed or reformatted source. Registry numeric version values are approved minimum floors: a higher live version is valid only when the exact approved source hash and `verify_jwt` contract still match.
9. Generated client types are produced only by the supported Supabase generator for project `pvzjiozismyxqrzmtfbi`, schema `public`. Private, Vault, migration archive, and legacy schemas are excluded.
10. Any intentional update must regenerate the manifest and ledger, run the parity verifier, and be reviewed in a focused pull request. Comparisons must not be weakened to accept drift.

## Security invariants

- No secret value may appear in committed parity evidence.
- A private schema must not gain `USAGE` for `anon` or `authenticated`.
- Every deployed Edge Function must have one F1–F6 classification.
- F3 sealed stubs must retain their approved source hash and disabled response.
- `notification-dispatcher` must remain at or above its approved minimum version floor with the exact approved source hash, custom mandatory authorization, and single-use scheduler tokens.
- Historical migrations are never fabricated.

Contract revision: `2`
