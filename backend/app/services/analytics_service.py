import logging

from app.core.database import get_db

logger = logging.getLogger(__name__)

async def get_triage_analytics() -> dict:
    """
    Returns analytics from the triage history database:
    - total_triages
    - unique_patients
    - avg_mts_level
    - rag_percentage
    - mts_distribution
    - specialty_distribution
    - lang_distribution
    """
    db = await get_db()

    # Total triages
    cursor = await db.execute("SELECT COUNT(*) as count FROM triage_history")
    row = await cursor.fetchone()
    total = row["count"] if row else 0

    # Unique patients
    cursor = await db.execute("SELECT COUNT(DISTINCT patient_id) as count FROM triage_history")
    row = await cursor.fetchone()
    unique_patients = row["count"] if row else 0

    # Average MTS level
    cursor = await db.execute("SELECT AVG(mts_level) as avg FROM triage_history")
    row = await cursor.fetchone()
    avg_mts = round(row["avg"], 2) if row and row["avg"] is not None else None

    # RAG usage percentage
    cursor = await db.execute("SELECT SUM(rag_used) as used FROM triage_history")
    row = await cursor.fetchone()
    rag_used_count = row["used"] if row and row["used"] is not None else 0
    rag_percentage = round((rag_used_count / total) * 100) if total > 0 else 0

    # MTS Distribution
    cursor = await db.execute('''
        SELECT mts_level, COUNT(*) as count
        FROM triage_history
        GROUP BY mts_level
        ORDER BY mts_level ASC
    ''')
    rows = await cursor.fetchall()
    mts_distribution = [{"mts_level": dict(r)["mts_level"], "count": dict(r)["count"]} for r in rows]

    # Specialty Distribution
    cursor = await db.execute('''
        SELECT specialty, COUNT(*) as count
        FROM triage_history
        GROUP BY specialty
        ORDER BY count DESC
    ''')
    rows = await cursor.fetchall()
    specialty_distribution = [{"specialty": dict(r)["specialty"], "count": dict(r)["count"]} for r in rows]

    # Language Distribution
    cursor = await db.execute('''
        SELECT lang, COUNT(*) as count
        FROM triage_history
        GROUP BY lang
        ORDER BY count DESC
    ''')
    rows = await cursor.fetchall()
    lang_distribution = [{"lang": dict(r)["lang"], "count": dict(r)["count"]} for r in rows]

    return {
        "total_triages": total,
        "unique_patients": unique_patients,
        "avg_mts_level": avg_mts,
        "rag_percentage": rag_percentage,
        "mts_distribution": mts_distribution,
        "specialty_distribution": specialty_distribution,
        "lang_distribution": lang_distribution,
    }
