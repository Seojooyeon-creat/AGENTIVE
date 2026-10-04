"""summarizer.py 유닛 테스트 (Claude API mock)"""

import json
from unittest.mock import patch, MagicMock

import summarizer


def _mock_anthropic(response_text: str):
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text=response_text)]
    return patch("summarizer.anthropic.Anthropic", return_value=mock_client), mock_client


def test_summarize_parses_fields():
    patcher, _ = _mock_anthropic(json.dumps({"summary": "요약", "apply_deadline": "2026-04-30"}))
    with patcher:
        ns = summarizer.summarize_notice("제목", "본문")

    assert ns.summary == "요약"
    assert ns.apply_deadline == "2026-04-30"
    assert ns.matched_keywords == []


def test_summarize_passes_keywords_and_keeps_registered_matches():
    """모델이 목록에 없는 키워드를 반환해도 등록된 키워드만 남긴다"""
    response = json.dumps({"summary": "요약", "matched_keywords": ["인턴십", "지어낸키워드", 3]})
    patcher, mock_client = _mock_anthropic(response)
    with patcher:
        ns = summarizer.summarize_notice("현장실습 모집", "본문", ["인턴십", "장학금"])

    assert ns.matched_keywords == ["인턴십"]
    user_message = mock_client.messages.create.call_args.kwargs["messages"][0]["content"]
    assert '등록 키워드: ["인턴십", "장학금"]' in user_message


def test_summarize_without_keywords_omits_keyword_list():
    patcher, mock_client = _mock_anthropic(json.dumps({"summary": "요약", "matched_keywords": ["인턴십"]}))
    with patcher:
        ns = summarizer.summarize_notice("제목", "본문")

    assert ns.matched_keywords == []
    user_message = mock_client.messages.create.call_args.kwargs["messages"][0]["content"]
    assert "등록 키워드" not in user_message


def test_summarize_invalid_json_falls_back_to_raw_text():
    patcher, _ = _mock_anthropic("JSON이 아닌 응답")
    with patcher:
        ns = summarizer.summarize_notice("제목", "본문", ["인턴십"])

    assert ns.summary == "JSON이 아닌 응답"
    assert ns.matched_keywords == []
