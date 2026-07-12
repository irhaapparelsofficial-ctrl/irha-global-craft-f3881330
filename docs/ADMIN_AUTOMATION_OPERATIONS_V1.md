# Admin Automation Operations v1

Adds owner-controlled task review, approval, retry and cancellation for internal automation tasks.

Guardrails:
- Only authenticated admins may update tasks through existing RLS.
- External actions are never executed by these controls.
- Approve changes task status only; it does not send email, publish SEO, publish listings or post social content.
- Retry returns failed/blocked tasks to ready_for_review for manual processing.
- Cancel removes a task from the active queue without deleting audit history.
