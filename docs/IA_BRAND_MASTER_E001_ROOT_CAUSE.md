# Root cause

The brand defect was a source-of-truth error: PR #825 and subsequent runtime wiring treated the historical square icon lineage as the official owner crest. Internal tests could still pass because every derivative was consistently generated from the same wrong source.

IA-BRAND-MASTER-E001 corrects this by locking the owner-uploaded 1024×1024 PNG itself by SHA-256 and verifying every active derivative against that immutable master.
