from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Run entries (individual audit-trail lines) ────────────────────────────────

class RunEntrySchema(BaseModel):
    stepId: str
    stepTitle: str
    kind: str           # ack | reading | photo | scan
    value: str
    flagged: bool
    ts: datetime
    photoRef: Optional[str] = None


# ── Runs ──────────────────────────────────────────────────────────────────────

class RunIn(BaseModel):
    id: str
    procedureId: str
    procedureTitle: str
    completedAt: datetime
    durationMins: int
    flaggedCount: int
    techName: Optional[str] = None
    escalated: bool = False
    log: List[RunEntrySchema]

class RunOut(BaseModel):
    id: str
    procedure_id: str
    procedure_title: str
    completed_at: datetime
    duration_mins: int
    flagged_count: int
    tech_name: Optional[str]
    escalated: bool
    escalation_resolved: bool
    escalation_resolved_by: Optional[str]
    escalation_resolved_at: Optional[datetime]
    escalation_notes: Optional[str]
    synced_at: datetime
    log: List[Any]

    model_config = {"from_attributes": True}


# ── Sync ──────────────────────────────────────────────────────────────────────

class SyncRequest(BaseModel):
    runs: List[RunIn]

class SyncResponse(BaseModel):
    synced: int
    skipped: int


# ── Escalation resolution ─────────────────────────────────────────────────────

class ResolveRequest(BaseModel):
    resolved_by: str
    notes: Optional[str] = None

class ResolveResponse(BaseModel):
    id: str
    resolved: bool


# ── Notifications ─────────────────────────────────────────────────────────────

class NotificationResult(BaseModel):
    channel: str
    status: str
    detail: str
