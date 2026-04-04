from fastapi import Depends, HTTPException, Header
from app.firebase import verify_firebase_token, db


def get_current_user(authorization: str = Header(...)):

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ", 1)[1]
    decoded = verify_firebase_token(token)

    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return decoded


def get_db_user(firebase_user=Depends(get_current_user)):

    uid = firebase_user["uid"]
    user_ref = db.collection("users").document(uid)
    doc = user_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="User not found")

    data = doc.to_dict()
    data["id"] = doc.id
    return data