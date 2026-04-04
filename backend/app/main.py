import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routes import auth, sessions, checkpoints, analytics, gamification

app = FastAPI(title="Conceptly API", version="1.0.0")

_raw_origins = os.getenv("FRONTEND_URL", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(checkpoints.router)
app.include_router(analytics.router)
app.include_router(gamification.router)


@app.on_event("startup")
async def on_startup():
    print("Starting Conceptly API")
    init_db()
    print("Startup complete!")


@app.get("/")
def read_root():
    return {
        "message": "Conceptly API is running!",
        "status": "healthy",
        "version": "1.0.0",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/db-status")
def database_status():
    try:
        from app.firebase import db
        _ = list(db.collections())
        return {"database": "firestore connected", "status": "ok"}
    except Exception as e:
        return {"database": "error", "error": str(e), "status": "failed"}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)