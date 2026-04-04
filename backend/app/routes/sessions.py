from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.firebase import db
from app.models import (
    USERS, SESSIONS, CHECKPOINTS, USER_ANALYTICS, USER_NOTES,
    WEAK_TOPICS,
    default_session, default_checkpoint, default_note,
)
from app.services import checkpoint_generator, notes_generator, question_generator
from app.services.workflow import run_checkpoint_workflow

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _init_rag_for_session(session_id: str, user_notes: str) -> None:
    if not user_notes or not user_notes.strip():
        return
    try:
        from app.services.rag_service import initialise_session_rag
        active = initialise_session_rag(session_id, user_notes)
        if active:
            print(f"✅ RAG initialised for session {session_id}")
    except Exception as e:
        print(f"⚠️  RAG init failed (non-fatal): {e}")


def _get_session_or_404(session_id: str, user_id: str) -> dict:
    doc = db.collection(SESSIONS).document(session_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Session not found")
    data = doc.to_dict()
    data["id"] = session_id
    if data.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    return data


def _session_response(data: dict) -> dict:
    return {
        "id":           data["id"],
        "topic":        data.get("topic", ""),
        "status":       data.get("status", "in_progress"),
        "created_at":   data.get("created_at"),
        "completed_at": data.get("completed_at"),
        "xp_earned":    data.get("xp_earned", 0),
    }


def _checkpoint_response(doc_id: str, data: dict) -> dict:
    return {
        "id":                 doc_id,
        "checkpoint_index":   data.get("checkpoint_index", 0),
        "topic":              data.get("topic", ""),
        "objectives":         data.get("objectives", []),
        "key_concepts":       data.get("key_concepts", []),
        "level":              data.get("level", "intermediate"),
        "status":             data.get("status", "pending"),
        "understanding_score": data.get("understanding_score"),
        "attempts":           data.get("attempts", 0),
        "xp_earned":          data.get("xp_earned", 0),
    }


@router.post("/")
def create_session(
    topic: str,
    user_notes: Optional[str] = "",
    current_user=Depends(get_current_user),
):
    uid = current_user["uid"]
    data = default_session(uid, topic, user_notes)
    _, ref = db.collection(SESSIONS).add(data)
    session_id = ref.id
    data["id"] = session_id

    # bump total_sessions in analytics
    analytics_ref = db.collection(USER_ANALYTICS).document(uid)
    analytics_doc = analytics_ref.get()
    if analytics_doc.exists:
        analytics_ref.update({"total_sessions": analytics_doc.to_dict().get("total_sessions", 0) + 1})

    _init_rag_for_session(session_id, user_notes)

    print(f"✓ Created new session: {topic} (ID: {session_id})")
    return _session_response(data)


@router.post("/create")
def create_session_body(
    body: dict,
    current_user=Depends(get_current_user),
):
    """JSON-body alias so the frontend can POST {topic, user_notes}."""
    topic = body.get("topic", "")
    user_notes = body.get("user_notes", "")
    uid = current_user["uid"]
    data = default_session(uid, topic, user_notes)
    _, ref = db.collection(SESSIONS).add(data)
    session_id = ref.id
    data["id"] = session_id

    analytics_ref = db.collection(USER_ANALYTICS).document(uid)
    analytics_doc = analytics_ref.get()
    if analytics_doc.exists:
        analytics_ref.update({"total_sessions": analytics_doc.to_dict().get("total_sessions", 0) + 1})

    _init_rag_for_session(session_id, user_notes)
    print(f"✓ Created new session: {topic} (ID: {session_id})")
    return _session_response(data)


@router.get("/")
def get_sessions(current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    docs = (
        db.collection(SESSIONS)
        .where("user_id", "==", uid)
        .order_by("created_at", direction="DESCENDING")
        .stream()
    )
    return [_session_response({**d.to_dict(), "id": d.id}) for d in docs]


@router.get("/{session_id}")
def get_session(session_id: str, current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    session = _get_session_or_404(session_id, uid)
    _init_rag_for_session(session_id, session.get("user_notes", ""))
    return _session_response(session)


@router.post("/{session_id}/checkpoints")
def generate_checkpoints_route(
    session_id: str,
    current_user=Depends(get_current_user),
):
    uid = current_user["uid"]
    session = _get_session_or_404(session_id, uid)

    existing = (
        db.collection(CHECKPOINTS)
        .where("session_id", "==", session_id)
        .stream()
    )
    existing_list = [{**d.to_dict(), "id": d.id} for d in existing]
    if existing_list:
        print(f"⚠️ Checkpoints already exist for session {session_id}, returning existing")
        return {
            "checkpoints": [
                {
                    "id":                cp["id"],
                    "topic":             cp.get("topic", ""),
                    "objectives":        cp.get("objectives", []),
                    "key_concepts":      cp.get("key_concepts", []),
                    "level":             cp.get("level", "intermediate"),
                    "success_threshold": 0.7,
                }
                for cp in existing_list
            ]
        }

    # Get tutor_mode from user doc
    user_doc = db.collection(USERS).document(uid).get()
    tutor_mode = user_doc.to_dict().get("tutor_mode", "supportive_buddy") if user_doc.exists else "supportive_buddy"

    print(f"📚 Generating checkpoints for session {session_id}: {session['topic']}")

    _init_rag_for_session(session_id, session.get("user_notes", ""))
    question_generator.clear_question_history(session_id)

    checkpoints = checkpoint_generator.generate_checkpoints(
        topic=session["topic"],
        current_level="beginner",
        target_level="intermediate",
        purpose="general learning",
        tutor_mode=tutor_mode,
        session_id=session_id,
    )

    print(f"✓ Generated {len(checkpoints)} checkpoint definitions")

    created = []
    for idx, cp_data in enumerate(checkpoints):
        doc_data = default_checkpoint(session_id, idx, cp_data)
        _, ref = db.collection(CHECKPOINTS).add(doc_data)
        cp_data["id"] = ref.id
        created.append(cp_data)

    print(f"✓ Saved {len(created)} checkpoints to Firestore")
    return {"checkpoints": created}


@router.get("/{session_id}/checkpoints")
def get_checkpoints(session_id: str, current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    _get_session_or_404(session_id, uid)

    docs = (
        db.collection(CHECKPOINTS)
        .where("session_id", "==", session_id)
        .order_by("checkpoint_index")
        .stream()
    )
    return [_checkpoint_response(d.id, d.to_dict()) for d in docs]


@router.get("/{session_id}/checkpoints/{checkpoint_id}/content")
def get_checkpoint_content(
    session_id: str,
    checkpoint_id: str,
    current_user=Depends(get_current_user),
):
    uid = current_user["uid"]
    cp_doc = db.collection(CHECKPOINTS).document(checkpoint_id).get()
    if not cp_doc.exists or cp_doc.to_dict().get("session_id") != session_id:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    cp = cp_doc.to_dict()

    if cp.get("content_generated") and cp.get("context") and cp.get("explanation"):
        print(f"✓ Returning cached content for checkpoint {checkpoint_id}")
        return {
            "context":          cp["context"],
            "explanation":      cp["explanation"],
            "validation_score": cp.get("validation_score"),
        }

    print(f"📝 Generating content for checkpoint {checkpoint_id}: {cp['topic']}")

    session = _get_session_or_404(session_id, uid)
    _init_rag_for_session(session_id, session.get("user_notes", ""))

    user_doc = db.collection(USERS).document(uid).get()
    tutor_mode = user_doc.to_dict().get("tutor_mode", "supportive_buddy") if user_doc.exists else "supportive_buddy"

    checkpoint_data = {
        "id":           checkpoint_id,
        "topic":        cp["topic"],
        "objectives":   cp.get("objectives", []),
        "key_concepts": cp.get("key_concepts", []),
        "level":        cp.get("level", "intermediate"),
    }

    result = run_checkpoint_workflow(
        checkpoint=checkpoint_data,
        tutor_mode=tutor_mode,
        session_id=session_id,
    )

    db.collection(CHECKPOINTS).document(checkpoint_id).update({
        "context":          result["context"],
        "explanation":      result["explanation"],
        "validation_score": result["validation_score"],
        "content_generated": True,
    })

    print(f"✓ Content generated and cached for checkpoint {checkpoint_id}")
    return {
        "context":          result["context"],
        "explanation":      result["explanation"],
        "validation_score": result["validation_score"],
    }


@router.get("/{session_id}/checkpoints/{checkpoint_id}/questions")
def get_checkpoint_questions(
    session_id: str,
    checkpoint_id: str,
    current_user=Depends(get_current_user),
):
    uid = current_user["uid"]
    cp_doc = db.collection(CHECKPOINTS).document(checkpoint_id).get()
    if not cp_doc.exists or cp_doc.to_dict().get("session_id") != session_id:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    cp = cp_doc.to_dict()

    if cp.get("questions_cache"):
        print(f"✓ Returning cached questions for checkpoint {checkpoint_id}")
        return {"questions": cp["questions_cache"]}

    session = _get_session_or_404(session_id, uid)
    _init_rag_for_session(session_id, session.get("user_notes", ""))

    user_doc = db.collection(USERS).document(uid).get()
    tutor_mode = user_doc.to_dict().get("tutor_mode", "supportive_buddy") if user_doc.exists else "supportive_buddy"

    checkpoint_data = {
        "id":           checkpoint_id,
        "topic":        cp["topic"],
        "objectives":   cp.get("objectives", []),
        "key_concepts": cp.get("key_concepts", []),
        "level":        cp.get("level", "intermediate"),
    }

    if not cp.get("content_generated"):
        result = run_checkpoint_workflow(
            checkpoint=checkpoint_data,
            tutor_mode=tutor_mode,
            session_id=session_id,
        )
        db.collection(CHECKPOINTS).document(checkpoint_id).update({
            "context":           result["context"],
            "explanation":       result["explanation"],
            "validation_score":  result["validation_score"],
            "questions_cache":   result["questions"],
            "content_generated": True,
        })
        print(f"✓ Full content generated for checkpoint {checkpoint_id}")
        return {"questions": result["questions"]}

    questions = question_generator.generate_questions(
        checkpoint=checkpoint_data,
        context=cp.get("context", ""),
        level=cp.get("level", "intermediate"),
        tutor_mode=tutor_mode,
        session_id=session_id,
    )
    db.collection(CHECKPOINTS).document(checkpoint_id).update({"questions_cache": questions})
    print(f"✓ Questions generated and cached for checkpoint {checkpoint_id}")
    return {"questions": questions}


@router.post("/{session_id}/checkpoints/{checkpoint_id}/questions/retry")
def get_retry_questions(
    session_id: str,
    checkpoint_id: str,
    weak_areas: Optional[List[str]] = None,
    current_user=Depends(get_current_user),
):
    uid = current_user["uid"]
    cp_doc = db.collection(CHECKPOINTS).document(checkpoint_id).get()
    if not cp_doc.exists or cp_doc.to_dict().get("session_id") != session_id:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    cp = cp_doc.to_dict()

    user_doc = db.collection(USERS).document(uid).get()
    tutor_mode = user_doc.to_dict().get("tutor_mode", "supportive_buddy") if user_doc.exists else "supportive_buddy"

    checkpoint_data = {
        "id":           checkpoint_id,
        "topic":        cp["topic"],
        "objectives":   cp.get("objectives", []),
        "key_concepts": cp.get("key_concepts", []),
        "level":        cp.get("level", "intermediate"),
    }

    questions = question_generator.generate_questions(
        checkpoint=checkpoint_data,
        context=cp.get("context", ""),
        level=cp.get("level", "intermediate"),
        tutor_mode=tutor_mode,
        weak_areas=weak_areas or [],
        attempt_number=cp.get("attempts", 0),
        session_id=session_id,
    )

    db.collection(CHECKPOINTS).document(checkpoint_id).update({"questions_cache": questions})
    print(f"✓ Retry questions generated for checkpoint {checkpoint_id}")
    return {"questions": questions}


@router.post("/{session_id}/complete")
def complete_session(session_id: str, current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    session = _get_session_or_404(session_id, uid)

    checkpoints_docs = list(
        db.collection(CHECKPOINTS).where("session_id", "==", session_id).stream()
    )
    checkpoints = [d.to_dict() for d in checkpoints_docs]
    all_completed = all(cp.get("status") == "completed" for cp in checkpoints)

    if not all_completed:
        pending = sum(1 for cp in checkpoints if cp.get("status") != "completed")
        raise HTTPException(
            status_code=400,
            detail=f"Not all checkpoints completed. {pending} remaining.",
        )

    checkpoint_xp = sum(cp.get("xp_earned", 0) for cp in checkpoints)
    bonus_xp = 20
    total_xp = checkpoint_xp + bonus_xp

    db.collection(SESSIONS).document(session_id).update({
        "status":       "completed",
        "completed_at": datetime.utcnow().isoformat(),
        "xp_earned":    total_xp,
    })

    user_ref = db.collection(USERS).document(uid)
    user_data = user_ref.get().to_dict()
    new_xp = user_data.get("xp", 0) + total_xp
    new_level = user_data.get("level", 1)
    old_level = new_level
    while new_xp >= new_level * 100:
        new_level += 1
    user_ref.update({"xp": new_xp, "level": new_level})

    analytics_ref = db.collection(USER_ANALYTICS).document(uid)
    analytics_doc = analytics_ref.get()
    if analytics_doc.exists:
        analytics_ref.update({
            "completed_sessions": analytics_doc.to_dict().get("completed_sessions", 0) + 1
        })

    question_generator.clear_question_history(session_id)
    try:
        from app.services.rag_service import clear_session_embeddings
        clear_session_embeddings(session_id)
    except Exception:
        pass

    print(f"✓ Session {session_id} completed! Total XP: {total_xp}")
    return {
        "message":        "🎉 Congratulations! Session completed!",
        "checkpoint_xp":  checkpoint_xp,
        "bonus_xp":       bonus_xp,
        "total_xp_earned": total_xp,
        "new_level":      new_level,
        "level_up":       new_level > old_level,
    }


@router.get("/{session_id}/can-complete")
def can_complete_session(session_id: str, current_user=Depends(get_current_user)):
    uid = current_user["uid"]
    session = _get_session_or_404(session_id, uid)

    docs = list(db.collection(CHECKPOINTS).where("session_id", "==", session_id).stream())
    checkpoints = [d.to_dict() for d in docs]
    completed_count = sum(1 for cp in checkpoints if cp.get("status") == "completed")

    return {
        "can_complete":    completed_count == len(checkpoints),
        "completed_count": completed_count,
        "total_count":     len(checkpoints),
        "session_status":  session.get("status"),
    }


@router.post("/{session_id}/notes/generate")
def generate_session_notes(
    session_id: str,
    notes_type: str = "comprehensive",
    current_user=Depends(get_current_user),
):
    uid = current_user["uid"]
    session = _get_session_or_404(session_id, uid)

    docs = list(db.collection(CHECKPOINTS).where("session_id", "==", session_id).stream())
    checkpoint_data = [
        {
            "topic":        d.to_dict().get("topic", ""),
            "objectives":   d.to_dict().get("objectives", []),
            "key_concepts": d.to_dict().get("key_concepts", []),
            "level":        d.to_dict().get("level", "intermediate"),
        }
        for d in docs
    ]

    weak_docs = (
        db.collection(WEAK_TOPICS)
        .where("user_id", "==", uid)
        .order_by("strength_score")
        .limit(5)
        .stream()
    )
    weak_areas = [d.to_dict().get("concept", "") for d in weak_docs]

    if notes_type == "comprehensive":
        notes_content = notes_generator.generate_comprehensive_notes(
            session["topic"], checkpoint_data, weak_areas
        )
    elif notes_type == "cheatsheet":
        notes_content = notes_generator.generate_cheat_sheet(session["topic"], checkpoint_data)
    else:
        notes_content = notes_generator.generate_practice_questions(session["topic"], checkpoint_data)

    note_data = default_note(uid, session_id, notes_content)
    _, ref = db.collection(USER_NOTES).add(note_data)

    print(f"✓ Generated {notes_type} notes for session {session_id}")
    return {"note": {"id": ref.id, **note_data}, "content": notes_content}


@router.post("/{session_id}/notes/upload")
async def upload_session_notes(
    session_id: str,
    notes_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user=Depends(get_current_user),
):
    uid = current_user["uid"]
    session = _get_session_or_404(session_id, uid)

    extracted_text = ""

    if notes_text and notes_text.strip():
        extracted_text = notes_text.strip()
    elif file:
        raw_bytes = await file.read()
        content_type = file.content_type or ""

        if "pdf" in content_type or (file.filename or "").lower().endswith(".pdf"):
            try:
                import io
                import pdfplumber
                with pdfplumber.open(io.BytesIO(raw_bytes)) as pdf:
                    extracted_text = "\n\n".join(
                        p.extract_text() for p in pdf.pages if p.extract_text()
                    )
                print(f"✅ Extracted {len(extracted_text)} chars from PDF")
            except ImportError:
                extracted_text = raw_bytes.decode("utf-8", errors="ignore")
            except Exception as e:
                raise HTTPException(status_code=422, detail=f"Failed to extract PDF: {e}")
        else:
            extracted_text = raw_bytes.decode("utf-8", errors="ignore").strip()

    if not extracted_text:
        raise HTTPException(status_code=422, detail="No notes content found.")

    existing_notes = session.get("user_notes", "") or ""
    updated_notes = (existing_notes + "\n\n---\n\n" + extracted_text) if existing_notes else extracted_text
    db.collection(SESSIONS).document(session_id).update({"user_notes": updated_notes})

    note_data = default_note(uid, session_id, extracted_text[:10000])
    _, ref = db.collection(USER_NOTES).add(note_data)

    rag_active = False
    rag_error = None
    try:
        from app.services.rag_service import store_embeddings, clear_session_embeddings
        clear_session_embeddings(session_id)
        rag_active = store_embeddings(session_id, updated_notes)
    except Exception as e:
        rag_error = str(e)
        print(f"⚠️  RAG embedding failed (non-fatal): {e}")

    return {
        "message":    "Notes uploaded successfully",
        "characters": len(extracted_text),
        "rag_active": rag_active,
        "rag_error":  rag_error,
        "note_id":    ref.id,
    }


class CheckpointUpdate(BaseModel):
    topic: Optional[str] = None
    objectives: Optional[List[str]] = None
    key_concepts: Optional[List[str]] = None


@router.put("/{session_id}/checkpoints/{checkpoint_id}")
def update_checkpoint(
    session_id: str,
    checkpoint_id: str,
    update: CheckpointUpdate,
    current_user=Depends(get_current_user),
):
    uid = current_user["uid"]
    _get_session_or_404(session_id, uid)

    cp_doc = db.collection(CHECKPOINTS).document(checkpoint_id).get()
    if not cp_doc.exists or cp_doc.to_dict().get("session_id") != session_id:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    cp = cp_doc.to_dict()
    if cp.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Cannot edit a completed checkpoint.")

    updates = {}
    if update.topic and update.topic.strip():
        updates["topic"] = update.topic.strip()
    if update.objectives is not None:
        updates["objectives"] = [o.strip() for o in update.objectives if o.strip()]
    if update.key_concepts is not None:
        updates["key_concepts"] = [k.strip() for k in update.key_concepts if k.strip()]

    if not updates:
        return {"message": "No changes applied.", "checkpoint_id": checkpoint_id}

    updates.update({
        "content_generated": False,
        "context":           None,
        "explanation":       None,
        "questions_cache":   None,
        "validation_score":  None,
    })

    db.collection(CHECKPOINTS).document(checkpoint_id).update(updates)
    updated = {**cp, **updates}
    print(f"✅ Checkpoint {checkpoint_id} updated by user {uid}")

    return {
        "message":            "Checkpoint updated successfully.",
        "checkpoint_id":      checkpoint_id,
        "topic":              updated.get("topic"),
        "objectives":         updated.get("objectives"),
        "key_concepts":       updated.get("key_concepts"),
        "content_invalidated": True,
    }