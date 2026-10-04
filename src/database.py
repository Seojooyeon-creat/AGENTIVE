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
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_KEY", "").strip()
    missing = [
        name
        for name, value in (("SUPABASE_URL", url), ("SUPABASE_KEY", key))
        if not value
    ]
    if missing:
        raise RuntimeError(
            f"환경변수가 비어 있습니다: {', '.join(missing)}. "
            "GitHub Secrets(또는 로컬 .env)에 값을 설정하세요."
        )
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
    apply_start: str | None = None,
    apply_deadline: str | None = None,
    activity_start: str | None = None,
    activity_end: str | None = None,
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
            "apply_start": apply_start,
            "apply_deadline": apply_deadline,
            "activity_start": activity_start,
            "activity_end": activity_end,
        }
    ).execute()


# ── 관심 키워드 구독 ──────────────────────────────────────────

MAX_KEYWORDS_PER_USER = 10
MAX_KEYWORD_LENGTH = 20
_PAGE_SIZE = 1000  # Supabase 기본 응답 행 수 제한


def normalize_keyword(keyword: str) -> str:
    """앞뒤·중복 공백과 개행 제거 (요약 프롬프트에 그대로 들어가는 값)"""
    return " ".join(keyword.split())


def list_keywords(user_id: str) -> list[str]:
    """유저가 등록한 키워드 목록"""
    client = _get_client()
    result = (
        client.table("user_keywords")
        .select("keyword")
        .eq("discord_user_id", user_id)
        .order("created_at")
        .execute()
    )
    return [row["keyword"] for row in (result.data or [])]


def add_keyword(user_id: str, keyword: str) -> str:
    """키워드 등록 후 정규화된 키워드를 반환. 입력이 잘못되면 ValueError(사용자 안내 문구)"""
    keyword = normalize_keyword(keyword)
    if not keyword:
        raise ValueError("키워드를 입력해주세요.")
    if len(keyword) > MAX_KEYWORD_LENGTH:
        raise ValueError(f"키워드는 {MAX_KEYWORD_LENGTH}자 이내로 입력해주세요.")

    existing = list_keywords(user_id)
    if keyword not in existing and len(existing) >= MAX_KEYWORDS_PER_USER:
        raise ValueError(f"키워드는 최대 {MAX_KEYWORDS_PER_USER}개까지 등록할 수 있어요.")

    client = _get_client()
    client.table("user_keywords").upsert(
        {"discord_user_id": user_id, "keyword": keyword}
    ).execute()
    return keyword


def remove_keyword(user_id: str, keyword: str) -> bool:
    """키워드 삭제. 등록돼 있던 키워드를 지웠으면 True"""
    client = _get_client()
    result = (
        client.table("user_keywords")
        .delete()
        .eq("discord_user_id", user_id)
        .eq("keyword", normalize_keyword(keyword))
        .execute()
    )
    return bool(result.data)


def fetch_keyword_subscriptions() -> dict[str, list[str]]:
    """전체 구독 현황을 {키워드: [유저 ID, ...]} 로 반환"""
    client = _get_client()
    subscriptions: dict[str, list[str]] = {}
    offset = 0
    while True:
        result = (
            client.table("user_keywords")
            .select("discord_user_id, keyword")
            .range(offset, offset + _PAGE_SIZE - 1)
            .execute()
        )
        rows = result.data or []
        for row in rows:
            subscriptions.setdefault(row["keyword"], []).append(row["discord_user_id"])
        if len(rows) < _PAGE_SIZE:
            return subscriptions
        offset += _PAGE_SIZE
