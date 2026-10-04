"""main.py 유닛 테스트"""

from datetime import datetime, timedelta

from crawlers.models import Notice
from summarizer import NoticeSummary
from main import (
    build_discord_embed,
    build_keyword_dms,
    post_keyword_dms,
    post_to_discord,
    _parse_notice_date,
    _is_apply_closed,
)


def _make_notice(source="포털-학사공지", date="2026-04-14"):
    return Notice(
        id="abc123",
        source=source,
        title="테스트 공지",
        url="https://plus.cnu.ac.kr/notice/1",
        date=date,
        content="공지 본문",
    )


def _make_summary(**kwargs):
    return NoticeSummary(summary=kwargs.pop("summary", "요약 내용"), **kwargs)


# ── build_discord_embed ───────────────────────────────────────

def test_embed_portal_emoji_and_color():
    embed = build_discord_embed(_make_notice(source="포털-학사공지"), _make_summary())
    assert "🏫" in embed["title"]
    assert embed["color"] == 0x0066CC


def test_embed_dept_emoji_and_color():
    embed = build_discord_embed(_make_notice(source="학과-학부공지"), _make_summary())
    assert "💻" in embed["title"]
    assert embed["color"] == 0x00AA44


def test_embed_unknown_source_fallback_emoji():
    embed = build_discord_embed(_make_notice(source="기타-공지"), _make_summary())
    assert "📢" in embed["title"]


def test_embed_url_and_summary():
    embed = build_discord_embed(_make_notice(), _make_summary(summary="핵심 요약"))
    assert embed["url"] == "https://plus.cnu.ac.kr/notice/1"
    assert "핵심 요약" in embed["description"]


def test_embed_optional_fields_included():
    ns = _make_summary(
        apply_period="2026.04.01 ~ 2026.04.30",
        activity_period="2026.05.01 ~ 2026.05.31",
        action="포털에서 신청",
    )
    embed = build_discord_embed(_make_notice(), ns)
    assert "신청 기간" in embed["description"]
    assert "활동 기간" in embed["description"]
    assert "할 일" in embed["description"]


def test_embed_optional_fields_omitted():
    embed = build_discord_embed(_make_notice(), _make_summary())
    assert "신청 기간" not in embed["description"]
    assert "활동 기간" not in embed["description"]


def test_embed_footer_with_date():
    embed = build_discord_embed(_make_notice(date="2026-04-14"), _make_summary())
    assert "2026-04-14" in embed["footer"]["text"]


def test_embed_footer_without_date():
    embed = build_discord_embed(_make_notice(date=None), _make_summary())
    assert "날짜 미상" in embed["footer"]["text"]


# ── post_to_discord ───────────────────────────────────────────

def test_post_to_discord_chunks_by_10(monkeypatch):
    """11개 embed → requests.post 2번 호출"""
    import requests as req
    calls = []

    def fake_post(url, **kwargs):
        calls.append((url, len(kwargs["json"]["embeds"])))
        return type("R", (), {"ok": True})()

    monkeypatch.setattr(req, "post", fake_post)

    embeds = [{"title": f"공지 {i}"} for i in range(11)]
    post_to_discord({"https://discord.test/hook": embeds})

    assert [n for _, n in calls] == [10, 1]


def test_post_to_discord_routes_per_webhook(monkeypatch):
    import requests as req
    calls = []

    def fake_post(url, **kwargs):
        calls.append(url)
        return type("R", (), {"ok": True})()

    monkeypatch.setattr(req, "post", fake_post)

    post_to_discord({
        "https://discord.test/a": [{"title": "1"}],
        "https://discord.test/b": [{"title": "2"}],
    })

    assert calls == ["https://discord.test/a", "https://discord.test/b"]


# ── _parse_notice_date ────────────────────────────────────────

def test_parse_date_four_digit_year():
    assert _parse_notice_date("2026-06-20") == datetime(2026, 6, 20)
    assert _parse_notice_date("2026.06.20") == datetime(2026, 6, 20)


def test_parse_date_two_digit_year():
    assert _parse_notice_date("26.06.20") == datetime(2026, 6, 20)


def test_parse_date_from_apply_period_text():
    assert _parse_notice_date("신청기간 2026.04.01 ~ 2026.04.30") == datetime(2026, 4, 1)


def test_parse_date_invalid():
    assert _parse_notice_date(None) is None
    assert _parse_notice_date("") is None
    assert _parse_notice_date("날짜 아님") is None
    assert _parse_notice_date("2026.13.45") is None


# ── _is_apply_closed ──────────────────────────────────────────

def test_apply_closed_past_deadline():
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    assert _is_apply_closed(yesterday) is True


def test_apply_open_today_and_future():
    today = datetime.now().strftime("%Y-%m-%d")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    assert _is_apply_closed(today) is False
    assert _is_apply_closed(tomorrow) is False


def test_apply_open_when_deadline_unknown():
    assert _is_apply_closed(None) is False
    assert _is_apply_closed("마감일 미상") is False


# ── 키워드 DM ─────────────────────────────────────────────────

def test_build_keyword_dms_groups_per_user():
    embed_a, embed_b = {"title": "A"}, {"title": "B"}
    subscriptions = {"인턴십": ["111", "222"], "장학금": ["111"]}

    dms = build_keyword_dms(
        [(embed_a, ["인턴십", "장학금"]), (embed_b, ["장학금"])],
        subscriptions,
    )

    # 111: 두 공지 모두, 222: 인턴십 공지만. 공지당 embed는 유저별 1개
    assert [e["title"] for e in dms["111"]] == ["A", "B"]
    assert [e["title"] for e in dms["222"]] == ["A"]
    assert dms["111"][0]["author"]["name"] == "🔔 키워드: 인턴십, 장학금"
    assert dms["222"][0]["author"]["name"] == "🔔 키워드: 인턴십"
    # 채널용 원본 embed는 건드리지 않는다
    assert "author" not in embed_a


def test_build_keyword_dms_ignores_keywords_without_subscribers():
    assert build_keyword_dms([({"title": "A"}, ["공모전"])], {"인턴십": ["111"]}) == {}


def test_post_keyword_dms_skips_without_token(monkeypatch):
    import requests as req
    calls = []
    monkeypatch.setattr(req, "post", lambda *a, **k: calls.append(a))
    monkeypatch.delenv("DISCORD_BOT_TOKEN", raising=False)

    post_keyword_dms({"111": [{"title": "A"}]})

    assert calls == []


def test_post_keyword_dms_opens_channel_then_sends(monkeypatch):
    import requests as req
    calls = []

    def fake_post(url, **kwargs):
        calls.append((url, kwargs["headers"]["Authorization"], kwargs["json"]))
        return type("R", (), {"ok": True, "status_code": 200, "json": lambda self: {"id": "999"}})()

    monkeypatch.setattr(req, "post", fake_post)
    monkeypatch.setenv("DISCORD_BOT_TOKEN", "test-token")

    post_keyword_dms({"111": [{"title": "A"}]})

    assert calls == [
        ("https://discord.com/api/v10/users/@me/channels", "Bot test-token", {"recipient_id": "111"}),
        ("https://discord.com/api/v10/channels/999/messages", "Bot test-token", {"embeds": [{"title": "A"}]}),
    ]
