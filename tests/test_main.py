"""main.py 유닛 테스트"""

from crawlers.portal import Notice
from main import build_discord_embed, post_to_discord


def _make_notice(source="포털-학사공지", date="2026-04-14"):
    return Notice(
        id="abc123",
        source=source,
        title="테스트 공지",
        url="https://plus.cnu.ac.kr/notice/1",
        date=date,
        content="공지 본문",
    )


# ── build_discord_embed ───────────────────────────────────────

def test_embed_portal_emoji_and_color():
    embed = build_discord_embed(_make_notice(source="포털-학사공지"), "요약 내용")
    assert "🏫" in embed["title"]
    assert embed["color"] == 0x0066CC


def test_embed_dept_emoji_and_color():
    embed = build_discord_embed(_make_notice(source="학과-학부공지"), "요약 내용")
    assert "💻" in embed["title"]
    assert embed["color"] == 0x00AA44


def test_embed_unknown_source_fallback_emoji():
    embed = build_discord_embed(_make_notice(source="기타-공지"), "요약")
    assert "📢" in embed["title"]


def test_embed_url_and_description():
    embed = build_discord_embed(_make_notice(), "핵심 요약")
    assert embed["url"] == "https://plus.cnu.ac.kr/notice/1"
    assert embed["description"] == "핵심 요약"


def test_embed_footer_with_date():
    embed = build_discord_embed(_make_notice(date="2026-04-14"), "요약")
    assert "2026-04-14" in embed["footer"]["text"]


def test_embed_footer_without_date():
    embed = build_discord_embed(_make_notice(date=None), "요약")
    assert "날짜 미상" in embed["footer"]["text"]


# ── post_to_discord ───────────────────────────────────────────

def test_post_to_discord_chunks_by_10(monkeypatch):
    """11개 embed → requests.post 2번 호출"""
    import requests as req
    calls = []

    def fake_post(url, **kwargs):
        import json
        payload = json.loads(kwargs["data"])
        calls.append(len(payload["embeds"]))
        mock = type("R", (), {"ok": True})()
        return mock

    monkeypatch.setattr(req, "post", fake_post)

    embeds = [{"title": f"공지 {i}"} for i in range(11)]
    post_to_discord(embeds)

    assert calls == [10, 1]
