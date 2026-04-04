from datetime import datetime, date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.firebase import db
from app.models import (
    USERS, USER_ANALYTICS, USER_BADGES, WEAK_TOPICS,
    DAILY_CHALLENGES, USER_NOTES, SESSIONS,
    default_badge, default_note, default_challenge,
)

router = APIRouter(prefix="/gamification", tags=["gamification"])


BADGE_DEFINITIONS = [
    {"id": "first_session",   "name": "First Steps",      "type": "milestone", "description": "Complete your first learning session"},
    {"id": "streak_3",        "name": "On a Roll",         "type": "streak",    "description": "Maintain a 3-day learning streak"},
    {"id": "streak_7",        "name": "Week Warrior",      "type": "streak",    "description": "Maintain a 7-day learning streak"},
    {"id": "streak_30",       "name": "Monthly Master",    "type": "streak",    "description": "Maintain a 30-day learning streak"},
    {"id": "sessions_5",      "name": "Getting Started",   "type": "progress",  "description": "Complete 5 learning sessions"},
    {"id": "sessions_25",     "name": "Dedicated Learner", "type": "progress",  "description": "Complete 25 learning sessions"},
    {"id": "perfect_quiz",    "name": "Perfectionist",     "type": "quiz",      "description": "Score 100% on a quiz"},
    {"id": "level_5",         "name": "Rising Star",       "type": "level",     "description": "Reach level 5"},
    {"id": "level_10",        "name": "Knowledge Seeker",  "type": "level",     "description": "Reach level 10"},
]

CHALLENGE_POOL = [
    "Complete one full checkpoint today",
    "Score 80%+ on any quiz",
    "Start a brand-new topic session",
    "Review a weak topic you haven't touched in 3 days",
    "Complete two checkpoints back-to-back",
]


def _get_user_doc(uid: str) -> dict:
    doc = db.collection(USERS).document(uid).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    data = doc.to_dict()
    data["id"] = uid
    return data


def _get_analytics(uid: str) -> dict:
    doc = db.collection(USER_ANALYTICS).document(uid).get()
    if doc.exists:
        return doc.to_dict()
    from app.models import default_analytics
    data = default_analytics(uid)
    db.collection(USER_ANALYTICS).document(uid).set(data)
    return data


