from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import User, LearningSession, Checkpoint, UserAnalytics, UserNote
from app.schemas import SessionCreate, SessionResponse, CheckpointResponse
from app.dependencies import get_current_user
from app.services import checkpoint_generator, notes_generator, question_generator
from app.services.workflow import run_checkpoint_workflow

router = APIRouter(prefix="/sessions", tags=["sessions"])

def _init_rag_for_session(session: LearningSession) -> None:
    if not session.user_notes or not session.user_notes.strip():
        return
    try:
        from app.services.rag_service import initialise_session_rag
        active = initialise_session_rag(session.id, session.user_notes)
        if active:
            print(f"✅ RAG initialised for session {session.id}")
    except Exception as e:
        print(f"⚠️  RAG init failed (non-fatal): {e}")


@router.post("/", response_model=SessionResponse)
def create_session(
    session: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_session = LearningSession(
        user_id=current_user.id,
        topic=session.topic,
        user_notes=session.user_notes,
        status="in_progress",
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    analytics = db.query(UserAnalytics).filter(
        UserAnalytics.user_id == current_user.id
    ).first()
    if analytics:
        analytics.total_sessions += 1
        db.commit()

    _init_rag_for_session(new_session)

    print(f"✓ Created new session: {new_session.topic} (ID: {new_session.id})")
    return new_session

@router.get("/", response_model=List[SessionResponse])
def get_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = db.query(LearningSession).filter(
        LearningSession.user_id == current_user.id
    ).order_by(LearningSession.created_at.desc()).all()
    return sessions

@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    _init_rag_for_session(session)

    return session

@router.post("/{session_id}/checkpoints")
def generate_checkpoints_route(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    existing_checkpoints = db.query(Checkpoint).filter(
        Checkpoint.session_id == session.id
    ).all()

    if existing_checkpoints:
        print(f"⚠️ Checkpoints already exist for session {session_id}, returning existing ones")
        return {
            "checkpoints": [
                {
                    "id": cp.id,
                    "topic": cp.topic,
                    "objectives": cp.objectives,
                    "key_concepts": cp.key_concepts,
                    "level": cp.level,
                    "success_threshold": 0.7,
                }
                for cp in existing_checkpoints
            ]
        }

    print(f"📚 Generating checkpoints for session {session_id}: {session.topic}")
    print(f"👤 User tutor mode: {current_user.tutor_mode}")

    _init_rag_for_session(session)

    question_generator.clear_question_history(session_id)

    # UPDATED: pass session_id so checkpoint_generator can use RAG
    checkpoints = checkpoint_generator.generate_checkpoints(
        topic=session.topic,
        current_level="beginner",
        target_level="intermediate",
        purpose="general learning",
        tutor_mode=current_user.tutor_mode,
        session_id=session_id,              # NEW
    )

    print(f"✓ Generated {len(checkpoints)} checkpoint definitions")

    created_checkpoints = []
    for idx, cp_data in enumerate(checkpoints):
        checkpoint = Checkpoint(
            session_id=session.id,
            checkpoint_index=idx,
            topic=cp_data['topic'],
            objectives=cp_data['objectives'],
            key_concepts=cp_data.get('key_concepts', []),
            level=cp_data.get('level', 'intermediate'),
            status="pending",
            content_generated=False,
        )
        db.add(checkpoint)
        created_checkpoints.append(checkpoint)

    db.commit()
    for cp in created_checkpoints:
        db.refresh(cp)

    print(f"✓ Saved {len(created_checkpoints)} checkpoints to database")
    return {"checkpoints": checkpoints}

@router.get("/{session_id}/checkpoints", response_model=List[CheckpointResponse])
def get_checkpoints(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    checkpoints = db.query(Checkpoint).filter(
        Checkpoint.session_id == session.id
    ).order_by(Checkpoint.checkpoint_index).all()
    return checkpoints

@router.get("/{session_id}/checkpoints/{checkpoint_id}/content")
def get_checkpoint_content(
    session_id: int,
    checkpoint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checkpoint = db.query(Checkpoint).filter(
        Checkpoint.id == checkpoint_id,
        Checkpoint.session_id == session_id,
    ).first()
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    if checkpoint.content_generated and checkpoint.context and checkpoint.explanation:
        print(f"✓ Returning cached content for checkpoint {checkpoint_id}")
        return {
            "context": checkpoint.context,
            "explanation": checkpoint.explanation,
            "validation_score": checkpoint.validation_score,
        }

    print(f"📝 Generating content for checkpoint {checkpoint_id}: {checkpoint.topic}")
    print(f"👤 Using tutor mode: {current_user.tutor_mode}")

    session = db.query(LearningSession).filter(
        LearningSession.id == session_id
    ).first()
    if session:
        _init_rag_for_session(session)

    checkpoint_data = {
        "id": checkpoint.id,
        "topic": checkpoint.topic,
        "objectives": checkpoint.objectives,
        "key_concepts": checkpoint.key_concepts,
        "level": checkpoint.level,
    }

    # UPDATED: pass session_id for RAG
    result = run_checkpoint_workflow(
        checkpoint=checkpoint_data,
        tutor_mode=current_user.tutor_mode,
        session_id=session_id,              # NEW
    )

    checkpoint.context = result['context']
    checkpoint.explanation = result['explanation']
    checkpoint.validation_score = result['validation_score']
    checkpoint.content_generated = True

    db.commit()
    db.refresh(checkpoint)

    print(f"✓ Content generated and cached for checkpoint {checkpoint_id}")
    return {
        "context": result['context'],
        "explanation": result['explanation'],
        "validation_score": result['validation_score'],
    }

@router.get("/{session_id}/checkpoints/{checkpoint_id}/questions")
def get_checkpoint_questions(
    session_id: int,
    checkpoint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checkpoint = db.query(Checkpoint).filter(
        Checkpoint.id == checkpoint_id,
        Checkpoint.session_id == session_id,
    ).first()
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    if checkpoint.questions_cache:
        print(f"✓ Returning cached questions for checkpoint {checkpoint_id}")
        return {"questions": checkpoint.questions_cache}

    print(f"❓ Generating questions for checkpoint {checkpoint_id}: {checkpoint.topic}")
    print(f"👤 Using tutor mode: {current_user.tutor_mode}")

    session = db.query(LearningSession).filter(
        LearningSession.id == session_id
    ).first()
    if session:
        _init_rag_for_session(session)

    checkpoint_data = {
        "id": checkpoint.id,
        "topic": checkpoint.topic,
        "objectives": checkpoint.objectives,
        "key_concepts": checkpoint.key_concepts,
        "level": checkpoint.level,
    }

    if not checkpoint.content_generated:
        # UPDATED: pass session_id
        result = run_checkpoint_workflow(
            checkpoint=checkpoint_data,
            tutor_mode=current_user.tutor_mode,
            session_id=session_id,          # NEW
        )

        checkpoint.context = result['context']
        checkpoint.explanation = result['explanation']
        checkpoint.validation_score = result['validation_score']
        checkpoint.questions_cache = result['questions']
        checkpoint.content_generated = True

        db.commit()
        db.refresh(checkpoint)

        print(f"✓ Full content generated for checkpoint {checkpoint_id}")
        return {"questions": result['questions']}

    # UPDATED: pass session_id
    questions = question_generator.generate_questions(
        checkpoint=checkpoint_data,
        context=checkpoint.context,
        level=checkpoint.level,
        tutor_mode=current_user.tutor_mode,
        session_id=session_id,              # NEW
    )

    checkpoint.questions_cache = questions
    db.commit()

    print(f"✓ Questions generated and cached for checkpoint {checkpoint_id}")
    return {"questions": questions}


@router.post("/{session_id}/checkpoints/{checkpoint_id}/questions/retry")
def get_retry_questions(
    session_id: int,
    checkpoint_id: int,
    weak_areas: list = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checkpoint = db.query(Checkpoint).filter(
        Checkpoint.id == checkpoint_id,
        Checkpoint.session_id == session_id,
    ).first()
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    checkpoint_data = {
        "id": checkpoint.id,
        "topic": checkpoint.topic,
        "objectives": checkpoint.objectives,
        "key_concepts": checkpoint.key_concepts,
        "level": checkpoint.level,
    }

    attempt_number = checkpoint.attempts

    questions = question_generator.generate_questions(
        checkpoint=checkpoint_data,
        context=checkpoint.context or "",
        level=checkpoint.level,
        tutor_mode=current_user.tutor_mode,
        weak_areas=weak_areas or [],
        attempt_number=attempt_number,
        session_id=session_id,
    )

    checkpoint.questions_cache = questions
    db.commit()

    print(f"✓ Retry questions generated for checkpoint {checkpoint_id}, weak areas: {weak_areas}")
    return {"questions": questions}

def complete_checkpoint(
    session_id: int,
    checkpoint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checkpoint = db.query(Checkpoint).filter(
        Checkpoint.id == checkpoint_id,
        Checkpoint.session_id == session_id,
    ).first()
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    checkpoint.status = "completed"
    checkpoint.completed_at = datetime.utcnow()
    checkpoint.xp_earned = 2

    current_user.xp += 2
    if current_user.xp >= (current_user.level * 100):
        current_user.level += 1
        print(f"🎉 User leveled up to level {current_user.level}!")

    analytics = db.query(UserAnalytics).filter(
        UserAnalytics.user_id == current_user.id
    ).first()
    if analytics:
        analytics.total_checkpoints += 1

    db.commit()
    print(f"✓ Checkpoint {checkpoint_id} completed")
    return {"message": "Checkpoint completed", "xp_earned": 2, "new_level": current_user.level}


@router.post("/{session_id}/complete")
def complete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    checkpoints = db.query(Checkpoint).filter(
        Checkpoint.session_id == session.id
    ).all()
    all_completed = all(cp.status == 'completed' for cp in checkpoints)

    if not all_completed:
        pending_count = sum(1 for cp in checkpoints if cp.status != 'completed')
        raise HTTPException(
            status_code=400,
            detail=f"Not all checkpoints completed. {pending_count} checkpoint(s) remaining.",
        )

    checkpoint_xp = sum(cp.xp_earned for cp in checkpoints)
    bonus_xp = 20
    total_xp = checkpoint_xp + bonus_xp

    session.status = "completed"
    session.completed_at = datetime.utcnow()
    session.xp_earned = total_xp

    current_user.xp += total_xp

    old_level = current_user.level
    while current_user.xp >= (current_user.level * 100):
        current_user.level += 1

    if current_user.level > old_level:
        print(f"🎉 User leveled up to level {current_user.level}!")

    analytics = db.query(UserAnalytics).filter(
        UserAnalytics.user_id == current_user.id
    ).first()
    if analytics:
        analytics.completed_sessions += 1

    db.commit()

    question_generator.clear_question_history(session_id)

    # NEW: release RAG embeddings to free memory
    try:
        from app.services.rag_service import clear_session_embeddings
        clear_session_embeddings(session_id)
    except Exception:
        pass

    print(f"✓ Session {session_id} completed! Total XP: {total_xp}")
    return {
        "message": "🎉 Congratulations! Session completed!",
        "checkpoint_xp": checkpoint_xp,
        "bonus_xp": bonus_xp,
        "total_xp_earned": total_xp,
        "new_level": current_user.level,
        "level_up": current_user.level > old_level,
    }


@router.get("/{session_id}/can-complete")
def can_complete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    checkpoints = db.query(Checkpoint).filter(
        Checkpoint.session_id == session.id
    ).all()
    completed_count = sum(1 for cp in checkpoints if cp.status == 'completed')
    total_count = len(checkpoints)

    return {
        "can_complete": completed_count == total_count,
        "completed_count": completed_count,
        "total_count": total_count,
        "session_status": session.status,
    }

@router.post("/{session_id}/notes/generate")
def generate_session_notes(
    session_id: int,
    notes_type: str = "comprehensive",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    checkpoints = db.query(Checkpoint).filter(
        Checkpoint.session_id == session.id
    ).all()

    checkpoint_data = [
        {
            "topic": cp.topic,
            "objectives": cp.objectives,
            "key_concepts": cp.key_concepts,
            "level": cp.level,
        }
        for cp in checkpoints
    ]

    from app.models import WeakTopic
    weak_topics = db.query(WeakTopic).filter(
        WeakTopic.user_id == current_user.id
    ).order_by(WeakTopic.strength_score.asc()).limit(5).all()
    weak_areas = [wt.concept for wt in weak_topics]

    if notes_type == "comprehensive":
        notes_content = notes_generator.generate_comprehensive_notes(
            session.topic, checkpoint_data, weak_areas
        )
    elif notes_type == "cheatsheet":
        notes_content = notes_generator.generate_cheat_sheet(
            session.topic, checkpoint_data
        )
    else:
        notes_content = notes_generator.generate_practice_questions(
            session.topic, checkpoint_data
        )

    note = UserNote(
        user_id=current_user.id,
        session_id=session.id,
        content=notes_content,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    print(f"✓ Generated {notes_type} notes for session {session_id}")
    return {"note": note, "content": notes_content}

@router.post("/{session_id}/notes/upload")
async def upload_session_notes(
    session_id: int,
    notes_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    extracted_text = ""

    if notes_text and notes_text.strip():
        extracted_text = notes_text.strip()

    elif file:
        content_type = file.content_type or ""
        raw_bytes = await file.read()

        if "pdf" in content_type or file.filename.lower().endswith(".pdf"):
            try:
                import io
                import pdfplumber
                with pdfplumber.open(io.BytesIO(raw_bytes)) as pdf:
                    pages_text = []
                    for page in pdf.pages:
                        t = page.extract_text()
                        if t:
                            pages_text.append(t)
                    extracted_text = "\n\n".join(pages_text)
                print(f"✅ Extracted {len(extracted_text)} chars from PDF")
            except ImportError:
                # Fallback: try plain UTF-8 decode (works for text PDFs sometimes)
                try:
                    extracted_text = raw_bytes.decode("utf-8", errors="ignore")
                except Exception:
                    raise HTTPException(
                        status_code=422,
                        detail="PDF parsing requires pdfplumber. "
                               "Install it with: pip install pdfplumber",
                    )
            except Exception as e:
                raise HTTPException(
                    status_code=422,
                    detail=f"Failed to extract text from PDF: {e}",
                )
        else:
            try:
                extracted_text = raw_bytes.decode("utf-8", errors="ignore").strip()
            except Exception as e:
                raise HTTPException(
                    status_code=422,
                    detail=f"Failed to read file: {e}",
                )

    if not extracted_text:
        raise HTTPException(
            status_code=422,
            detail="No notes content found. Provide notes_text or a file.",
        )
    if session.user_notes:
        session.user_notes = session.user_notes + "\n\n---\n\n" + extracted_text
    else:
        session.user_notes = extracted_text
    db.commit()
    note_record = UserNote(
        user_id=current_user.id,
        session_id=session.id,
        content=extracted_text[:10000],  # cap stored copy
    )
    db.add(note_record)
    db.commit()

    rag_active = False
    rag_error = None
    try:
        from app.services.rag_service import store_embeddings
        # Force re-build (clear old cache first)
        from app.services.rag_service import clear_session_embeddings
        clear_session_embeddings(session_id)
        rag_active = store_embeddings(session_id, session.user_notes)
    except Exception as e:
        rag_error = str(e)
        print(f"⚠️  RAG embedding failed (non-fatal): {e}")

    return {
        "message": "Notes uploaded successfully",
        "characters": len(extracted_text),
        "rag_active": rag_active,
        "rag_error": rag_error,
        "note_id": note_record.id,
    }

from pydantic import BaseModel
from typing import List as PList


class CheckpointUpdate(BaseModel):
    topic: Optional[str] = None
    objectives: Optional[PList[str]] = None
    key_concepts: Optional[PList[str]] = None


@router.put("/{session_id}/checkpoints/{checkpoint_id}")
def update_checkpoint(
    session_id: int,
    checkpoint_id: int,
    update: CheckpointUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    NEW: Allow the user to edit a checkpoint's topic, objectives, and/or
    key_concepts BEFORE learning has started (content_generated=False).

    - Already-generated content is invalidated so the workflow re-runs
      with the updated checkpoint on next access.
    - Completed checkpoints cannot be edited (status == 'completed').
    """
    # Verify session ownership
    session = db.query(LearningSession).filter(
        LearningSession.id == session_id,
        LearningSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    checkpoint = db.query(Checkpoint).filter(
        Checkpoint.id == checkpoint_id,
        Checkpoint.session_id == session_id,
    ).first()
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")

    if checkpoint.status == "completed":
        raise HTTPException(
            status_code=400,
            detail="Cannot edit a completed checkpoint.",
        )

    # Apply updates (only fields that were explicitly supplied)
    changed = False
    if update.topic is not None and update.topic.strip():
        checkpoint.topic = update.topic.strip()
        changed = True
    if update.objectives is not None:
        checkpoint.objectives = [o.strip() for o in update.objectives if o.strip()]
        changed = True
    if update.key_concepts is not None:
        checkpoint.key_concepts = [k.strip() for k in update.key_concepts if k.strip()]
        changed = True

    if not changed:
        return {
            "message": "No changes applied (empty update body).",
            "checkpoint_id": checkpoint_id,
        }

    # Invalidate cached content so workflow re-runs with updated checkpoint
    checkpoint.content_generated = False
    checkpoint.context = None
    checkpoint.explanation = None
    checkpoint.questions_cache = None
    checkpoint.validation_score = None

    db.commit()
    db.refresh(checkpoint)

    print(f"✅ Checkpoint {checkpoint_id} updated by user {current_user.id}")

    return {
        "message": "Checkpoint updated successfully.",
        "checkpoint_id": checkpoint_id,
        "topic": checkpoint.topic,
        "objectives": checkpoint.objectives,
        "key_concepts": checkpoint.key_concepts,
        "content_invalidated": True,
    }