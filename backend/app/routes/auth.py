from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.firebase import db
from app.models import USERS, USER_ANALYTICS, default_user, default_analytics

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterBody(BaseModel):
    email: str
    name: str
    password: str  


class UpdateMeBody(BaseModel):
    tutor_mode: Optional[str] = None
    name: Optional[str] = None


def _get_or_create(firebase_user: dict) -> dict:
    """
    Fetch or create a Firestore user document.
    Uses firebase_uid (== doc id) as the primary key.
    Returns the user dict with 'id' set to the document id.
    """
    uid = firebase_user["uid"]
    email = firebase_user.get("email", "")
    name = (
        firebase_user.get("name")
        or firebase_user.get("display_name")
        or ""
    )

    user_ref = db.collection(USERS).document(uid)
    doc = user_ref.get()

    if not doc.exists:
        data = default_user(uid, email, name)
        user_ref.set(data)

        db.collection(USER_ANALYTICS).document(uid).set(default_analytics(uid))

        data["id"] = uid
        return data

    data = doc.to_dict()
    data["id"] = uid
    return data


def _user_response(user: dict) -> dict:
    return {
        "id":         user["id"],
        "email":      user.get("email", ""),
        "name":       user.get("name", ""),
        "tutor_mode": user.get("tutor_mode", "supportive_buddy"),
        "xp":         user.get("xp", 0),
        "level":      user.get("level", 1),
        "created_at": user.get("created_at"),
    }


@router.post("/register", status_code=200)
def register(
    body: RegisterBody,
    firebase_user=Depends(get_current_user),
):
    user = _get_or_create(firebase_user)
    if body.name and body.name != "Learner":
        db.collection(USERS).document(user["id"]).update({"name": body.name})
        user["name"] = body.name
    return _user_response(user)


@router.get("/me")
def me(firebase_user=Depends(get_current_user)):
    """Auto-creates the Firestore record on first login (Google Sign-In)."""
    user = _get_or_create(firebase_user)
    return _user_response(user)


@router.patch("/me")
def update_me(body: UpdateMeBody, firebase_user=Depends(get_current_user)):
    user = _get_or_create(firebase_user)
    updates = {}
    if body.tutor_mode is not None:
        updates["tutor_mode"] = body.tutor_mode
    if body.name is not None:
        updates["name"] = body.name
    if updates:
        db.collection(USERS).document(user["id"]).update(updates)
        user.update(updates)
    return _user_response(user)


@router.post("/sync-user")
def sync_user(firebase_user=Depends(get_current_user)):
    """Backward-compat alias used by some older client code."""
    user = _get_or_create(firebase_user)
    return {
        "message":  "User synced successfully",
        "user_id":  user["id"],
        "email":    user.get("email", ""),
        "level":    user.get("level", 1),
        "xp":       user.get("xp", 0),
    }