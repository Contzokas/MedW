from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.clients import nim_client


# ---------------------------------------------------------------------------
# check_nim_ready tests
# ---------------------------------------------------------------------------


async def test_check_nim_ready_success():
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()  # does not raise

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.clients.nim_client.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        await nim_client.check_nim_ready("http://nim:8000/v1", 5.0)

    mock_client.get.assert_called_once_with("http://nim:8000/v1/health/ready")
    mock_response.raise_for_status.assert_called_once()


async def test_check_nim_ready_raises_on_non_200():
    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "500", request=MagicMock(), response=MagicMock()
    )

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.clients.nim_client.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        with pytest.raises(httpx.HTTPStatusError):
            await nim_client.check_nim_ready("http://nim:8000/v1", 5.0)


async def test_check_nim_ready_raises_on_connection_failure():
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(
        side_effect=httpx.ConnectError("Connection refused")
    )

    with patch("app.clients.nim_client.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        with pytest.raises(httpx.RequestError):
            await nim_client.check_nim_ready("http://nim:8000/v1", 5.0)


# ---------------------------------------------------------------------------
# query_rag_server tests
# ---------------------------------------------------------------------------


async def test_query_rag_server_returns_text_on_200():
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {"text": "Cardiology referral recommended"}

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.clients.nim_client.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        result = await nim_client.query_rag_server("chest pain", 5.0)

    assert result == "Cardiology referral recommended"


async def test_query_rag_server_falls_back_to_answer_field():
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {"answer": "Neurology follow-up advised"}

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.clients.nim_client.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        result = await nim_client.query_rag_server("headache", 5.0)

    assert result == "Neurology follow-up advised"


async def test_query_rag_server_raises_on_non_200():
    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "503", request=MagicMock(), response=MagicMock()
    )

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.clients.nim_client.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        with pytest.raises(httpx.HTTPStatusError):
            await nim_client.query_rag_server("abdominal pain", 5.0)


async def test_query_rag_server_raises_on_connection_failure():
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(
        side_effect=httpx.ConnectError("Connection refused")
    )

    with patch("app.clients.nim_client.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        with pytest.raises(httpx.RequestError):
            await nim_client.query_rag_server("fever", 5.0)
