"""Supabase 연동 — 중복 공지 방지 및 이력 저장

Supabase 테이블 스키마 (한 번만 실행):
    CREATE TABLE notices (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        date TEXT,
        summary TEXT,
        posted_at TIMESTAMPTZ DEFAULT NOW()
    );
"""

import os
from supabase import create_client, Client


def _get_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_KEY"]
    return create_client(url, key)


def filter_new_notices(notice_ids: list[str]) -> list[str]:
    """이미 DB에 저장된 ID를 제외하고 새 공지 ID만 반환"""
    if not notice_ids:
        return []

    client = _get_client()
    result = (
        client.table("notices")
        .select("id")
        .in_("id", notice_ids)
        .execute()
    )
    existing_ids = {row["id"] for row in (result.data or [])}
    return [nid for nid in notice_ids if nid not in existing_ids]


def save_notice(
    notice_id: str,
    source: str,
    title: str,
    url: str,
    date: str | None,
    summary: str,
) -> None:
    """공지를 DB에 저장"""
    client = _get_client()
    client.table("notices").upsert(
        {
            "id": notice_id,
            "source": source,
            "title": title,
            "url": url,
            "date": date,
            "summary": summary,
        }
    ).execute()
