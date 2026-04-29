import logging

from app.core.database import get_db
from app.schemas.triage import TriageResponse

logger = logging.getLogger(__name__)

_INSERT_SQL = """
INSERT INTO triage_history (
    patient_id, symptoms, mts_level, mts_label,
    specialty, doctor_name, doctor_specialty,
    reasoning, redirect_url, rag_used, lang
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""

_COUNT_SQL = "SELECT COUNT(*) AS cnt FROM triage_history WHERE patient_id = ?"

_SELECT_PAGE_SQL = """
SELECT id, patient_id, symptoms, mts_level, mts_label,
       specialty, doctor_name, doctor_specialty,
       reasoning, redirect_url, rag_used, lang, created_at
FROM triage_history
WHERE patient_id = ?
ORDER BY id DESC
LIMIT ? OFFSET ?
"""

_SELECT_ONE_SQL = """
SELECT id, patient_id, symptoms, mts_level, mts_label,
       specialty, doctor_name, doctor_specialty,
       reasoning, redirect_url, rag_used, lang, created_at
FROM triage_history
WHERE patient_id = ? AND id = ?
"""


async def save_triage_result(
    patient_id: str,
    symptoms: str,
    result: TriageResponse,
    lang: str,
) -> int:
    db = await get_db()
    cursor = await db.execute(
        _INSERT_SQL,
        (
            patient_id,
            symptoms,
            result.mts_level,
            result.mts_label,
            result.specialty,
            result.doctor.name,
            result.doctor.specialty,
            result.reasoning,
            result.redirect_url,
            int(result.rag_used),
            lang,
        ),
    )
    await db.commit()
    return cursor.lastrowid  # type: ignore[return-value]


async def get_history(
    patient_id: str,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict], int]:
    db = await get_db()

    row = await db.execute(_COUNT_SQL, (patient_id,))
    count_row = await row.fetchone()
    total = count_row["cnt"] if count_row else 0

    cursor = await db.execute(_SELECT_PAGE_SQL, (patient_id, limit, offset))
    rows = await cursor.fetchall()
    entries = [dict(r) for r in rows]

    for entry in entries:
        entry["rag_used"] = bool(entry["rag_used"])

    return entries, total


async def get_entry(patient_id: str, entry_id: int) -> dict | None:
    db = await get_db()
    cursor = await db.execute(_SELECT_ONE_SQL, (patient_id, entry_id))
    row = await cursor.fetchone()
    if row is None:
        return None
    entry = dict(row)
    entry["rag_used"] = bool(entry["rag_used"])
    return entry
