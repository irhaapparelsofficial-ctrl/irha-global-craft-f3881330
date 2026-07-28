from pathlib import Path
import shutil
import subprocess
import tempfile

SOURCE_COMMIT = "ed2b330395afd81607ab69f51df5f19483a4381d"
SOURCE_PATH = "scripts/ci/ia-sec-e003-integrate.py"
FILES = [
    "supabase/functions/generate-mockup/index.ts",
    "supabase/functions/live-chat/index.ts",
    "src/components/SiteVisitorTracker.tsx",
    "src/pages/Studio.tsx",
    "src/components/HumanLiveChatPro.tsx",
]

script = subprocess.check_output(["git", "show", f"{SOURCE_COMMIT}:{SOURCE_PATH}"], text=True)

old_chat = '''replace(
    path,
    'const clientMessageId = cleanText(body.clientMessageId, 100) || null;\\n        await insertVisitorMessage(sessionId, message, clientMessageId);',
    'await insertVisitorMessage(sessionId, message, clientMessageId);',
    2,
)
'''
new_chat = '''replace(
    path,
    'const clientMessageId = cleanText(body.clientMessageId, 100) || null;\\n        await insertVisitorMessage(sessionId, message, clientMessageId);',
    'await insertVisitorMessage(sessionId, message, clientMessageId);',
)
replace(
    path,
    'const clientMessageId = cleanText(body.clientMessageId, 100) || null;\\n      await insertVisitorMessage(sessionId, message, clientMessageId);',
    'await insertVisitorMessage(sessionId, message, clientMessageId);',
)
'''
if script.count(old_chat) != 1:
    raise SystemExit("sealed chat indentation contract was not found")
script = script.replace(old_chat, new_chat)

old_response = """replace(
    path,
    '''  error?: string;
};
''',
    '''  error?: string;
  rateLimitToken?: string;
};
''',
    1,
)
"""
new_response = """replace(
    path,
    '''  presenceRecorded?: boolean;
  error?: string;
};
''',
    '''  presenceRecorded?: boolean;
  error?: string;
  rateLimitToken?: string;
};
''',
)
"""
if script.count(old_response) != 1:
    raise SystemExit("sealed ChatResponse contract was not found")
script = script.replace(old_response, new_response)

with tempfile.TemporaryDirectory() as directory:
    backup = Path(directory) / "backup"
    backup.mkdir()
    for source_name in FILES:
        source = Path(source_name)
        target = backup / source_name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)

    implementation = Path(directory) / "integrate.py"
    implementation.write_text(script)
    result = subprocess.run(["python3", str(implementation)], text=True, capture_output=True, check=False)

    if result.returncode != 0:
        for source_name in FILES:
            shutil.copy2(backup / source_name, Path(source_name))
        diagnostic = (result.stdout + result.stderr).strip() or "unknown transform failure"
        Path("IA_SEC_E003_TRANSFORM_ERROR.txt").write_text(diagnostic + "\n")
        print(diagnostic)
    else:
        Path("IA_SEC_E003_TRANSFORM_ERROR.txt").unlink(missing_ok=True)
        print(result.stdout, end="")
