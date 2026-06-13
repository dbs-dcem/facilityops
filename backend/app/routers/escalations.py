from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Notification, Run
from ..notifications import notify_escalation
from ..schemas import ResolveRequest, ResolveResponse, RunOut, SyncRequest, SyncResponse

router = APIRouter(prefix="/escalations", tags=["escalations"])


def _require_api_key(x_api_key: Optional[str] = Header(None)) -> None:
    if x_api_key != settings.device_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")


@router.post("/sync", response_model=SyncResponse)
def sync_escalations(
    req: SyncRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: None = Depends(_require_api_key),
):
    """
    Upsert escalated runs and ensure supervisor notifications are sent.
    Safe to call multiple times — notifications are sent only once per run.
    """
    synced = skipped = 0

    for run_in in req.runs:
        existing = db.query(Run).filter(Run.id == run_in.id).first()

        if not existing:
            existing = Run(
                id=run_in.id,
                procedure_id=run_in.procedureId,
                procedure_title=run_in.procedureTitle,
                completed_at=run_in.completedAt,
                duration_mins=run_in.durationMins,
                flagged_count=run_in.flaggedCount,
                tech_name=run_in.techName,
                escalated=True,
                log=[e.model_dump(mode="json") for e in run_in.log],
            )
            db.add(existing)
            db.commit()
            db.refresh(existing)
            synced += 1
        else:
            skipped += 1

        # Send notification if none has been attempted yet for this run
        already_notified = db.query(Notification).filter(
            Notification.run_id == existing.id,
            Notification.channel == "email",
        ).first()
        if not already_notified:
            background_tasks.add_task(notify_escalation, existing, db)

    return SyncResponse(synced=synced, skipped=skipped)


@router.get("", response_model=List[RunOut])
def list_escalations(
    resolved: Optional[bool] = None,
    db: Session = Depends(get_db),
    _: None = Depends(_require_api_key),
):
    q = db.query(Run).filter(Run.escalated == True)
    if resolved is not None:
        q = q.filter(Run.escalation_resolved == resolved)
    return q.order_by(Run.completed_at.desc()).all()


@router.get("/{run_id}", response_model=RunOut)
def get_escalation(
    run_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(_require_api_key),
):
    run = db.query(Run).filter(Run.id == run_id, Run.escalated == True).first()
    if not run:
        raise HTTPException(status_code=404, detail="Escalated run not found")
    return run


@router.patch("/{run_id}/resolve", response_model=ResolveResponse)
def resolve_escalation(
    run_id: str,
    req: ResolveRequest,
    db: Session = Depends(get_db),
    _: None = Depends(_require_api_key),
):
    """Mark an escalation as resolved by a supervisor."""
    run = db.query(Run).filter(Run.id == run_id, Run.escalated == True).first()
    if not run:
        raise HTTPException(status_code=404, detail="Escalated run not found")
    run.escalation_resolved = True
    run.escalation_resolved_by = req.resolved_by
    run.escalation_resolved_at = datetime.now(timezone.utc)
    run.escalation_notes = req.notes
    db.commit()
    return ResolveResponse(id=run_id, resolved=True)
