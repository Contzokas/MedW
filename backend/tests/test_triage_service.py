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
