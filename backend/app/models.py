from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="technician")  # technician | operator | admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Run(Base):
    __tablename__ = "runs"

    id = Column(String, primary_key=True)          # device-generated composite id
    procedure_id = Column(String, index=True, nullable=False)
    procedure_title = Column(String, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=False)
    duration_mins = Column(Integer, nullable=False)
    flagged_count = Column(Integer, default=0)
    tech_name = Column(String)
    escalated = Column(Boolean, default=False, index=True)
    escalation_resolved = Column(Boolean, default=False)
    escalation_resolved_by = Column(String)
    escalation_resolved_at = Column(DateTime(timezone=True))
    escalation_notes = Column(Text)
    synced_at = Column(DateTime(timezone=True), server_default=func.now())
    log = Column(JSON, nullable=False)              # serialized RunEntry[]

    notifications = relationship("Notification", back_populates="run", cascade="all, delete-orphan")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String, ForeignKey("runs.id"), nullable=False)
    channel = Column(String, nullable=False)        # email | servicenow
    status = Column(String, nullable=False)         # sent | failed | skipped
    detail = Column(Text)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())

    run = relationship("Run", back_populates="notifications")
