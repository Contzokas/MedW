import asyncio

from app.schemas.triage import QueueEntry

_queue: list[QueueEntry] = []
_lock: asyncio.Lock | None = None


def _get_lock() -> asyncio.Lock:
    global _lock
    if _lock is None:
        _lock = asyncio.Lock()
    return _lock


async def append_entry(entry: QueueEntry) -> None:
    async with _get_lock():
        _queue.append(entry)


async def get_all_entries() -> list[QueueEntry]:
    async with _get_lock():
        return [entry.model_copy() for entry in _queue]
