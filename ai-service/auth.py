"""
auth.py
JWT token extraction utility for AI service.
"""

import os
import jwt as pyjwt
from fastapi import Request, HTTPException
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET    = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


def extract_user_id(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing or invalid. Format: Bearer <token>"
        )

    token = auth_header.split(" ")[1].strip()

    if not JWT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="JWT_SECRET not configured in AI service .env"
        )

    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        print("[AUTH] JWT payload:", payload)
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired.")
    except pyjwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    #user_id = payload.get("id") or payload.get("_id") or payload.get("user_id")
    user_id = payload.get("userId")
    
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="user_id not found in token payload."
        )

    return str(user_id)