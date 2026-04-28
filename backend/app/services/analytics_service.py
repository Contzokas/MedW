import logging

from app.core.database import get_db

logger = logging.getLogger(__name__)

async def get_triage_analytics() -> dict:
    """
    Returns analytics from the triage history database:
    - total_triages
    - mts_distribution
    - specialty_distribution
    """
    db = await get_db()
    
    # Total
    cursor = await db.execute("SELECT COUNT(*) as count FROM triage_history")
    row = await cursor.fetchone()
    total = row["count"] if row else 0
    
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

    return {
        "total_triages": total,
        "mts_distribution": mts_distribution,
        "specialty_distribution": specialty_distribution
    }
