"""database.py 유닛 테스트 (Supabase mock)"""

from unittest.mock import patch, MagicMock
import pytest

import database


@pytest.fixture(autouse=True)
def mock_env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://fake.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "fake-key")


def _mock_client_with_existing(existing_rows):
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.in_.return_value.execute.return_value.data = existing_rows
    return mock_client


# ── _get_client 환경변수 검증 ─────────────────────────────────

def test_get_client_missing_env_raises(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "")
    monkeypatch.setenv("SUPABASE_KEY", "  ")
    with pytest.raises(RuntimeError) as exc:
        database._get_client()
    assert "SUPABASE_URL" in str(exc.value)
    assert "SUPABASE_KEY" in str(exc.value)


# ── filter_new_notices ────────────────────────────────────────

def test_filter_new_notices_empty_input():
    assert database.filter_new_notices([]) == []


def test_filter_new_notices_all_new():
    mock_client = _mock_client_with_existing([])

    with patch("database.create_client", return_value=mock_client):
        result = database.filter_new_notices(["id1", "id2", "id3"])

    assert set(result) == {"id1", "id2", "id3"}


def test_filter_new_notices_some_existing():
    mock_client = _mock_client_with_existing([{"id": "id1"}])

    with patch("database.create_client", return_value=mock_client):
        result = database.filter_new_notices(["id1", "id2", "id3"])

    assert "id1" not in result
    assert set(result) == {"id2", "id3"}


def test_filter_new_notices_all_existing():
    mock_client = _mock_client_with_existing([{"id": "id1"}, {"id": "id2"}])

    with patch("database.create_client", return_value=mock_client):
        result = database.filter_new_notices(["id1", "id2"])

    assert result == []


# ── save_notice ───────────────────────────────────────────────

def test_save_notice_calls_upsert():
    mock_client = MagicMock()

    with patch("database.create_client", return_value=mock_client):
        database.save_notice(
            notice_id="abc",
            source="포털-학사공지",
            title="테스트",
            url="https://example.com",
            date="2026-04-14",
            summary="요약",
        )

    mock_client.table.assert_called_with("notices")
    mock_client.table.return_value.upsert.assert_called_once()
    upsert_args = mock_client.table.return_value.upsert.call_args[0][0]
    assert upsert_args["id"] == "abc"
    assert upsert_args["source"] == "포털-학사공지"


# ── 관심 키워드 구독 ──────────────────────────────────────────

def _mock_client_with_keywords(keywords):
    mock_client = MagicMock()
    table = mock_client.table.return_value
    table.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {"keyword": k} for k in keywords
    ]
    return mock_client


def test_normalize_keyword_collapses_whitespace():
    assert database.normalize_keyword("  현장\n 실습  ") == "현장 실습"


def test_add_keyword_upserts_normalized():
    mock_client = _mock_client_with_keywords([])

    with patch("database.create_client", return_value=mock_client):
        saved = database.add_keyword("111", "  인턴십 ")

    assert saved == "인턴십"
    mock_client.table.return_value.upsert.assert_called_once_with(
        {"discord_user_id": "111", "keyword": "인턴십"}
    )


@pytest.mark.parametrize("keyword", ["", "   ", "가" * (database.MAX_KEYWORD_LENGTH + 1)])
def test_add_keyword_rejects_invalid(keyword):
    mock_client = _mock_client_with_keywords([])

    with patch("database.create_client", return_value=mock_client):
        with pytest.raises(ValueError):
            database.add_keyword("111", keyword)

    mock_client.table.return_value.upsert.assert_not_called()


def test_add_keyword_rejects_over_limit():
    existing = [f"키워드{i}" for i in range(database.MAX_KEYWORDS_PER_USER)]
    mock_client = _mock_client_with_keywords(existing)

    with patch("database.create_client", return_value=mock_client):
        with pytest.raises(ValueError):
            database.add_keyword("111", "새키워드")
        # 이미 등록된 키워드를 다시 등록하는 건 한도와 무관하게 허용
        assert database.add_keyword("111", "키워드0") == "키워드0"


def test_remove_keyword_reports_whether_deleted():
    mock_client = MagicMock()
    delete_exec = mock_client.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute

    with patch("database.create_client", return_value=mock_client):
        delete_exec.return_value.data = [{"keyword": "인턴십"}]
        assert database.remove_keyword("111", "인턴십") is True
        delete_exec.return_value.data = []
        assert database.remove_keyword("111", "없는키워드") is False


def test_fetch_keyword_subscriptions_groups_by_keyword():
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.range.return_value.execute.return_value.data = [
        {"discord_user_id": "111", "keyword": "인턴십"},
        {"discord_user_id": "222", "keyword": "인턴십"},
        {"discord_user_id": "111", "keyword": "장학금"},
    ]

    with patch("database.create_client", return_value=mock_client):
        result = database.fetch_keyword_subscriptions()

    assert result == {"인턴십": ["111", "222"], "장학금": ["111"]}
