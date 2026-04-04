"""
models.py – Firestore document helpers.

Replaces SQLAlchemy ORM models. Firestore is schema-less so there are no
table definitions; this module provides:
  • Collection name constants
  • Helper functions for creating default document dicts
  • A lightweight counter helper (Firestore has no auto-increment PKs;
    we use Firebase UID as user id and Firestore-generated IDs elsewhere)
"""
from datetime import datetime

# ── Collection names ──────────────────────────────────────────────────────────

USERS            = "users"
SESSIONS         = "learning_sessions"
CHECKPOINTS      = "checkpoints"
QUIZ_ATTEMPTS    = "quiz_attempts"
USER_ANALYTICS   = "user_analytics"
USER_BADGES      = "user_badges"
WEAK_TOPICS      = "weak_topics"
DAILY_CHALLENGES = "daily_challenges"
USER_NOTES       = "user_notes"


# ── Default document factories ────────────────────────────────────────────────

def default_user(firebase_uid: str, email: str, name: str) -> dict:
    return {
        "firebase_uid": firebase_uid,
        "email": email,
        "name": name or "Learner",
        "tutor_mode": "supportive_buddy",
        "xp": 0,
        "level": 1,
        "created_at": datetime.utcnow().isoformat(),
    }


def default_analytics(user_id: str) -> dict:
    return {
        "user_id": user_id,
        "total_sessions": 0,
        "completed_sessions": 0,
        "total_checkpoints": 0,
        "avg_score": 0.0,
        "total_time_minutes": 0,
        "current_streak": 0,
        "longest_streak": 0,
        "last_study_date": None,
        "updated_at": datetime.utcnow().isoformat(),
    }


def default_session(user_id: str, topic: str, user_notes: str = "") -> dict:
    return {
        "user_id": user_id,
        "topic": topic,
        "user_notes": user_notes or "",
        "status": "in_progress",
        "xp_earned": 0,
        "created_at": datetime.utcnow().isoformat(),
        "completed_at": None,
    }


def default_checkpoint(session_id: str, idx: int, cp_data: dict) -> dict:
    return {
        "session_id": session_id,
        "checkpoint_index": idx,
        "topic": cp_data.get("topic", ""),
        "objectives": cp_data.get("objectives", []),
        "key_concepts": cp_data.get("key_concepts", []),
        "level": cp_data.get("level", "intermediate"),
        "status": "pending",
        "understanding_score": None,
        "attempts": 0,
        "completed_at": None,
        "xp_earned": 0,
        "context": None,
        "explanation": None,
        "content_generated": False,
        "questions_cache": None,
        "validation_score": None,
    }


def default_quiz_attempt(
    checkpoint_id: str,
    attempt_number: int,
    score: float,
    correct_count: int,
    total_questions: int,
    answers: list,
    questions_used: list,
) -> dict:
    return {
        "checkpoint_id": checkpoint_id,
        "attempt_number": attempt_number,
        "score": score,
        "correct_count": correct_count,
        "total_questions": total_questions,
        "answers": answers,
        "questions_used": questions_used,
        "attempted_at": datetime.utcnow().isoformat(),
    }


def default_weak_topic(user_id: str, topic: str, concept: str) -> dict:
    return {
        "user_id": user_id,
        "topic": topic,
        "concept": concept[:100],
        "strength_score": 0.5,
        "last_practiced": datetime.utcnow().isoformat(),
    }


def default_badge(user_id: str, name: str, badge_type: str, description: str) -> dict:
    return {
        "user_id": user_id,
        "badge_name": name,
        "badge_type": badge_type,
        "description": description,
        "earned_at": datetime.utcnow().isoformat(),
    }


def default_note(user_id: str, session_id: str, content: str) -> dict:
    return {
        "user_id": user_id,
        "session_id": session_id,
        "content": content,
        "created_at": datetime.utcnow().isoformat(),
    }


def default_challenge(user_id: str, task: str, bonus_xp: int = 50) -> dict:
    return {
        "user_id": user_id,
        "task": task,
        "bonus_xp": bonus_xp,
        "completed": False,
        "date": datetime.utcnow().isoformat(),
    }