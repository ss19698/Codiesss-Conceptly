import firebase_admin
from firebase_admin import credentials, auth
import os
import json

firebase_credentials = os.getenv("FIREBASE_CREDENTIALS")

cred_dict = json.loads(firebase_credentials)

cred = credentials.Certificate(cred_dict)

firebase_admin.initialize_app(cred)


def verify_firebase_token(id_token: str):
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception:
        return None