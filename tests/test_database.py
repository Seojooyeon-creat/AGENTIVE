"""database.py 유닛 테스트 (Supabase mock)"""

from unittest.mock import patch, MagicMock
import os
import pytest


@pytest.fixture(autouse=True)
def mock_env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://fake.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "fake-key")


# ── filter_new_notices ────────────────────────────────────────

def test_filter_new_notices_empty_input():
    from database import filter_new_notices
    assert filter_new_notices([]) == []


def test_filter_new_notices_all_new():
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.in_.return_value.execute.return_value.data = []

    with patch("database.create_client", return_value=mock_client):
        from importlib import reload
        import database
        reload(database)
        result = database.filter_new_notices(["id1", "id2", "id3"])

    assert set(result) == {"id1", "id2", "id3"}


def test_filter_new_notices_some_existing():
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"id": "id1"}
    ]

    with patch("database.create_client", return_value=mock_client):
        from importlib import reload
        import database
        reload(database)
        result = database.filter_new_notices(["id1", "id2", "id3"])

    assert "id1" not in result
    assert set(result) == {"id2", "id3"}


def test_filter_new_notices_all_existing():
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"id": "id1"},
        {"id": "id2"},
    ]

    with patch("database.create_client", return_value=mock_client):
        from importlib import reload
        import database
        reload(database)
        result = database.filter_new_notices(["id1", "id2"])

    assert result == []


# ── save_notice ───────────────────────────────────────────────

def test_save_notice_calls_upsert():
    mock_client = MagicMock()

    with patch("database.create_client", return_value=mock_client):
        from importlib import reload
        import database
        reload(database)
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
