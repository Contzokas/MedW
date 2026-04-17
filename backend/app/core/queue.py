import asyncio
from collections import deque

from app.core.config import QUEUE_MAX_ENTRIES
from app.schemas.triage import QueueEntry

_queue: deque[QueueEntry] = deque(maxlen=QUEUE_MAX_ENTRIES)
_lock: asyncio.Lock | None = None
_new_entry_event: asyncio.Event | None = None


def _get_lock() -> asyncio.Lock:
    global _lock
    if _lock is None:
        _lock = asyncio.Lock()
    return _lock


def _get_new_entry_event() -> asyncio.Event:
    global _new_entry_event
    if _new_entry_event is None:
        _new_entry_event = asyncio.Event()
    return _new_entry_event


async def append_entry(entry: QueueEntry) -> None:
    async with _get_lock():
        _queue.append(entry)
    _get_new_entry_event().set()


async def get_all_entries() -> list[QueueEntry]:
    async with _get_lock():
        return [entry.model_copy() for entry in list(_queue)]


async def wait_for_new_entry(timeout: float = 1.0) -> bool:
    """Wait up to `timeout` seconds for a new entry. Returns True if signalled, False on timeout."""
    event = _get_new_entry_event()
    try:
        await asyncio.wait_for(asyncio.shield(event.wait()), timeout=timeout)
        event.clear()
        return True
    except asyncio.TimeoutError:
        return False
