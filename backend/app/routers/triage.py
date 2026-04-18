from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core import queue
from app.schemas.triage import QueueEntry, TriageRequest, TriageResponse
from app.services import triage_service

router = APIRouter()


@router.post("/triage", response_model=TriageResponse)
async def perform_triage(request: TriageRequest) -> TriageResponse:
    return await triage_service.classify(request.symptoms, request.patient_id)


def _entry_key(entry: QueueEntry) -> tuple[str, int, str, str]:
    return (entry.patient_id, entry.mts_level, entry.specialty, entry.timestamp)


async def _sse_queue_generator() -> AsyncGenerator[str, None]:
    existing = await queue.get_all_entries()
    last_sent_key: tuple[str, int, str, str] | None = None
    for entry in existing:
        yield f"event: triage_update\ndata: {entry.model_dump_json()}\n\n"
        last_sent_key = _entry_key(entry)

    seconds_since_ping = 0

    while True:
        await queue.wait_for_new_entry(timeout=1.0)
        seconds_since_ping += 1

        all_entries = await queue.get_all_entries()
        if last_sent_key is None:
            new_entries = all_entries
        else:
            start_index = None
            for idx in range(len(all_entries) - 1, -1, -1):
                if _entry_key(all_entries[idx]) == last_sent_key:
                    start_index = idx + 1
                    break
            new_entries = all_entries if start_index is None else all_entries[start_index:]

        for entry in new_entries:
            yield f"event: triage_update\ndata: {entry.model_dump_json()}\n\n"
            seconds_since_ping = 0
            last_sent_key = _entry_key(entry)

        if seconds_since_ping >= 15:
            yield ": ping\n\n"
            seconds_since_ping = 0


@router.get("/triage/queue")
async def stream_triage_queue() -> StreamingResponse:
    return StreamingResponse(
        _sse_queue_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
