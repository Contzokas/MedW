import pytest

from app.services.llm_service import LLMParseError, _parse_response, classify


VALID_JSON = (
    '{"mts_level": 2, "mts_label": "Very Urgent", '
    '"specialty": "Καρδιολογία", "reasoning": "Πόνος στο στήθος με ακτινοβολία."}'
)

VALID_JSON_EN = (
    '{"mts_level": 2, "mts_label": "Very Urgent", '
    '"specialty": "Cardiology", "reasoning": "Chest pain radiating to the left arm."}'
)


def test_parse_response_returns_correct_dict():
    result = _parse_response(VALID_JSON)
    assert result["mts_level"] == 2
    assert result["mts_label"] == "Πολύ Επείγον"
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
    def mock_invoke(symptoms, context, lang="el", follow_up_count=0, max_follow_ups=2):
        return VALID_JSON

    monkeypatch.setattr("app.services.llm_service._invoke_chain_sync", mock_invoke)
    result = await classify("πόνος στο στήθος", "MTS clinical context")
    assert result["mts_level"] == 2
    assert result["specialty"] == "Καρδιολογία"


async def test_classify_raises_llm_parse_error_on_bad_response(monkeypatch):
    def mock_invoke(symptoms, context, lang="el"):
        return "not json at all"

    monkeypatch.setattr("app.services.llm_service._invoke_chain_sync", mock_invoke)
    with pytest.raises(LLMParseError):
        await classify("πόνος", "context")


async def test_classify_wraps_chain_exception_in_llm_parse_error(monkeypatch):
    def mock_invoke(symptoms, context, lang="el"):
        raise ConnectionError("Ollama unreachable")

    monkeypatch.setattr("app.services.llm_service._invoke_chain_sync", mock_invoke)
    with pytest.raises(LLMParseError, match="LLM service error"):
        await classify("πόνος", "context")


def test_parse_response_accepts_greek_mts_label_when_lang_is_el():
    greek_label = (
        '{"mts_level": 2, "mts_label": "Πολύ Επείγον", '
        '"specialty": "Καρδιολογία", "reasoning": "Πόνος στο στήθος."}'
    )
    result = _parse_response(greek_label, lang="el")
    assert result["mts_label"] == "Πολύ Επείγον"


def test_parse_response_rejects_english_output_when_lang_is_el():
    english_payload = (
        '{"mts_level": 2, "mts_label": "Very Urgent", '
        '"specialty": "Cardiology", "reasoning": "Chest pain with radiation."}'
    )
    with pytest.raises(LLMParseError, match="expected Greek output"):
        _parse_response(english_payload, lang="el")


def test_parse_response_normalizes_english_mts_label_when_lang_is_el():
    mixed_payload = (
        '{"mts_level": 2, "mts_label": "Very Urgent", '
        '"specialty": "Καρδιολογία", "reasoning": "Πόνος στο στήθος."}'
    )
    result = _parse_response(mixed_payload, lang="el")
    assert result["mts_label"] == "Πολύ Επείγον"


def test_parse_response_rejects_greek_reasoning_when_lang_is_en():
    greek_reasoning = (
        '{"mts_level": 2, "mts_label": "Very Urgent", '
        '"specialty": "Cardiology", "reasoning": "Πόνος στο στήθος."}'
    )
    with pytest.raises(LLMParseError, match="expected English output"):
        _parse_response(greek_reasoning, lang="en")


def test_parse_response_translates_greek_specialty_when_lang_is_en():
    greek_specialty = (
        '{"mts_level": 2, "mts_label": "Very Urgent", '
        '"specialty": "Καρδιολογία", "reasoning": "Chest pain with radiation."}'
    )
    result = _parse_response(greek_specialty, lang="en")
    assert result["specialty"] == "Cardiology"


async def test_classify_passes_lang_to_chain(monkeypatch):
    captured = {}

    def mock_invoke(symptoms, context, lang, follow_up_count=0, max_follow_ups=2):
        captured["lang"] = lang
        return VALID_JSON_EN

    monkeypatch.setattr("app.services.llm_service._invoke_chain_sync", mock_invoke)
    result = await classify("chest pain", "MTS clinical context", lang="en")
    assert captured["lang"] == "en"
    assert result["specialty"] == "Cardiology"


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
    mock_llm.assert_called_once_with(symptoms="πόνος", context="", lang="el", follow_up_count=0, max_follow_ups=2)


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


