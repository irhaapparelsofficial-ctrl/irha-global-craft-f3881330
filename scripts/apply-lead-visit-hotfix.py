from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


panel = Path("src/components/admin/LeadReviewActivationPanel.tsx")
backend = Path("supabase/functions/lead-activation/index.ts")
test = Path("src/test/leadReviewActivation.test.ts")

replace_once(
    panel,
    'const VALIDATION_CHUNK = 50;\n',
    'const VALIDATION_CHUNK = 50;\nconst BAKU_UTC_OFFSET = "+04:00";\n',
)

replace_once(
    panel,
    '''  const scheduleVisit = async () => {\n    if (!visitLeadId || !visitAt) return toast({ title: "Buyer and meeting date are required", variant: "destructive" });\n    setBusy("visit");\n    const { data, error: invokeError } = await supabase.functions.invoke("lead-activation", { body: { action: "schedule_visit", lead_id: visitLeadId, meeting_at: new Date(visitAt).toISOString(), location: visitLocation, mode: visitMode, notes: visitNotes, priority: "high" } });\n''',
    '''  const scheduleVisit = async () => {\n    if (!visitLeadId || !visitAt) return toast({ title: "Buyer and meeting date are required", variant: "destructive" });\n    const meetingAt = bakuLocalToIso(visitAt);\n    if (!meetingAt) return toast({ title: "Enter a valid Baku meeting date and time", variant: "destructive" });\n    setBusy("visit");\n    const { data, error: invokeError } = await supabase.functions.invoke("lead-activation", { body: { action: "schedule_visit", lead_id: visitLeadId, meeting_at: meetingAt, location: visitLocation, mode: visitMode, notes: visitNotes, priority: "high" } });\n''',
)

replace_once(
    panel,
    'Creates a private CRM task and buyer-history entry only. It does not contact the company.',
    'Creates a private CRM task and buyer-history entry only. It does not contact the company. Enter the meeting date and time in Baku time (UTC+4).',
)

replace_once(
    panel,
    '<input type="datetime-local" value={visitAt} onChange={(event) => setVisitAt(event.target.value)} className="field" />',
    '<input type="datetime-local" value={visitAt} onChange={(event) => setVisitAt(event.target.value)} aria-label="Baku time (UTC+4)" title="Baku time (UTC+4)" className="field" />',
)

replace_once(
    panel,
    '''function editFrom(candidate: Candidate): CandidateEdit {''',
    '''function bakuLocalToIso(value: string) {\n  const local = value.trim();\n  if (!/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$/.test(local)) return null;\n  const parsed = Date.parse(`${local}:00${BAKU_UTC_OFFSET}`);\n  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;\n}\nfunction editFrom(candidate: Candidate): CandidateEdit {''',
)

replace_once(
    backend,
    '    assigned_to: "Daim Ali",\n',
    '',
)

replace_once(
    test,
    '''    expect(panel).toContain("Azerbaijan visit planner");\n    expect(panel).toContain("It does not contact the company");\n''',
    '''    expect(panel).toContain("Azerbaijan visit planner");\n    expect(panel).toContain("It does not contact the company");\n    expect(panel).toContain('const BAKU_UTC_OFFSET = "+04:00"');\n    expect(panel).toContain("bakuLocalToIso(visitAt)");\n    expect(panel).toContain("Baku time (UTC+4)");\n    expect(panel).not.toContain("new Date(visitAt).toISOString()");\n    expect(backend).not.toContain('assigned_to: "Daim Ali"');\n''',
)

# The patch runner is intentionally one-shot; do not leave maintenance machinery in main.
Path("scripts/apply-lead-visit-hotfix.py").unlink()
Path(".github/workflows/apply-lead-visit-hotfix.yml").unlink()
