from pathlib import Path
import shutil
import subprocess
import tempfile

FILES = [
    "supabase/functions/generate-mockup/index.ts",
    "supabase/functions/live-chat/index.ts",
    "src/components/SiteVisitorTracker.tsx",
    "src/pages/Studio.tsx",
    "src/components/HumanLiveChatPro.tsx",
]

with tempfile.TemporaryDirectory() as directory:
    backup = Path(directory)
    for source_name in FILES:
        source = Path(source_name)
        target = backup / source_name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)

    result = subprocess.run(
        ["python3", "scripts/ci/ia-sec-e003-integrate.py"],
        text=True,
        capture_output=True,
        check=False,
    )

    if result.returncode != 0:
        for source_name in FILES:
            shutil.copy2(backup / source_name, Path(source_name))
        diagnostic = (result.stdout + result.stderr).strip() or "unknown transform failure"
        Path("IA_SEC_E003_TRANSFORM_ERROR.txt").write_text(diagnostic + "\n")
        print(diagnostic)
    else:
        print(result.stdout, end="")
