import pytest

from app.services.llm_service import LLMParseError, _parse_response, classify


VALID_JSON = (
    '{"mts_level": 2, "mts_label": "Very Urgent", '
    '"specialty": "Καρδιολογία", "reasoning": "Πόνος στο στήθος με ακτινοβολία."}'
)


def test_parse_response_returns_correct_dict():
    result = _parse_response(VALID_JSON)
    assert result["mts_level"] == 2
    assert result["mts_label"] == "Very Urgent"
    assert result["specialty"] == "Καρδιολογία"
    assert "reasoning" in result


def test_parse_response_extracts_json_from_prose():
    wrapped = f"Sure, here is the result:\n{VALID_JSON}\nHope that helps."
    result = _parse_response(wrapped)
    assert result["mts_level"] == 2


def test_parse_response_raises_on_non_json():
    with pytest.raises(LLMParseError):
        _parse_response("I cannot determine the MTS level.")


def test_parse_response_raises_on_missing_field():
    incomplete = '{"mts_level": 3, "mts_label": "Urgent", "specialty": "Γενική Ιατρική"}'
    with pytest.raises(LLMParseError, match="Missing required fields"):
        _parse_response(incomplete)


def test_parse_response_raises_on_out_of_range_mts_level():
    bad = '{"mts_level": 6, "mts_label": "X", "specialty": "X", "reasoning": "X"}'
    with pytest.raises(LLMParseError, match="mts_level out of range"):
        _parse_response(bad)


def test_parse_response_raises_on_mts_label_mismatch():
    # mts_level=1 requires "Immediate", not "Non-urgent" — clinically dangerous inconsistency
    mismatched = '{"mts_level": 1, "mts_label": "Non-urgent", "specialty": "Καρδιολογία", "reasoning": "test"}'
    with pytest.raises(LLMParseError, match="mts_label mismatch"):
        _parse_response(mismatched)


def test_parse_response_raises_on_empty_specialty():
    empty_specialty = '{"mts_level": 2, "mts_label": "Very Urgent", "specialty": "", "reasoning": "test"}'
    with pytest.raises(LLMParseError, match="non-empty string"):
        _parse_response(empty_specialty)


def test_parse_response_raises_on_float_mts_level():
    float_level = '{"mts_level": 1.6, "mts_label": "Immediate", "specialty": "Καρδιολογία", "reasoning": "test"}'
    with pytest.raises(LLMParseError, match="float"):
        _parse_response(float_level)


async def test_classify_returns_dict_with_mocked_chain(monkeypatch):
    def mock_invoke(symptoms, context):
        return VALID_JSON

    monkeypatch.setattr("app.services.llm_service._invoke_chain_sync", mock_invoke)
    result = await classify("πόνος στο στήθος", "MTS clinical context")
    assert result["mts_level"] == 2
    assert result["specialty"] == "Καρδιολογία"


async def test_classify_raises_llm_parse_error_on_bad_response(monkeypatch):
    def mock_invoke(symptoms, context):
        return "not json at all"

    monkeypatch.setattr("app.services.llm_service._invoke_chain_sync", mock_invoke)
    with pytest.raises(LLMParseError):
        await classify("πόνος", "context")


async def test_classify_wraps_chain_exception_in_llm_parse_error(monkeypatch):
    def mock_invoke(symptoms, context):
        raise ConnectionError("Ollama unreachable")

    monkeypatch.setattr("app.services.llm_service._invoke_chain_sync", mock_invoke)
    with pytest.raises(LLMParseError, match="LLM service error"):
        await classify("πόνος", "context")


# ── Story 2.3: triage_service tests ──────────────────────────────────────────
from unittest.mock import AsyncMock

from app.services.triage_service import classify as triage_classify
from app.services.rag_service import RAGUnavailableError as _RAGUnavailableError
from app.services.llm_service import LLMParseError as _LLMParseError
from app.core import queue as queue_module

_VALID_LLM_RESULT = {
    "mts_level": 2,
    "mts_label": "Very Urgent",
    "specialty": "Καρδιολογία",
    "reasoning": "Πόνος στο στήθος.",
}


@pytest.fixture(autouse=True)
def reset_queue():
    queue_module._queue.clear()
    yield
    queue_module._queue.clear()


async def test_triage_tier1_rag_and_llm_success(monkeypatch):
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(return_value="context"))
    monkeypatch.setattr("app.services.triage_service.llm_classify", AsyncMock(return_value=_VALID_LLM_RESULT))
    result = await triage_classify("πόνος στο στήθος", "patient-001")
    assert result.rag_used is True
    assert result.mts_level == 2
    assert result.specialty == "Καρδιολογία"


async def test_triage_tier2_rag_unavailable_falls_back_to_llm(monkeypatch):
    mock_llm = AsyncMock(return_value=_VALID_LLM_RESULT)
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(side_effect=_RAGUnavailableError("down")))
    monkeypatch.setattr("app.services.triage_service.llm_classify", mock_llm)
    result = await triage_classify("πόνος", "patient-002")
    assert result.rag_used is False
    assert result.mts_level == 2
    mock_llm.assert_called_once_with(symptoms="πόνος", context="")


async def test_triage_tier3_llm_parse_error_returns_safe_default(monkeypatch):
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(return_value="ctx"))
    monkeypatch.setattr("app.services.triage_service.llm_classify", AsyncMock(side_effect=_LLMParseError("bad")))
    result = await triage_classify("πόνος", "patient-003")
    assert result.mts_level == 3
    assert result.specialty == "General Practice"
    assert result.rag_used is False


async def test_triage_tier3_unexpected_exception_returns_safe_default(monkeypatch):
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(side_effect=RuntimeError("boom")))
    result = await triage_classify("πόνος", "patient-004")
    assert result.mts_level == 3
    assert result.specialty == "General Practice"


async def test_triage_classify_never_raises(monkeypatch):
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(side_effect=Exception("catastrophic")))
    result = await triage_classify("πόνος", "patient-005")  # must not raise
    assert result is not None


async def test_triage_queue_entry_appended_on_success(monkeypatch):
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(return_value="ctx"))
    monkeypatch.setattr("app.services.triage_service.llm_classify", AsyncMock(return_value=_VALID_LLM_RESULT))
    await triage_classify("πόνος", "patient-006")
    entries = await queue_module.get_all_entries()
    assert len(entries) == 1
    entry = entries[0]
    assert entry.patient_id == "patient-006"
    assert entry.mts_level == 2
    assert entry.specialty == "Καρδιολογία"
    assert "symptoms" not in str(entry)


async def test_triage_queue_not_appended_on_tier3(monkeypatch):
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(side_effect=Exception("fail")))
    await triage_classify("πόνος", "patient-007")
    entries = await queue_module.get_all_entries()
    assert len(entries) == 0
