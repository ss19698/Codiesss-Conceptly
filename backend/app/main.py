from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, engine
from app.routes import auth, sessions, checkpoints, analytics, gamification
from sqlalchemy import text
import os
import uvicorn

app = FastAPI(title="Conceptly API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(checkpoints.router)
app.include_router(analytics.router)
app.include_router(gamification.router)


@app.on_event("startup")
async def on_startup():
    print("Starting Conceptly API")
    print(f"Running on Render: {bool(os.getenv('RENDER'))}")
    print(f"DB configured: {bool(os.getenv('DATABASE_URL'))}")

    try:
        init_db()
        print("Database initialized")
    except Exception as e:
        print(f"Database initialization failed: {e}")

    print("Startup complete!")


@app.get("/")
def read_root():
    return {
        "message": "Conceptly API is running!",
        "status": "healthy",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/db-status")
def database_status():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            return {
                "database": "connected",
                "status": "done"
            }
    except Exception as e:
        return {
            "database": "error",
            "error": str(e),
            "status": "failed"
        }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)