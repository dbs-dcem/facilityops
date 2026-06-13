from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import auth, escalations, runs

# Create all tables on startup (idempotent; Alembic handles migrations in production)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FacilityOps API",
    description="MOP runner + PM maintenance backend with escalation management",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(auth.router,        prefix=PREFIX)
app.include_router(runs.router,        prefix=PREFIX)
app.include_router(escalations.router, prefix=PREFIX)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "facilityops-api", "version": "1.0.0"}
