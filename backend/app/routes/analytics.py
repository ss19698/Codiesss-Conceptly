from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.firebase import db
from app.models import SESSIONS, CHECKPOINTS, QUIZ_ATTEMPTS, USER_ANALYTICS

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _ensure_analytics(uid: str) -> dict:
    from app.models import default_analytics
    ref = db.collection(USER_ANALYTICS).document(uid)
    doc = ref.get()
    if not doc.exists:
        data = default_analytics(uid)
        ref.set(data)
        return data
    return doc.to_dict()


@router.get("/")
def get_analytics(current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    a = _ensure_analytics(uid)
    return {
        "total_sessions":      a.get("total_sessions", 0),
        "completed_sessions":  a.get("completed_sessions", 0),
        "total_checkpoints":   a.get("total_checkpoints", 0),
        "avg_score":           a.get("avg_score", 0.0),
        "current_streak":      a.get("current_streak", 0),
        "longest_streak":      a.get("longest_streak", 0),
    }


@router.get("/history")
def get_history(current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    docs = (
        db.collection(SESSIONS)
        .where("user_id", "==", uid)
        .order_by("created_at", direction="DESCENDING")
        .stream()
    )
    return [
        {
            "id":           d.id,
            "topic":        d.to_dict().get("topic", ""),
            "status":       d.to_dict().get("status", ""),
            "created_at":   d.to_dict().get("created_at"),
            "completed_at": d.to_dict().get("completed_at"),
            "xp_earned":    d.to_dict().get("xp_earned", 0),
        }
        for d in docs
    ]


@router.get("/sessions/{session_id}/details")
def get_session_details(session_id: str, current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    session_doc = db.collection(SESSIONS).document(session_id).get()
    if not session_doc.exists or session_doc.to_dict().get("user_id") != uid:
        return {"error": "Session not found"}

    cp_docs = list(
        db.collection(CHECKPOINTS).where("session_id", "==", session_id).stream()
    )

    checkpoint_details = []
    for cp_doc in cp_docs:
        cp = cp_doc.to_dict()
        attempts_docs = list(
            db.collection(QUIZ_ATTEMPTS)
            .where("checkpoint_id", "==", cp_doc.id)
            .stream()
        )
        checkpoint_details.append({
            "checkpoint": {**cp, "id": cp_doc.id},
            "attempts":   len(attempts_docs),
            "scores":     [a.to_dict().get("score", 0) for a in attempts_docs],
        })

    return {
        "session":     {**session_doc.to_dict(), "id": session_id},
        "checkpoints": checkpoint_details,
    }


@router.get("/progress")
def get_progress_stats(current_user=Depends(get_current_user)):
    uid = current_user["uid"]

    sessions_docs = list(db.collection(SESSIONS).where("user_id", "==", uid).stream())
    total_sessions = len(sessions_docs)
    completed_sessions = sum(
        1 for d in sessions_docs if d.to_dict().get("status") == "completed"
    )

    session_ids = [d.id for d in sessions_docs]

    total_checkpoints = 0
    completed_checkpoints = 0
    all_scores = []

    for sid in session_ids:
        cp_docs = list(
            db.collection(CHECKPOINTS).where("session_id", "==", sid).stream()
        )
        total_checkpoints += len(cp_docs)
        for cp_doc in cp_docs:
            cp = cp_doc.to_dict()
            if cp.get("status") == "completed":
                completed_checkpoints += 1
            attempt_docs = list(
                db.collection(QUIZ_ATTEMPTS)
                .where("checkpoint_id", "==", cp_doc.id)
                .stream()
            )
            all_scores.extend(a.to_dict().get("score", 0) for a in attempt_docs)

    avg_score = sum(all_scores) / len(all_scores) if all_scores else 0

    return {
        "total_sessions":        total_sessions,
        "completed_sessions":    completed_sessions,
        "total_checkpoints":     total_checkpoints,
        "completed_checkpoints": completed_checkpoints,
        "avg_score":             avg_score,
        "completion_rate":       (completed_checkpoints / total_checkpoints * 100) if total_checkpoints > 0 else 0,
    }