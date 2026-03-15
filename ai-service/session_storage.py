from pymongo import MongoClient
from datetime import datetime, timedelta
from typing import Optional

class MongoSessionStore:
    def __init__(self, mongo_uri: str, db_name: str, collection: str = "rag_sessions"):
        self._client = MongoClient(mongo_uri)
        self._col = self._client[db_name][collection]
        # TTL index — auto-deletes sessions inactive for 7 days
        self._col.create_index("updated_at", expireAfterSeconds=7 * 24 * 3600)

    def get(self, session_id: str) -> dict:
        doc = self._col.find_one({"session_id": session_id})
        if doc:
            return {
                "history": doc.get("history", []),
                "retrieval": doc.get("retrieval", {})
            }
        return {"history": [], "retrieval": {}}

    def save(self, session_id: str, history: list, retrieval: dict):
        self._col.update_one(
            {"session_id": session_id},
            {"$set": {
                "history": history,
                "retrieval": retrieval,
                "updated_at": datetime.utcnow()
            }},
            upsert=True
        )

    def delete(self, session_id: str):
        self._col.delete_one({"session_id": session_id})