@router.get("/stats")
def get_stats(current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    user = _get_user_doc(uid)
    a = _get_analytics(uid)
    badges = list(db.collection(USER_BADGES).where("user_id", "==", uid).stream())
    return {
        "xp":               user.get("xp", 0),
        "level":            user.get("level", 1),
        "tutor_mode":       user.get("tutor_mode", "supportive_buddy"),
        "total_sessions":   a.get("total_sessions", 0),
        "completed_sessions": a.get("completed_sessions", 0),
        "current_streak":   a.get("current_streak", 0),
        "longest_streak":   a.get("longest_streak", 0),
        "avg_score":        a.get("avg_score", 0.0),
        "badge_count":      len(badges),
    }


@router.get("/profile")
def get_profile(current_user=Depends(get_current_user)):
    return get_stats(current_user=current_user)



@router.get("/leaderboard")
def get_leaderboard(current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    docs = (
        db.collection(USERS)
        .order_by("xp", direction="DESCENDING")
        .limit(20)
        .stream()
    )
    return [
        {
            "rank":  i + 1,
            "name":  d.to_dict().get("name", ""),
            "xp":    d.to_dict().get("xp", 0),
            "level": d.to_dict().get("level", 1),
            "is_me": d.id == uid,
        }
        for i, d in enumerate(docs)
    ]



class TutorModeBody(BaseModel):
    tutor_mode: str


@router.patch("/tutor-mode")
def update_tutor_mode(body: TutorModeBody, current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    _get_user_doc(uid)  
    db.collection(USERS).document(uid).update({"tutor_mode": body.tutor_mode})
    return {"tutor_mode": body.tutor_mode}



@router.get("/badges")
def get_badges(current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    docs = list(db.collection(USER_BADGES).where("user_id", "==", uid).stream())
    return [
        {
            "id":          d.id,
            "badge_name":  d.to_dict().get("badge_name", ""),
            "badge_type":  d.to_dict().get("badge_type", ""),
            "description": d.to_dict().get("description", ""),
            "earned_at":   d.to_dict().get("earned_at"),
        }
        for d in docs
    ]


@router.get("/badge-definitions")
def get_badge_definitions():
    return BADGE_DEFINITIONS


@router.post("/badges/check")
def check_and_award_badges(current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    user = _get_user_doc(uid)
    a = _get_analytics(uid)

    existing_badges = {
        d.to_dict().get("badge_name")
        for d in db.collection(USER_BADGES).where("user_id", "==", uid).stream()
    }
    awarded = []

    def _award(badge_id: str):
        defn = next((b for b in BADGE_DEFINITIONS if b["id"] == badge_id), None)
        if defn and defn["name"] not in existing_badges:
            db.collection(USER_BADGES).add(
                default_badge(uid, defn["name"], defn["type"], defn["description"])
            )
            awarded.append(defn["name"])
            existing_badges.add(defn["name"])

    completed = a.get("completed_sessions", 0)
    streak = a.get("current_streak", 0)
    level = user.get("level", 1)

    if completed >= 1:  _award("first_session")
    if completed >= 5:  _award("sessions_5")
    if completed >= 25: _award("sessions_25")
    if streak >= 3:     _award("streak_3")
    if streak >= 7:     _award("streak_7")
    if streak >= 30:    _award("streak_30")
    if level >= 5:      _award("level_5")
    if level >= 10:     _award("level_10")

    return {"awarded": awarded}



@router.get("/weak-topics")
def get_weak_topics(current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    docs = (
        db.collection(WEAK_TOPICS)
        .where("user_id", "==", uid)
        .order_by("strength_score")
        .limit(10)
        .stream()
    )
    return [
        {
            "id":             d.id,
            "topic":          d.to_dict().get("topic", ""),
            "concept":        d.to_dict().get("concept", ""),
            "strength_score": d.to_dict().get("strength_score", 0.5),
            "last_practiced": d.to_dict().get("last_practiced"),
        }
        for d in docs
    ]



@router.get("/daily-challenge")
def get_daily_challenge(current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    today_str = date.today().isoformat()

    existing = list(
        db.collection(DAILY_CHALLENGES)
        .where("user_id", "==", uid)
        .where("date_key", "==", today_str)
        .limit(1)
        .stream()
    )

    if existing:
        doc = existing[0]
        data = doc.to_dict()
        data["id"] = doc.id
        return {
            "id":        data["id"],
            "task":      data.get("task", ""),
            "bonus_xp":  data.get("bonus_xp", 50),
            "completed": data.get("completed", False),
            "date":      data.get("date"),
        }

    idx = date.today().timetuple().tm_yday % len(CHALLENGE_POOL)
    data = default_challenge(uid, CHALLENGE_POOL[idx])
    data["date_key"] = today_str  # for easy daily lookup
    _, ref = db.collection(DAILY_CHALLENGES).add(data)
    return {
        "id":        ref.id,
        "task":      data["task"],
        "bonus_xp":  data["bonus_xp"],
        "completed": False,
        "date":      data["date"],
    }


@router.post("/daily-challenge/{challenge_id}/complete")
def complete_daily_challenge(
    challenge_id: str,
    current_user=Depends(get_current_user),
):
    uid = current_user["uid"]
    doc = db.collection(DAILY_CHALLENGES).document(challenge_id).get()
    if not doc.exists or doc.to_dict().get("user_id") != uid:
        raise HTTPException(status_code=404, detail="Challenge not found")

    data = doc.to_dict()
    if not data.get("completed"):
        bonus_xp = data.get("bonus_xp", 50)
        db.collection(DAILY_CHALLENGES).document(challenge_id).update({"completed": True})

        user_ref = db.collection(USERS).document(uid)
        user_data = user_ref.get().to_dict()
        user_ref.update({"xp": user_data.get("xp", 0) + bonus_xp})

    return {"completed": True, "bonus_xp": data.get("bonus_xp", 50)}


class NoteBody(BaseModel):
    session_id: str
    content: str


@router.post("/notes")
def create_note(body: NoteBody, current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    data = default_note(uid, body.session_id, body.content)
    _, ref = db.collection(USER_NOTES).add(data)
    return {"id": ref.id, "content": data["content"], "created_at": data["created_at"]}


@router.get("/notes/{session_id}")
def get_notes(session_id: str, current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    docs = (
        db.collection(USER_NOTES)
        .where("user_id", "==", uid)
        .where("session_id", "==", session_id)
        .order_by("created_at", direction="DESCENDING")
        .stream()
    )
    return [
        {"id": d.id, "content": d.to_dict().get("content", ""), "created_at": d.to_dict().get("created_at")}
        for d in docs
    ]


@router.post("/notes/{session_id}/generate")
def generate_smart_notes(session_id: str, current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    session_doc = db.collection(SESSIONS).document(session_id).get()
    if not session_doc.exists or session_doc.to_dict().get("user_id") != uid:
        raise HTTPException(status_code=404, detail="Session not found")

    topic = session_doc.to_dict().get("topic", "")
    summary = f"Smart notes for '{topic}' – generated summary placeholder."
    data = default_note(uid, session_id, summary)
    _, ref = db.collection(USER_NOTES).add(data)
    return {"id": ref.id, "content": data["content"], "created_at": data["created_at"]}