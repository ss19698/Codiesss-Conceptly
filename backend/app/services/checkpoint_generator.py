from typing import Dict, List, Optional
import json
import re
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv
from app.llm import get_llm

llm = get_llm(temperature=0)

def clean_json(text: str) -> str:
    if not text:
        return ""
    text = text.strip()
    text = re.sub(r"```json", "", text)
    text = re.sub(r"```", "", text)
    return text.strip()


def safe_json_load(text: str):
    try:
        return json.loads(text)
    except Exception as e:
        print("JSON Parse Error:", e)
        print("RAW OUTPUT:\n", text)
        return None


def generate_checkpoints(
    topic: str,
    current_level: str = "beginner",
    target_level: str = "intermediate",
    purpose: str = "general learning",
    tutor_mode: str = "supportive_buddy",
    session_id: Optional[int] = None,
) -> List[Dict]:
    tutor_personalities = {
        "chill_friend": "You're laid-back and friendly.",
        "strict_mentor": "You're disciplined and precise.",
        "supportive_buddy": "You're encouraging and positive.",
        "exam_mode": "You're exam-focused and efficient."
    }

    personality = tutor_personalities.get(
        tutor_mode,
        tutor_personalities["supportive_buddy"]
    )

    rag_section = ""
    try:
        from app.services.rag_service import build_rag_context, is_rag_active
        if session_id and is_rag_active(session_id):
            chunks_text = build_rag_context("", topic, session_id, max_extra_chars=1500)
            if chunks_text:
                rag_section = (
                    "\n\nUSER-PROVIDED NOTES (use to personalise checkpoints):\n"
                    + chunks_text.replace("---\n **Additional context from your uploaded notes:**\n", "")
                )
                print(f"checkpoint_generator: RAG context injected for session {session_id}")
    except Exception as e:
        print(f"checkpoint_generator RAG error (non-fatal): {e}")

    system_msg = SystemMessage(content=f"""
You are an expert curriculum designer.

{personality}

Return ONLY valid JSON array.
No markdown.
No explanation.
""")

    human_msg = HumanMessage(content=f"""
Create learning path for: {topic}

Current: {current_level}
Target: {target_level}
Purpose: {purpose}{rag_section}

Format:

[
  {{
    "id": 1,
    "topic": "...",
    "level": "beginner",
    "objectives": ["..."],
    "success_threshold": 0.7,
    "success_criteria": "...",
    "key_concepts": ["..."]
  }}
]
""")

    try:
        response = llm.invoke([system_msg, human_msg])

        raw = clean_json(response.content)
        data = safe_json_load(raw)

        if not data:
            raise Exception("Invalid JSON")

        if not isinstance(data, list):
            data = [data]

        for i, cp in enumerate(data, 1):
            cp["id"] = i
            cp.setdefault("level", current_level)
            cp.setdefault("success_threshold", 0.7)

        return data

    except Exception as e:
        print("generate_checkpoints error:", e)
        return create_default_checkpoints(topic, current_level)


def create_default_checkpoints(topic, level):
    return [
        {
            "id": 1,
            "topic": f"Basics of {topic}",
            "level": level,
            "objectives": [
                f"Understand {topic} fundamentals"
            ],
            "success_threshold": 0.7,
            "success_criteria": "Explain basics",
            "key_concepts": ["basics"]
        }
    ]