"""
gamification.py  –  all routes the frontend calls under /gamification/

Frontend calls (from api.js):
  GET  /gamification/stats              ← getUserStats()
  GET  /gamification/badges             ← getBadges()
  GET  /gamification/weak-topics        ← getWeakTopics()
  GET  /gamification/daily-challenge    ← getDailyChallenge()
  POST /gamification/daily-challenge/{id}/complete
  GET  /gamification/leaderboard        ← getLeaderboard()
  GET  /gamification/profile            ← (kept from original)
  PATCH /gamification/tutor-mode        ← updateTutorMode()
  POST /gamification/notes
  GET  /gamification/notes/{session_id}
  POST /gamification/notes/{session_id}/generate
  GET  /gamification/badge-definitions
  POST /gamification/badges/check
"""

from datetime import datetime, date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (
    User, UserAnalytics, UserBadge, WeakTopic,
    DailyChallenge, UserNote, LearningSession,
)

router = APIRouter(prefix="/gamification", tags=["gamification"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _get_user(firebase_user: dict, db: Session) -> User:
    user = db.query(User).filter(User.firebase_uid == firebase_user["uid"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


BADGE_DEFINITIONS = [
    {"id": "first_session",   "name": "First Steps",     "type": "milestone", "description": "Complete your first learning session"},
    {"id": "streak_3",        "name": "On a Roll",        "type": "streak",    "description": "Maintain a 3-day learning streak"},
    {"id": "streak_7",        "name": "Week Warrior",     "type": "streak",    "description": "Maintain a 7-day learning streak"},
    {"id": "streak_30",       "name": "Monthly Master",   "type": "streak",    "description": "Maintain a 30-day learning streak"},
    {"id": "sessions_5",      "name": "Getting Started",  "type": "progress",  "description": "Complete 5 learning sessions"},
    {"id": "sessions_25",     "name": "Dedicated Learner","type": "progress",  "description": "Complete 25 learning sessions"},
    {"id": "perfect_quiz",    "name": "Perfectionist",    "type": "quiz",      "description": "Score 100% on a quiz"},
    {"id": "level_5",         "name": "Rising Star",      "type": "level",     "description": "Reach level 5"},
    {"id": "level_10",        "name": "Knowledge Seeker", "type": "level",     "description": "Reach level 10"},
]


# ── /stats  (frontend: getUserStats) ─────────────────────────────────────────

@router.get("/stats")
def get_stats(
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_user, db)
    analytics = db.query(UserAnalytics).filter(UserAnalytics.user_id == user.id).first()
    badges = db.query(UserBadge).filter(UserBadge.user_id == user.id).all()

    return {
        "xp":              user.xp,
        "level":           user.level,
        "tutor_mode":      user.tutor_mode,
        "total_sessions":  analytics.total_sessions if analytics else 0,
        "completed_sessions": analytics.completed_sessions if analytics else 0,
        "current_streak":  analytics.current_streak if analytics else 0,
        "longest_streak":  analytics.longest_streak if analytics else 0,
        "avg_score":       analytics.avg_score if analytics else 0.0,
        "badge_count":     len(badges),
    }


# ── /profile  (kept from original) ────────────────────────────────────────

@router.get("/profile")
def get_profile(
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_stats(firebase_user=firebase_user, db=db)


# ── /leaderboard  (frontend: getLeaderboard) ──────────────────────────────

@router.get("/leaderboard")
def get_leaderboard(
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    top_users = (
        db.query(User)
        .order_by(User.xp.desc())
        .limit(20)
        .all()
    )
    current_uid = firebase_user["uid"]
    return [
        {
            "rank":    i + 1,
            "name":    u.name,
            "xp":      u.xp,
            "level":   u.level,
            "is_me":   u.firebase_uid == current_uid,
        }
        for i, u in enumerate(top_users)
    ]


# ── /tutor-mode ────────────────────────────────────────────────────────────

class TutorModeBody(BaseModel):
    tutor_mode: str


@router.patch("/tutor-mode")
def update_tutor_mode(
    body: TutorModeBody,
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_user, db)
    user.tutor_mode = body.tutor_mode
    db.commit()
    return {"tutor_mode": user.tutor_mode}


# ── /badges ────────────────────────────────────────────────────────────────

@router.get("/badges")
def get_badges(
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_user, db)
    badges = db.query(UserBadge).filter(UserBadge.user_id == user.id).all()
    return [
        {
            "id":          b.id,
            "badge_name":  b.badge_name,
            "badge_type":  b.badge_type,
            "description": b.description,
            "earned_at":   b.earned_at.isoformat() if b.earned_at else None,
        }
        for b in badges
    ]


@router.get("/badge-definitions")
def get_badge_definitions():
    return BADGE_DEFINITIONS


@router.post("/badges/check")
def check_and_award_badges(
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Evaluate and award any newly-earned badges."""
    user = _get_user(firebase_user, db)
    analytics = db.query(UserAnalytics).filter(UserAnalytics.user_id == user.id).first()
    existing = {b.badge_name for b in db.query(UserBadge).filter(UserBadge.user_id == user.id).all()}
    awarded = []

    def _award(badge_id: str):
        defn = next((b for b in BADGE_DEFINITIONS if b["id"] == badge_id), None)
        if defn and defn["name"] not in existing:
            db.add(UserBadge(
                user_id=user.id,
                badge_name=defn["name"],
                badge_type=defn["type"],
                description=defn["description"],
            ))
            awarded.append(defn["name"])
            existing.add(defn["name"])

    if analytics:
        if analytics.completed_sessions >= 1:  _award("first_session")
        if analytics.completed_sessions >= 5:  _award("sessions_5")
        if analytics.completed_sessions >= 25: _award("sessions_25")
        if analytics.current_streak >= 3:      _award("streak_3")
        if analytics.current_streak >= 7:      _award("streak_7")
        if analytics.current_streak >= 30:     _award("streak_30")
    if user.level >= 5:  _award("level_5")
    if user.level >= 10: _award("level_10")

    if awarded:
        db.commit()

    return {"awarded": awarded}


# ── /weak-topics ────────────────────────────────────────────────────────────

@router.get("/weak-topics")
def get_weak_topics(
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_user, db)
    topics = (
        db.query(WeakTopic)
        .filter(WeakTopic.user_id == user.id)
        .order_by(WeakTopic.strength_score.asc())
        .limit(10)
        .all()
    )
    return [
        {
            "id":              t.id,
            "topic":           t.topic,
            "concept":         t.concept,
            "strength_score":  t.strength_score,
            "last_practiced":  t.last_practiced.isoformat() if t.last_practiced else None,
        }
        for t in topics
    ]


# ── /daily-challenge ────────────────────────────────────────────────────────

CHALLENGE_POOL = [
    "Complete one full checkpoint today",
    "Score 80%+ on any quiz",
    "Start a brand-new topic session",
    "Review a weak topic you haven't touched in 3 days",
    "Complete two checkpoints back-to-back",
]


@router.get("/daily-challenge")
def get_daily_challenge(
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_user, db)
    today_start = datetime.combine(date.today(), datetime.min.time())

    challenge = (
        db.query(DailyChallenge)
        .filter(DailyChallenge.user_id == user.id, DailyChallenge.date >= today_start)
        .first()
    )

    if not challenge:
        # deterministically pick a challenge based on day-of-year so it's consistent
        idx = date.today().timetuple().tm_yday % len(CHALLENGE_POOL)
        challenge = DailyChallenge(
            user_id=user.id,
            task=CHALLENGE_POOL[idx],
            bonus_xp=50,
            completed=False,
            date=datetime.utcnow(),
        )
        db.add(challenge)
        db.commit()
        db.refresh(challenge)

    return {
        "id":        challenge.id,
        "task":      challenge.task,
        "bonus_xp":  challenge.bonus_xp,
        "completed": challenge.completed,
        "date":      challenge.date.isoformat() if challenge.date else None,
    }


@router.post("/daily-challenge/{challenge_id}/complete")
def complete_daily_challenge(
    challenge_id: int,
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_user, db)
    challenge = db.query(DailyChallenge).filter(
        DailyChallenge.id == challenge_id,
        DailyChallenge.user_id == user.id,
    ).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if not challenge.completed:
        challenge.completed = True
        user.xp += challenge.bonus_xp
        db.commit()
    return {"completed": True, "bonus_xp": challenge.bonus_xp}


# ── /notes ──────────────────────────────────────────────────────────────────

class NoteBody(BaseModel):
    session_id: int
    content: str


@router.post("/notes")
def create_note(
    body: NoteBody,
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_user, db)
    note = UserNote(user_id=user.id, session_id=body.session_id, content=body.content)
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id, "content": note.content, "created_at": note.created_at.isoformat()}


@router.get("/notes/{session_id}")
def get_notes(
    session_id: int,
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(firebase_user, db)
    notes = (
        db.query(UserNote)
        .filter(UserNote.user_id == user.id, UserNote.session_id == session_id)
        .order_by(UserNote.created_at.desc())
        .all()
    )
    return [{"id": n.id, "content": n.content, "created_at": n.created_at.isoformat()} for n in notes]


@router.post("/notes/{session_id}/generate")
def generate_smart_notes(
    session_id: int,
    firebase_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stub – real implementation calls LLM to summarise the session."""
    user = _get_user(firebase_user, db)
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    summary = f"Smart notes for '{session.topic}' – generated summary placeholder."
    note = UserNote(user_id=user.id, session_id=session_id, content=summary)
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id, "content": note.content, "created_at": note.created_at.isoformat()}