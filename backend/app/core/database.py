import logging
import os

import aiosqlite

from app.core.config import DB_PATH

logger = logging.getLogger(__name__)

_db: aiosqlite.Connection | None = None

_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS triage_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    symptoms TEXT NOT NULL,
    mts_level INTEGER NOT NULL,
    mts_label TEXT NOT NULL,
    specialty TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    doctor_specialty TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    redirect_url TEXT NOT NULL,
    rag_used INTEGER NOT NULL DEFAULT 1,
    lang TEXT NOT NULL DEFAULT 'el',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
"""


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        db_dir = os.path.dirname(DB_PATH)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
        _db = await aiosqlite.connect(DB_PATH)
        _db.row_factory = aiosqlite.Row
        await _db.execute(_CREATE_TABLE_SQL)
        await _db.commit()
        logger.info("Database initialised at %s", DB_PATH)
    return _db


async def close_db() -> None:
    global _db
    if _db is not None:
        await _db.close()
        _db = None
        logger.info("Database connection closed")
