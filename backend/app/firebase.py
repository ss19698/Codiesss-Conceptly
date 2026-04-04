import firebase_admin
from firebase_admin import credentials, auth
import os
import json

firebase_credentials = os.getenv("FIREBASE_CREDENTIALS")

if not firebase_credentials:
    raise ValueError("FIREBASE_CREDENTIALS environment variable is not set")

cred_dict = json.loads(firebase_credentials)
cred = credentials.Certificate(cred_dict)
firebase_admin.initialize_app(cred)


def verify_firebase_token(id_token: str):
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"[Firebase] Token verification failed: {e}")
        return None