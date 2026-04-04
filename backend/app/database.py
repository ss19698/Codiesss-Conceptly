from app.firebase import db 


def get_db():
    yield db


def init_db():
    print("Firestore is schema-less — init_db() is a no-op.")