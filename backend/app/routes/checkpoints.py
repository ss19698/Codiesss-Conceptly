from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.firebase import db
from app.models import (
    USERS, CHECKPOINTS, QUIZ_ATTEMPTS, WEAK_TOPICS, USER_ANALYTICS,
    default_quiz_attempt, default_weak_topic,
)
from app.services import evaluator, feynman

router = APIRouter(prefix="/checkpoints", tags=["checkpoints"])


class QuizAnswer(BaseModel):
    answers: List[str]


@router.post("/{checkpoint_id}/submit")
def submit_quiz(
    checkpoint_id: str,
    quiz_answer: QuizAnswer,
    current_user=Depends(get_current_user),
):
    uid = current_user["uid"]

    cp_doc = db.collection(CHECKPOINTS).document(checkpoint_id).get()
    if not cp_doc.exists:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    cp = cp_doc.to_dict()
    if not cp.get("questions_cache"):
        raise HTTPException(status_code=400, detail="No questions available for this checkpoint")

    result = evaluator.evaluate_answers(cp["questions_cache"], quiz_answer.answers)

    attempt_number = cp.get("attempts", 0) + 1

    attempt_data = default_quiz_attempt(
        checkpoint_id=checkpoint_id,
        attempt_number=attempt_number,
        score=result["understanding_score"],
        correct_count=result["correct_count"],
        total_questions=result["total_questions"],
        answers=quiz_answer.answers,
        questions_used=cp["questions_cache"],
    )
    db.collection(QUIZ_ATTEMPTS).add(attempt_data)

    xp_earned = 0
    cp_updates = {"attempts": attempt_number}

    if result["passed"]:
        cp_updates.update({
            "status":              "completed",
            "understanding_score": result["understanding_score"],
            "completed_at":        datetime.utcnow().isoformat(),
            "xp_earned":           2,
        })
        xp_earned = 2

        user_ref = db.collection(USERS).document(uid)
        user_data = user_ref.get().to_dict()
        new_xp = user_data.get("xp", 0) + 2
        new_level = user_data.get("level", 1)
        if new_xp >= new_level * 100:
            new_level += 1
        user_ref.update({"xp": new_xp, "level": new_level})
    else:
        for weak_area in result.get("weak_areas", []):
            existing = list(
                db.collection(WEAK_TOPICS)
                .where("user_id", "==", uid)
                .where("topic", "==", cp.get("topic", ""))
                .where("concept", "==", weak_area[:100])
                .limit(1)
                .stream()
            )
            if existing:
                existing_ref = db.collection(WEAK_TOPICS).document(existing[0].id)
                current_score = existing[0].to_dict().get("strength_score", 0.5)
                existing_ref.update({
                    "strength_score": max(0, current_score - 0.1),
                    "last_practiced": datetime.utcnow().isoformat(),
                })
            else:
                db.collection(WEAK_TOPICS).add(
                    default_weak_topic(uid, cp.get("topic", ""), weak_area)
                )

    db.collection(CHECKPOINTS).document(checkpoint_id).update(cp_updates)

    analytics_ref = db.collection(USER_ANALYTICS).document(uid)
    analytics_doc = analytics_ref.get()
    if analytics_doc.exists:
        a = analytics_doc.to_dict()
        total = a.get("total_checkpoints", 0)
        avg = a.get("avg_score", 0.0)
        new_avg = ((avg * total) + result["understanding_score"]) / (total + 1) if total > 0 else result["understanding_score"]
        updates = {"avg_score": new_avg}
        if result["passed"]:
            updates["total_checkpoints"] = total + 1
        analytics_ref.update(updates)

    analytics_doc2 = db.collection(USER_ANALYTICS).document(uid).get()
    if analytics_doc2.exists:
        a2 = analytics_doc2.to_dict()
        today = datetime.utcnow().date()
        last_str = a2.get("last_study_date")
        last = datetime.fromisoformat(last_str).date() if last_str else None
        if last != today:
            streak = a2.get("current_streak", 0)
            new_streak = (streak + 1) if last == today - timedelta(days=1) else 1
            db.collection(USER_ANALYTICS).document(uid).update({
                "current_streak":  new_streak,
                "longest_streak":  max(a2.get("longest_streak", 0), new_streak),
                "last_study_date": datetime.utcnow().isoformat(),
            })

    return {
        "score":            result["understanding_score"],
        "correct_count":    result["correct_count"],
        "total_questions":  result["total_questions"],
        "detailed_results": result["detailed_results"],
        "passed":           result["passed"],
        "xp_earned":        xp_earned,
        "weak_areas":       result.get("weak_areas", []),
    }


@router.get("/{checkpoint_id}/feynman")
def get_feynman_explanation(
    checkpoint_id: str,
    attempt: int = 0,
    current_user=Depends(get_current_user),
):
    uid = current_user["uid"]

    cp_doc = db.collection(CHECKPOINTS).document(checkpoint_id).get()
    if not cp_doc.exists:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    cp = cp_doc.to_dict()

    weak_docs = list(
        db.collection(WEAK_TOPICS)
        .where("user_id", "==", uid)
        .where("topic", "==", cp.get("topic", ""))
        .order_by("strength_score")
        .limit(3)
        .stream()
    )
    weak_areas = (
        [d.to_dict().get("concept", "") for d in weak_docs]
        if weak_docs
        else cp.get("objectives", [])[:2]
    )

    user_doc = db.collection(USERS).document(uid).get()
    tutor_mode = user_doc.to_dict().get("tutor_mode", "supportive_buddy") if user_doc.exists else "supportive_buddy"

    checkpoint_data = {
        "id":           checkpoint_id,
        "topic":        cp.get("topic", ""),
        "objectives":   cp.get("objectives", []),
        "key_concepts": cp.get("key_concepts", []),
        "level":        cp.get("level", "intermediate"),
    }

    explanation = feynman.apply_feynman_teaching(
        checkpoint_data, weak_areas, attempt, tutor_mode
    )

    return {"explanation": explanation, "weak_areas": weak_areas}