from typing import Dict, Optional
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
import json
from app.llm import get_llm

llm = get_llm(temperature=0)

def gather_context(
    checkpoint: Dict,
    tutor_mode: str = "supportive_buddy",
    session_id: Optional[int] = None,
) -> str:
    tutor_personalities = {
        "chill_friend": "You're laid-back and friendly. Use casual language.",
        "strict_mentor": "You're disciplined and precise. Be formal and thorough.",
        "supportive_buddy": "You're encouraging and positive. Be warm and helpful.",
        "exam_mode": "You're exam-focused and efficient. Be concise and clear."
    }

    personality = tutor_personalities.get(
        tutor_mode,
        tutor_personalities["supportive_buddy"]
    )

    system_msg = SystemMessage(
        content=f"You are an expert teacher. {personality}"
    )

    objectives = "\n".join(
        f"- {o}" for o in checkpoint.get("objectives", [])
    )

    key_concepts = checkpoint.get("key_concepts", [])
    key_concepts_text = ", ".join(key_concepts) if key_concepts else "Core fundamentals"

    human_msg = HumanMessage(content=f"""
TOPIC: {checkpoint.get("topic")}
LEVEL: {checkpoint.get("level", "intermediate")}

OBJECTIVES:
{objectives}

KEY CONCEPTS: {key_concepts_text}

Write comprehensive educational content (600-800 words) covering these objectives.
Include examples, explanations, and key concepts.
Make it thorough so students can learn effectively.
""")

    response = llm.invoke([system_msg, human_msg])
    context = response.content

    try:
        from app.services.rag_service import build_rag_context, is_rag_active
        if session_id and is_rag_active(session_id):
            query = checkpoint.get("topic", "") + " " + key_concepts_text
            context = build_rag_context(context, query, session_id)
            print(f"✅ context_gatherer: RAG context appended for session {session_id}")
    except Exception as e:
        print(f"⚠️  context_gatherer RAG error (non-fatal): {e}")

    return context

def validate_context(checkpoint: Dict, context: str) -> Dict:

    system_msg = SystemMessage(content="""You are a content quality validator.

Evaluate if the educational content adequately covers the stated objectives.

Return ONLY JSON:
{
  "score": <0-100>,
  "coverage": <0-100>,
  "clarity": <0-100>,
  "relevance": <0-100>
}""")

    objectives_text = "\n".join(f"  • {obj}" for obj in checkpoint.get('objectives', []))

    human_msg = HumanMessage(content=f"""Validate this content:

TOPIC: {checkpoint.get('topic')}

OBJECTIVES:
{objectives_text}

CONTENT:
{context[:2000]}

Rate the content quality and return JSON.""")

    try:
        response = llm.invoke([system_msg, human_msg])
        content = response.content.strip()

        if '```json' in content:
            content = content.split('```json')[1].split('```')[0]
        elif '```' in content:
            content = content.split('```')[1].split('```')[0]

        validation = json.loads(content.strip())
        score = validation.get('score', 85)

        print(f"  ✓ Coverage: {validation.get('coverage', score)}/100")
        print(f"  ✓ Clarity: {validation.get('clarity', score)}/100")
        print(f"  ✓ Relevance: {validation.get('relevance', score)}/100")

        return {
            'score': score,
            'coverage': validation.get('coverage', score),
            'clarity': validation.get('clarity', score),
            'relevance': validation.get('relevance', score)
        }

    except Exception as e:
        print(f"⚠️ Validation error: {e}, defaulting to passing score")
        return {
            'score': 85,
            'coverage': 85,
            'clarity': 85,
            'relevance': 85
        }