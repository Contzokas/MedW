import asyncio

import pytest

from app.core import queue as q
from app.schemas.triage import QueueEntry


@pytest.fixture(autouse=True)
def reset_queue():
    q._queue.clear()
    q._lock = None
    q._new_entry_event = None
    yield
    q._queue.clear()
    q._lock = None
    q._new_entry_event = None


def make_entry(patient_id: str = "p-001", mts_level: int = 3) -> QueueEntry:
    return QueueEntry(
        patient_id=patient_id,
        mts_level=mts_level,
        specialty="Γενική Ιατρική",
        timestamp="2026-04-17T10:00:00Z",
    )


@pytest.mark.asyncio
async def test_append_entry_signals_event():
    entry = make_entry()
    event = q._get_new_entry_event()
    assert not event.is_set()
    await q.append_entry(entry)
    assert event.is_set()


@pytest.mark.asyncio
async def test_wait_for_new_entry_returns_true_when_signalled():
    async def add_after_delay():
        await asyncio.sleep(0.05)
        await q.append_entry(make_entry())

    asyncio.create_task(add_after_delay())
    result = await q.wait_for_new_entry(timeout=1.0)
    assert result is True


@pytest.mark.asyncio
async def test_wait_for_new_entry_returns_false_on_timeout():
    result = await q.wait_for_new_entry(timeout=0.05)
    assert result is False


@pytest.mark.asyncio
async def test_get_all_entries_reflects_appended():
    e1 = make_entry("p-001")
    e2 = make_entry("p-002")
    await q.append_entry(e1)
    await q.append_entry(e2)
    entries = await q.get_all_entries()
    assert len(entries) == 2
    assert entries[0].patient_id == "p-001"
    assert entries[1].patient_id == "p-002"


@pytest.mark.asyncio
async def test_sse_generator_yields_existing_entries_first():
    """Existing entries are streamed immediately on connect."""
    await q.append_entry(make_entry("p-existing"))

    from app.routers.triage import _sse_queue_generator

    gen = _sse_queue_generator()
    first_chunk = await gen.__anext__()
    assert "event: triage_update" in first_chunk
    assert "p-existing" in first_chunk
    await gen.aclose()


@pytest.mark.asyncio
async def test_sse_generator_yields_new_entry_after_append():
    """New entries appended after connect appear in the stream."""
    from app.routers.triage import _sse_queue_generator

    gen = _sse_queue_generator()

    async def append_soon():
        await asyncio.sleep(0.1)
        await q.append_entry(make_entry("p-new"))

    asyncio.create_task(append_soon())

    chunk = await gen.__anext__()
    assert "event: triage_update" in chunk
    assert "p-new" in chunk
    await gen.aclose()


@pytest.mark.asyncio
async def test_sse_ping_after_silence(monkeypatch):
    """Ping comment is emitted after 15 seconds of inactivity."""
    from app.routers import triage as triage_mod

    call_count = 0

    async def fast_wait(timeout: float = 1.0) -> bool:
        nonlocal call_count
        call_count += 1
        return False

    monkeypatch.setattr(q, "wait_for_new_entry", fast_wait)

    gen = triage_mod._sse_queue_generator()

    chunks = []
    for _ in range(16):
        chunk = await gen.__anext__()
        chunks.append(chunk)
        if ": ping" in chunk:
            break

    await gen.aclose()
    assert any(": ping" in c for c in chunks), "Expected ping chunk within 16 iterations"


@pytest.mark.asyncio
async def test_sse_generator_continues_after_queue_saturation(monkeypatch):
    """When deque is full and evicts old items, stream still emits new updates."""
    from app.routers.triage import _sse_queue_generator

    monkeypatch.setattr("app.core.config.QUEUE_MAX_ENTRIES", 2)
    q._queue = __import__("collections").deque(maxlen=2)
    q._lock = None
    q._new_entry_event = None

    await q.append_entry(make_entry("p-1"))
    await q.append_entry(make_entry("p-2"))

    gen = _sse_queue_generator()
    first = await gen.__anext__()
    second = await gen.__anext__()
    assert "p-1" in first
    assert "p-2" in second

    await q.append_entry(make_entry("p-3"))
    third = await gen.__anext__()
    assert "p-3" in third
    await gen.aclose()
