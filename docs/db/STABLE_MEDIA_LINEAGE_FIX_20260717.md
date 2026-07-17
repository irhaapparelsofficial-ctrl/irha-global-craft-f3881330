# Stable media lineage migration fix

- Production asset identity is verified by immutable database UUIDs and SHA-256 checksum.
- Storage paths may change during safe object normalization and are not treated as immutable identity.
- Both reviewed records must remain active, verified, in the `site-media` bucket, have distinct non-empty object paths and preserve the reviewed live-reference state.
- No storage object or database row is deleted by this migration.
