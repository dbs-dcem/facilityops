from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import hash_password, verify_password, create_access_token
from ..database import get_db
from ..models import User
from ..schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username, User.is_active == True).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = create_access_token({"sub": user.username, "role": user.role})
    return TokenResponse(access_token=token)


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(req: LoginRequest, db: Session = Depends(get_db)):
    """Bootstrap endpoint — creates the first user. Disable in production after setup."""
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(
        username=req.username,
        email=f"{req.username}@facilityops.local",
        hashed_password=hash_password(req.password),
        role="admin",
    )
    db.add(user)
    db.commit()
    token = create_access_token({"sub": user.username, "role": user.role})
    return TokenResponse(access_token=token)
