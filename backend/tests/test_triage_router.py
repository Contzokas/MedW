from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient, ASGITransport

from main import app
from app.schemas.triage import TriageResponse

_MOCK_RESPONSE = TriageResponse(
    mts_level=2,
    mts_label="Very Urgent",
    specialty="Καρδιολογία",
    doctor={"name": "Δρ. Τεστ", "specialty": "Καρδιολογία", "availability": True, "fallback_note": None},
    reasoning="Τεστ αιτιολόγηση.",
    redirect_url="https://finddoctors.gov.gr/search?specialty=%CE%9A%CE%B1%CF%81%CE%B4%CE%B9%CE%BF%CE%BB%CE%BF%CE%B3%CE%AF%CE%B1&doctor=%CE%94%CF%81.+%CE%A4%CE%B5%CF%83%CF%84",
    rag_used=True,
)


@pytest.fixture()
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_triage_post_returns_200_with_all_fields(client):
    with patch("app.services.triage_service.classify", new_callable=AsyncMock) as mock_classify:
        mock_classify.return_value = _MOCK_RESPONSE
        response = await client.post(
            "/api/v1/triage",
            json={"symptoms": "πόνος στο στήθος", "patient_id": "test-001"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["mts_level"] == 2
    assert data["mts_label"] == "Very Urgent"
    assert data["specialty"] == "Καρδιολογία"
    assert "doctor" in data
    assert "redirect_url" in data
    assert "reasoning" in data
    assert "rag_used" in data
    mock_classify.assert_called_once_with("πόνος στο στήθος", "test-001", "el")


@pytest.mark.asyncio
async def test_triage_response_is_flat_no_envelope(client):
    with patch("app.services.triage_service.classify", new_callable=AsyncMock) as mock_classify:
        mock_classify.return_value = _MOCK_RESPONSE
        response = await client.post(
            "/api/v1/triage",
            json={"symptoms": "πόνος στο στήθος", "patient_id": "test-001"},
        )
    data = response.json()
    assert "data" not in data
    assert "success" not in data
    assert "detail" not in data


@pytest.mark.asyncio
async def test_triage_post_forwards_lang_to_service(client):
    with patch("app.services.triage_service.classify", new_callable=AsyncMock) as mock_classify:
        mock_classify.return_value = _MOCK_RESPONSE
        response = await client.post(
            "/api/v1/triage",
            json={"symptoms": "chest pain", "patient_id": "test-english", "lang": "en"},
        )

    assert response.status_code == 200
    mock_classify.assert_called_once_with("chest pain", "test-english", "en")


@pytest.mark.asyncio
async def test_triage_invalid_lang_returns_422(client):
    response = await client.post(
        "/api/v1/triage",
        json={"symptoms": "chest pain", "patient_id": "test-english", "lang": "fr"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_health_still_returns_ok(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_warmup_health_status_shape(client):
    response = await client.get("/api/v1/health/warmup")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ok"
    assert "warmup" in data
    warmup = data["warmup"]

    expected_keys = {
        "enabled",
        "ready",
        "model",
        "timeout_seconds",
        "keep_alive",
        "max_retries",
        "retry_delay_seconds",
        "in_progress",
        "attempts",
        "started_at",
        "last_attempt_at",
        "last_success_at",
        "last_error",
    }
    assert expected_keys.issubset(set(warmup.keys()))


@pytest.mark.asyncio
async def test_triage_queue_sse_headers(client):
    """SSE endpoint responds with correct content-type and headers."""
    async def _finite_generator():
        yield "event: triage_update\ndata: {}\n\n"

    with patch("app.routers.triage._sse_queue_generator", return_value=_finite_generator()):
        response = await client.get("/api/v1/triage/queue")

    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    assert response.headers.get("cache-control") == "no-cache"
    assert response.headers.get("connection") == "keep-alive"


@pytest.mark.asyncio
async def test_triage_missing_symptoms_returns_422(client):
    response = await client.post(
        "/api/v1/triage",
        json={"patient_id": "test-001"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_triage_missing_patient_id_returns_422(client):
    response = await client.post(
        "/api/v1/triage",
        json={"symptoms": "πόνος στο στήθος"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_triage_empty_symptoms_returns_422(client):
    response = await client.post(
        "/api/v1/triage",
        json={"symptoms": "   ", "patient_id": "test-001"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_triage_empty_patient_id_returns_422(client):
    response = await client.post(
        "/api/v1/triage",
        json={"symptoms": "πόνος στο στήθος", "patient_id": "   "},
    )
    assert response.status_code == 422
