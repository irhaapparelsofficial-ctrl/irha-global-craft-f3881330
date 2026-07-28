import json
from pathlib import Path

path = Path("supabase/repository-migrations.json")
manifest = json.loads(path.read_text())
entry = {
    "version": "20260728110000",
    "name": "durable_distributed_rate_limiting",
    "path": "supabase/migrations/20260728110000_durable_distributed_rate_limiting.sql",
    "git_blob_sha": "55bf5ee40bd638330436fe160e6c29c561dbf58e",
    "execution_mode": "transactional",
    "transactional_dry_run": True,
}
manifest["migrations"] = [item for item in manifest["migrations"] if item["version"] != entry["version"]]
manifest["migrations"].append(entry)
manifest["migrations"].sort(key=lambda item: item["version"])
path.write_text(json.dumps(manifest, separators=(",", ":"), ensure_ascii=False) + "\n")
print("registered", entry["version"])
