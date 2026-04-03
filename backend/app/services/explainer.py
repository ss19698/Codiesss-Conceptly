from typing import Dict, Optional
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from app.llm import get_llm

llm = get_llm(temperature=0)

def explain_checkpoint(
    checkpoint: Dict,
    context: str,
    tutor_mode: str = "supportive_buddy",
    session_id: Optional[int] = None,
) -> str:
    tutor_personalities = {
        "chill_friend": "Teach in a casual, friendly way with relatable examples.",
        "strict_mentor": "Provide structured, detailed explanations with precision.",
        "supportive_buddy": "Explain warmly with encouragement and clear examples.",
        "exam_mode": "Focus on exam-relevant points with concise clarity."
    }

    personality = tutor_personalities.get(
        tutor_mode,
        tutor_personalities["supportive_buddy"]
    )

    system_msg = SystemMessage(
        content=f"You are an educational content creator. {personality}"
    )

    objectives_text = "\n".join(
        f"  • {obj}" for obj in checkpoint.get('objectives', [])
    )

    augmented_context = context
    try:
        from app.services.rag_service import build_rag_context, is_rag_active
        if session_id and is_rag_active(session_id):
            query = checkpoint.get("topic", "") + " " + " ".join(
                checkpoint.get("key_concepts", [])[:5]
            )
            augmented_context = build_rag_context(context, query, session_id, max_extra_chars=1500)
            print(f"explainer: RAG context injected for session {session_id}")
    except Exception as e:
        print(f"explainer RAG error (non-fatal): {e}")

    human_msg = HumanMessage(content=f"""
TOPIC: {checkpoint.get('topic')}
LEVEL: {checkpoint.get('level', 'intermediate')}

OBJECTIVES:
{objectives_text}

CONTENT:
{augmented_context[:3000]}

Create a clear, engaging explanation (600-1200 words) that teaches this topic effectively.
Use examples, analogies, and memory aids where appropriate.
Make it comprehensive so students can truly understand the material.
""")

    response = llm.invoke([system_msg, human_msg])

    return response.content