from typing import List, Optional, Dict
import os
import re
import hashlib

try:
    from langchain_community.vectorstores import FAISS
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    _RAG_AVAILABLE = True
except ImportError:
    _RAG_AVAILABLE = False
    print("⚠️  RAG dependencies not installed. "
          "Run: pip install faiss-cpu langchain-community sentence-transformers")

_vectorstore_cache: Dict[int, object] = {}

_embeddings_model = None


def _get_embeddings():
    """Lazy-load the HuggingFace embeddings model once."""
    global _embeddings_model
    if _embeddings_model is None and _RAG_AVAILABLE:
        _embeddings_model = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
    return _embeddings_model

def create_embeddings(notes: str) -> Optional[List[str]]:
    if not _RAG_AVAILABLE or not notes or not notes.strip():
        return None

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=400,
        chunk_overlap=60,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(notes.strip())
    print(f"📄 RAG: split notes into {len(chunks)} chunks")
    return chunks if chunks else None


def store_embeddings(session_id: int, notes: str) -> bool:
    if not _RAG_AVAILABLE or not notes or not notes.strip():
        return False

    if session_id in _vectorstore_cache:
        return True

    chunks = create_embeddings(notes)
    if not chunks:
        return False

    try:
        embeddings = _get_embeddings()
        vectorstore = FAISS.from_texts(chunks, embeddings)
        _vectorstore_cache[session_id] = vectorstore
        print(f"✅ RAG: stored {len(chunks)} embeddings for session {session_id}")
        return True
    except Exception as e:
        print(f"⚠️  RAG: failed to store embeddings for session {session_id}: {e}")
        return False


def get_relevant_chunks(
    query: str,
    session_id: int,
    k: int = 3,
) -> List[str]:
    if not _RAG_AVAILABLE:
        return []

    vectorstore = _vectorstore_cache.get(session_id)
    if vectorstore is None:
        return []

    try:
        docs = vectorstore.similarity_search(query, k=k)
        chunks = [doc.page_content for doc in docs]
        print(f"🔍 RAG: retrieved {len(chunks)} chunks for query '{query[:60]}...'")
        return chunks
    except Exception as e:
        print(f"⚠️  RAG: retrieval error for session {session_id}: {e}")
        return []


def build_rag_context(
    base_context: str,
    query: str,
    session_id: Optional[int],
    max_extra_chars: int = 2000,
) -> str:
    if not session_id:
        return base_context

    chunks = get_relevant_chunks(query, session_id, k=3)
    if not chunks:
        return base_context

    extra = "\n\n".join(chunks)[:max_extra_chars]
    augmented = (
        base_context
        + "\n\n---\n📚 **Additional context from your uploaded notes:**\n"
        + extra
    )
    print(f"✅ RAG: augmented context with {len(extra)} chars of note content")
    return augmented


def initialise_session_rag(session_id: int, user_notes: Optional[str]) -> bool:
    if not user_notes or not user_notes.strip():
        return False
    return store_embeddings(session_id, user_notes)


def clear_session_embeddings(session_id: int) -> None:
    _vectorstore_cache.pop(session_id, None)
    print(f"RAG: cleared embeddings for session {session_id}")


def is_rag_active(session_id: Optional[int]) -> bool:
    return bool(session_id and session_id in _vectorstore_cache)