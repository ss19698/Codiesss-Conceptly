from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import User, UserAnalytics
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterBody(BaseModel):
    email: str
    name: str
    password: str          


class UpdateMeBody(BaseModel):
    tutor_mode: Optional[str] = None
    name: Optional[str] = None



def _get_or_create(firebase_user: dict, db: Session) -> User:
    uid   = firebase_user["uid"]
    email = firebase_user.get("email", "")
    name  = firebase_user.get("name") or firebase_user.get("display_name") or ""

    user = db.query(User).filter(User.firebase_uid == uid).first()
    if not user:
        user = User(
            firebase_uid=uid,
            email=email,
            name=name or "Learner",
            tutor_mode="supportive_buddy",
            xp=0,
            level=1,
        )
        db.add(user)
        db.flush()
        db.add(UserAnalytics(user_id=user.id))
        db.commit()
        db.refresh(user)

    return user



@router.post("/register", status_code=200)
def register(
    body: RegisterBody,
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_or_create(firebase_user, db)
    if body.name and body.name != "Learner":
        user.name = body.name
        db.commit()
        db.refresh(user)

    return _user_response(user)


@router.get("/me")
def me(
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Load the current user's profile. Auto-creates the record on first login
    so Google-only users (who skip /register) still work.
    """
    user = _get_or_create(firebase_user, db)
    return _user_response(user)


@router.patch("/me")
def update_me(
    body: UpdateMeBody,
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_or_create(firebase_user, db)
    if body.tutor_mode is not None:
        user.tutor_mode = body.tutor_mode
    if body.name is not None:
        user.name = body.name
    db.commit()
    db.refresh(user)
    return _user_response(user)


@router.post("/sync-user")
def sync_user(
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Backward-compat alias used by some older client code."""
    user = _get_or_create(firebase_user, db)
    return {
        "message": "User synced successfully",
        "user_id": user.id,
        "email": user.email,
        "level": user.level,
        "xp": user.xp,
    }



def _user_response(user: User) -> dict:
    return {
        "id":          user.id,
        "email":       user.email,
        "name":        user.name,
        "tutor_mode":  user.tutor_mode,
        "xp":          user.xp,
        "level":       user.level,
        "created_at":  user.created_at.isoformat() if user.created_at else None,
    }