async def test_triage_en_passes_lang_to_llm_and_returns_english_default_on_failure(monkeypatch):
    llm_mock = AsyncMock(side_effect=_LLMParseError("bad"))
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(return_value="ctx"))
    monkeypatch.setattr("app.services.triage_service.llm_classify", llm_mock)

    result = await triage_classify("chest pain", "patient-en-001", lang="en")

    assert result.mts_label == "Urgent"
    assert result.specialty == "General Practice"
    assert "please contact a doctor" in result.reasoning
    llm_mock.assert_called_once_with(symptoms="chest pain", context="ctx", lang="en", follow_up_count=0, max_follow_ups=2)


async def test_triage_en_translates_english_specialty_for_doctor_lookup(monkeypatch):
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(return_value="ctx"))
    monkeypatch.setattr(
        "app.services.triage_service.llm_classify",
        AsyncMock(return_value={
            "mts_level": 2,
            "mts_label": "Very Urgent",
            "specialty": "Cardiology",
            "reasoning": "Chest pain with radiation.",
        }),
    )

    result = await triage_classify("chest pain", "patient-en-002", lang="en")

    assert result.specialty == "Cardiology"
    assert result.doctor.specialty == "Cardiology"
    assert result.doctor.name.startswith("Δρ.")


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


# ── Story: follow-up question tests ──────────────────────────────────────────

from app.schemas.triage import FollowUpResponse as _FollowUpResponse, TriageResponse
from app.core.config import MAX_FOLLOW_UP_QUESTIONS as _MAX_FOLLOW_UP_QUESTIONS


async def test_follow_up_returned_when_llm_asks_and_count_is_zero(monkeypatch):
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(return_value="ctx"))
    monkeypatch.setattr(
        "app.services.triage_service.llm_classify",
        AsyncMock(return_value={"follow_up_question": "Πότε ξεκίνησαν τα συμπτώματα;"}),
    )
    result = await triage_classify("πόνος", "patient-fu-001", follow_up_count=0)
    assert isinstance(result, _FollowUpResponse)
    assert result.type == "follow_up"
    assert result.question == "Πότε ξεκίνησαν τα συμπτώματα;"
    assert result.follow_up_count == 1
    entries = await queue_module.get_all_entries()
    assert len(entries) == 0


async def test_follow_up_bypassed_when_count_at_max(monkeypatch):
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(return_value="ctx"))
    monkeypatch.setattr(
        "app.services.triage_service.llm_classify",
        AsyncMock(return_value={"follow_up_question": "Ερώτηση;"}),
    )
    result = await triage_classify("πόνος", "patient-fu-002", follow_up_count=_MAX_FOLLOW_UP_QUESTIONS)
    assert isinstance(result, TriageResponse)


async def test_enriched_symptoms_includes_conversation_context(monkeypatch):
    captured = {}
    monkeypatch.setattr("app.services.triage_service.retrieve_context", AsyncMock(return_value="ctx"))

    async def capturing_llm(symptoms, context, lang, follow_up_count, max_follow_ups):
        captured["symptoms"] = symptoms
        return _VALID_LLM_RESULT

    monkeypatch.setattr("app.services.triage_service.llm_classify", capturing_llm)
    ctx = "Q: Πότε ξεκίνησαν;\nA: Χθες."
    await triage_classify("πόνος", "patient-fu-003", conversation_context=ctx)
    assert "πόνος" in captured["symptoms"]
    assert ctx in captured["symptoms"]
    assert captured["symptoms"].startswith("πόνος")


async def test_existing_fallback_tiers_unchanged_with_follow_up_params(monkeypatch):
    monkeypatch.setattr(
        "app.services.triage_service.retrieve_context",
        AsyncMock(side_effect=_RAGUnavailableError("down")),
    )
    monkeypatch.setattr(
        "app.services.triage_service.llm_classify",
        AsyncMock(return_value=_VALID_LLM_RESULT),
    )
    result = await triage_classify("πόνος", "patient-fu-004", follow_up_count=0, conversation_context="")
    assert isinstance(result, TriageResponse)
    assert result.rag_used is False
    assert result.mts_level == 2
