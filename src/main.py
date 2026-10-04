"""크롤링 → 요약 → 디스코드 알림 파이프라인 (GitHub Actions에서 실행)"""

import os
import re
import requests
from dataclasses import dataclass
from datetime import datetime
from dotenv import load_dotenv

from crawlers.models import Notice
from crawlers.portal import fetch_portal_notices
from crawlers.department import fetch_department_notices
from crawlers.with_cnu import fetch_with_cnu_programs
from database import filter_new_notices, save_notice, fetch_keyword_subscriptions
from discord_dm import send_dm
from summarizer import summarize_notice, NoticeSummary

load_dotenv()

DISCORD_EMBED_LIMIT = 10  # 요청당 최대 embed 수 (Discord API 제한)


def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(
            f"환경변수가 비어 있습니다: {name}. "
            "GitHub Secrets(또는 로컬 .env)에 값을 설정하세요."
        )
    return value


WEBHOOK_URL = _require_env("DISCORD_WEBHOOK_URL")
WEBHOOK_URL_WITHCNU = _require_env("DISCORD_WEBHOOK_URL_WITHCNU")
WEBHOOK_URL_SOFT = _require_env("DISCORD_WEBHOOK_URL_SOFT")


@dataclass(frozen=True)
class SourceConfig:
    emoji: str
    color: int
    webhook_url: str


# 출처 prefix(source의 '-' 앞부분)별 표시·전송 설정
SOURCE_CONFIGS = {
    "포털": SourceConfig("🏫", 0x0066CC, WEBHOOK_URL),
    "학과": SourceConfig("💻", 0x00AA44, WEBHOOK_URL),
    "비교과": SourceConfig("🎓", 0xE67E22, WEBHOOK_URL_WITHCNU),
    "소중대": SourceConfig("🚀", 0x9B59B6, WEBHOOK_URL_SOFT),
}
DEFAULT_SOURCE_CONFIG = SourceConfig("📢", 0x0066CC, WEBHOOK_URL)


def _source_config(source: str) -> SourceConfig:
    return SOURCE_CONFIGS.get(source.split("-")[0], DEFAULT_SOURCE_CONFIG)


def _parse_notice_date(date_str: str | None) -> datetime | None:
    """공지 날짜 문자열을 datetime으로 파싱 (정렬용).

    출처마다 형식이 달라 여러 케이스를 처리한다.
      - 학과/소중대: "26.06.20" (YY.MM.DD)
      - 비교과:      "신청기간 2026.04.01 ~ ..." → 첫 날짜 추출
      - 포털:        "2026-06-20" / "2026.06.20" 등
    파싱 불가 시 None.
    """
    if not date_str:
        return None
    s = date_str.strip()

    # 4자리 연도 (YYYY.MM.DD / YYYY-MM-DD / 신청기간 텍스트 내부 포함)
    m = re.search(r"(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})", s)
    if m:
        try:
            return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None

    # 2자리 연도 (YY.MM.DD)
    m = re.search(r"(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})", s)
    if m:
        try:
            return datetime.strptime(f"{m.group(1)}.{m.group(2)}.{m.group(3)}", "%y.%m.%d")
        except ValueError:
            return None

    return None


def _is_apply_closed(apply_deadline: str | None) -> bool:
    """신청 마감일(ISO YYYY-MM-DD)이 오늘보다 이전이면 True (신청기간 종료).

    마감일을 알 수 없으면(None/파싱 불가) 종료로 보지 않고 전송한다.
    """
    if not apply_deadline:
        return False
    try:
        deadline = datetime.fromisoformat(apply_deadline.strip()).date()
    except ValueError:
        return False
    return deadline < datetime.now().date()


def build_discord_embed(notice: Notice, ns: NoticeSummary) -> dict:
    """Discord embed 메시지 생성"""
    config = _source_config(notice.source)

    parts = [f"📌 **핵심 내용**: {ns.summary}"]
    if ns.apply_period:
        parts.append(f"📝 **신청 기간**: {ns.apply_period}")
    if ns.activity_period:
        parts.append(f"🗓️ **활동 기간**: {ns.activity_period}")
    if ns.action:
        parts.append(f"✅ **할 일**: {ns.action}")

    return {
        "title": f"{config.emoji} {notice.title}",
        "url": notice.url,
        "description": "\n".join(parts),
        "color": config.color,
        "footer": {"text": f"{notice.source}  |  {notice.date or '날짜 미상'}"},
    }


def post_to_discord(embeds_by_webhook: dict[str, list[dict]]) -> None:
    """출처별 Discord 웹훅으로 메시지 전송 (최대 10개 embed/요청)"""
    for webhook_url, embeds in embeds_by_webhook.items():
        for i in range(0, len(embeds), DISCORD_EMBED_LIMIT):
            chunk = embeds[i : i + DISCORD_EMBED_LIMIT]
            resp = requests.post(webhook_url, json={"embeds": chunk}, timeout=10)
            if not resp.ok:
                print(f"[Discord] 전송 실패: {resp.status_code} {resp.text}")
            else:
                print(f"[Discord] {len(chunk)}개 공지 전송 완료")


