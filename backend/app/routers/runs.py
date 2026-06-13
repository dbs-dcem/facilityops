from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Run
from ..notifications import notify_escalation, notify_flagged_run
from ..schemas import RunOut, SyncRequest, SyncResponse

router = APIRouter(prefix="/runs", tags=["runs"])


def _require_api_key(x_api_key: Optional[str] = Header(None)) -> None:
    if x_api_key != settings.device_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")


@router.post("/sync", response_model=SyncResponse)
def sync_runs(
    req: SyncRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: None = Depends(_require_api_key),
):
    """
    Idempotent bulk upsert from the mobile device.
    Triggers background notifications for new escalations and flagged runs.
    """
    synced = skipped = 0

    for run_in in req.runs:
        if db.query(Run).filter(Run.id == run_in.id).first():
            skipped += 1
            continue

        run = Run(
            id=run_in.id,
            procedure_id=run_in.procedureId,
            procedure_title=run_in.procedureTitle,
            completed_at=run_in.completedAt,
            duration_mins=run_in.durationMins,
            flagged_count=run_in.flaggedCount,
            tech_name=run_in.techName,
            escalated=run_in.escalated,
            log=[e.model_dump(mode="json") for e in run_in.log],
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        synced += 1

        if run.escalated:
            background_tasks.add_task(notify_escalation, run, db)
        elif run.flagged_count > 0:
            background_tasks.add_task(notify_flagged_run, run, db)

    return SyncResponse(synced=synced, skipped=skipped)


@router.get("", response_model=List[RunOut])
def list_runs(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: None = Depends(_require_api_key),
):
    return db.query(Run).order_by(Run.completed_at.desc()).offset(offset).limit(limit).all()


@router.get("/{run_id}", response_model=RunOut)
def get_run(
    run_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(_require_api_key),
):
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run
