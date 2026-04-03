from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserAnalytics
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/sync-user")
def sync_user(
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    
    email = firebase_user["email"]
    uid = firebase_user["uid"]
    name = firebase_user.get("name", "")

    user = db.query(User).filter(User.firebase_uid == uid).first()

    if not user:
        user = User(
            firebase_uid=uid,
            email=email,
            name=name,
            tutor_mode="supportive_buddy",
            xp=0,
            level=1
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        analytics = UserAnalytics(user_id=user.id)
        db.add(analytics)
        db.commit()

    return {
        "message": "User synced",
        "user_id": user.id,
        "email": user.email
    }