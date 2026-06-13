"""
Notification dispatchers for escalation and flagged-run alerts.
Each function returns a list of result dicts; channels are silently skipped
when the required config vars are not set (zero-config deployment is valid).
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import TYPE_CHECKING

import httpx

from .config import settings

if TYPE_CHECKING:
    from sqlalchemy.orm import Session
    from .models import Run


def _send_email(subject: str, body: str) -> tuple[str, str]:
    """Return (status, detail). Status is 'sent' | 'failed' | 'skipped'."""
    required = [settings.smtp_host, settings.smtp_username, settings.smtp_password, settings.alert_email_to]
    if not all(required):
        return "skipped", "SMTP not configured"

    recipients = [r.strip() for r in settings.alert_email_to.split(",") if r.strip()]
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from or settings.smtp_username
    msg["To"] = ", ".join(recipients)
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(msg["From"], recipients, msg.as_string())
        return "sent", f"Delivered to {', '.join(recipients)}"
    except Exception as exc:
        return "failed", str(exc)


def _create_servicenow_incident(run: "Run") -> tuple[str, str]:
    """Return (status, detail)."""
    if not settings.servicenow_instance:
        return "skipped", "ServiceNow not configured"

    url = f"https://{settings.servicenow_instance}/api/now/table/incident"
    payload: dict = {
        "short_description": f"FacilityOps ESCALATION: {run.procedure_title}",
        "description": (
            f"Technician:  {run.tech_name or 'Unknown'}\n"
            f"Procedure:   {run.procedure_title}\n"
            f"Completed:   {run.completed_at.isoformat()}\n"
            f"Duration:    {run.duration_mins} min\n"
            f"Failed steps:{run.flagged_count}\n\n"
            "A hard checkpoint could not be confirmed. "
            "The PM interval was NOT reset — the task remains open."
        ),
        "urgency": "2",
        "impact": "2",
        "category": "facilities",
    }
    if settings.servicenow_assignment_group:
        payload["assignment_group"] = settings.servicenow_assignment_group

    try:
        resp = httpx.post(
            url,
            json=payload,
            auth=(settings.servicenow_username, settings.servicenow_password),
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            timeout=10.0,
        )
        resp.raise_for_status()
        sys_id = resp.json().get("result", {}).get("sys_id", "?")
        return "sent", f"Incident {sys_id} created"
    except Exception as exc:
        return "failed", str(exc)


def _record(db: "Session", run_id: str, channel: str, status: str, detail: str) -> dict:
    from .models import Notification
    n = Notification(run_id=run_id, channel=channel, status=status, detail=detail)
    db.add(n)
    db.commit()
    return {"channel": channel, "status": status, "detail": detail}


def notify_escalation(run: "Run", db: "Session") -> list[dict]:
    """Fire all configured notification channels for a hard-checkpoint escalation."""
    tech = run.tech_name or "Unknown technician"
    ts = run.completed_at.strftime("%Y-%m-%d %H:%M UTC")

    subject = f"⚑ ESCALATION — {run.procedure_title} ({tech})"
    body = (
        f"FACILITYOPS ESCALATION ALERT\n"
        f"{'=' * 40}\n\n"
        f"Procedure:    {run.procedure_title}\n"
        f"Technician:   {tech}\n"
        f"Date/Time:    {ts}\n"
        f"Duration:     {run.duration_mins} min\n"
        f"Failed steps: {run.flagged_count}\n\n"
        "A hard checkpoint could not be confirmed by the technician.\n"
        "The PM interval has NOT been reset — this task remains open.\n\n"
        "ACTION REQUIRED: Contact the technician, investigate the failure,\n"
        "and re-run the procedure once the issue is resolved."
    )

    results = [
        _record(db, run.id, "email",      *_send_email(subject, body)),
        _record(db, run.id, "servicenow", *_create_servicenow_incident(run)),
    ]
    return results


def notify_flagged_run(run: "Run", db: "Session") -> list[dict]:
    """Fire email alert for a completed run that had out-of-range readings."""
    tech = run.tech_name or "Unknown technician"
    ts = run.completed_at.strftime("%Y-%m-%d %H:%M UTC")

    subject = f"⚠ FacilityOps: {run.flagged_count} flagged reading(s) — {run.procedure_title}"
    body = (
        f"FACILITYOPS FLAG ALERT\n"
        f"{'=' * 40}\n\n"
        f"Procedure:   {run.procedure_title}\n"
        f"Technician:  {tech}\n"
        f"Date/Time:   {ts}\n"
        f"Flagged:     {run.flagged_count} out-of-range reading(s)\n\n"
        "The run completed but out-of-range sensor readings were recorded.\n"
        "Review the compliance report in FacilityOps and investigate if required."
    )

    return [_record(db, run.id, "email", *_send_email(subject, body))]