def build_keyword_dms(
    matched: list[tuple[dict, list[str]]],
    subscriptions: dict[str, list[str]],
) -> dict[str, list[dict]]:
    """키워드 매칭 결과를 유저별 DM embed 목록으로 변환.

    matched: (공지 embed, 그 공지와 관련된 키워드 목록)
    subscriptions: {키워드: [유저 ID, ...]}
    각 embed에는 그 유저가 등록한 키워드 중 매칭된 것만 표시한다.
    """
    dms: dict[str, list[dict]] = {}
    for embed, keywords in matched:
        keywords_by_user: dict[str, list[str]] = {}
        for keyword in keywords:
            for user_id in subscriptions.get(keyword, []):
                keywords_by_user.setdefault(user_id, []).append(keyword)
        for user_id, user_keywords in keywords_by_user.items():
            dms.setdefault(user_id, []).append(
                {**embed, "author": {"name": f"🔔 키워드: {', '.join(user_keywords)}"}}
            )
    return dms


def post_keyword_dms(dms: dict[str, list[dict]]) -> None:
    """유저별로 키워드 매칭 공지를 DM 전송 (최대 10개 embed/메시지)"""
    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    if not token:
        print("[키워드] DISCORD_BOT_TOKEN 미설정 — DM 전송 생략")
        return

    sent = 0
    for user_id, embeds in dms.items():
        for i in range(0, len(embeds), DISCORD_EMBED_LIMIT):
            if send_dm(token, user_id, {"embeds": embeds[i : i + DISCORD_EMBED_LIMIT]}):
                sent += 1
    print(f"[키워드] {len(dms)}명 대상 DM {sent}건 전송 완료")


def _load_keyword_subscriptions() -> dict[str, list[str]]:
    """키워드 구독 현황 조회. 키워드 DM은 부가 기능이므로 실패해도 파이프라인은 계속한다."""
    try:
        return fetch_keyword_subscriptions()
    except Exception as e:
        print(f"    [키워드] 구독 조회 실패 — DM 생략: {e}")
        return {}


def _collect_notices() -> list[Notice]:
    """모든 출처에서 공지 수집 + 출처별 건수 출력"""
    portal_notices = fetch_portal_notices()
    dept_notices = fetch_department_notices()
    withcnu_notices = fetch_with_cnu_programs()
    all_notices = portal_notices + dept_notices + withcnu_notices

    counts = {
        "포털": len(portal_notices),
        "학과": sum(n.source.startswith("학과") for n in dept_notices),
        "소중대": sum(n.source.startswith("소중대") for n in dept_notices),
        "비교과": len(withcnu_notices),
    }
    print("    수집: " + ", ".join(f"{name} {count}건" for name, count in counts.items()))
    return all_notices


def _summarize_and_save(notice: Notice, keywords: list[str] | None = None) -> NoticeSummary:
    """공지 요약 후 DB 저장 (신규 공지 재처리 방지)"""
    ns = summarize_notice(notice.title, notice.content, keywords)
    save_notice(
        notice_id=notice.id,
        source=notice.source,
        title=notice.title,
        url=notice.url,
        date=notice.date,
        summary=ns.summary,
        apply_start=ns.apply_start,
        apply_deadline=ns.apply_deadline,
        activity_start=ns.activity_start,
        activity_end=ns.activity_end,
    )
    return ns


def run_pipeline() -> None:
    print("=== AGENTIVE 크롤링 파이프라인 시작 ===")

    # 1. 크롤링
    print("[1] 공지 수집 중...")
    all_notices = _collect_notices()

    if not all_notices:
        print("    수집된 공지 없음. 종료.")
        return

    # 2. 중복 필터링
    print("[2] 중복 필터링...")
    new_ids = set(filter_new_notices([n.id for n in all_notices]))
    new_notices = [n for n in all_notices if n.id in new_ids]
    print(f"    신규 공지: {len(new_notices)}건")

    if not new_notices:
        print("    새로운 공지 없음. 종료.")
        return

    # 2-1. 공지 등록일 내림차순 정렬 (최신 → 과거)
    #   가장 최근에 등록된 공지부터 순서대로 전송한다.
    #   날짜 파싱이 안 되는 공지(예: 비교과)는 맨 뒤로 보낸다.
    new_notices.sort(key=lambda n: _parse_notice_date(n.date) or datetime.min, reverse=True)

    # 3. 요약 & Discord 전송 (웹훅별로 embed 묶기)
    print("[3] 요약 및 디스코드 전송...")
    subscriptions = _load_keyword_subscriptions()
    keywords = sorted(subscriptions)
    embeds_by_webhook: dict[str, list[dict]] = {}
    keyword_matched: list[tuple[dict, list[str]]] = []
    total = 0
    for notice in new_notices:
        print(f"    → {notice.source}: {notice.title[:40]}")
        try:
            ns = _summarize_and_save(notice, keywords)

            # 신청기간이 끝난 공지는 전송하지 않음 (저장은 위에서 완료 → 재처리 방지)
            if _is_apply_closed(ns.apply_deadline):
                print(f"      [건너뜀] 신청기간 종료 (마감 {ns.apply_deadline})")
                continue

            embed = build_discord_embed(notice, ns)
            webhook = _source_config(notice.source).webhook_url
            embeds_by_webhook.setdefault(webhook, []).append(embed)
            if ns.matched_keywords:
                keyword_matched.append((embed, ns.matched_keywords))
            total += 1
        except Exception as e:
            print(f"      [오류] {e}")

    if embeds_by_webhook:
        post_to_discord(embeds_by_webhook)

    # 키워드를 등록한 유저에게는 관련 공지를 DM으로 한 번 더 전달 (채널 전송은 그대로 유지)
    keyword_dms = build_keyword_dms(keyword_matched, subscriptions)
    if keyword_dms:
        post_keyword_dms(keyword_dms)

    print(f"=== 완료: {total}건 전송 ===")


if __name__ == "__main__":
    run_pipeline()
