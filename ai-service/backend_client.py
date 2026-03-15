"""
backend_client.py
All HTTP calls from AI service to the Node.js backend server.
"""

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:5000")


async def save_test(user_id: str, result: dict) -> dict:
    url = f"{BACKEND_BASE_URL}/api/tests/save"
    payload = {
        "user_id": user_id,
        "test": result,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        return response.json()