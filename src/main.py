"""크롤링 → 요약 → 디스코드 알림 파이프라인 (GitHub Actions에서 실행)"""

import os
import json
import requests
from dotenv import load_dotenv

from crawlers.portal import fetch_portal_notices
from crawlers.department import fetch_department_notices
from database import filter_new_notices, save_notice
from summarizer import summarize_notice

load_dotenv()

WEBHOOK_URL = os.environ["DISCORD_WEBHOOK_URL"]

# 출처별 이모지
SOURCE_EMOJI = {
    "포털": "🏫",
    "학과": "💻",
}


def build_discord_embed(notice, summary: str) -> dict:
    """Discord embed 메시지 생성"""
    source_prefix = notice.source.split("-")[0]
    emoji = SOURCE_EMOJI.get(source_prefix, "📢")

    color = 0x0066CC if source_prefix == "포털" else 0x00AA44

    embed = {
        "title": f"{emoji} {notice.title}",
        "url": notice.url,
        "description": summary,
        "color": color,
        "footer": {"text": f"{notice.source}  |  {notice.date or '날짜 미상'}"},
    }
    return embed


def post_to_discord(embeds: list[dict]) -> None:
    """Discord 웹훅으로 메시지 전송 (최대 10개 embed/요청)"""
    # Discord는 한 요청에 최대 10개 embed
    for i in range(0, len(embeds), 10):
        chunk = embeds[i : i + 10]
        payload = {"embeds": chunk}
        resp = requests.post(
            WEBHOOK_URL,
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload),
            timeout=10,
        )
        if not resp.ok:
            print(f"[Discord] 전송 실패: {resp.status_code} {resp.text}")
        else:
            print(f"[Discord] {len(chunk)}개 공지 전송 완료")


def run_pipeline() -> None:
    print("=== AGENTIVE 크롤링 파이프라인 시작 ===")

    # 1. 크롤링
    print("[1] 공지 수집 중...")
    portal_notices = fetch_portal_notices(max_per_board=10)
    dept_notices = fetch_department_notices(max_per_board=10)
    all_notices = portal_notices + dept_notices
    print(f"    수집: 포털 {len(portal_notices)}건, 학과 {len(dept_notices)}건")

    if not all_notices:
        print("    수집된 공지 없음. 종료.")
        return

    # 2. 중복 필터링
    print("[2] 중복 필터링...")
    all_ids = [n.id for n in all_notices]
    new_ids = set(filter_new_notices(all_ids))
    new_notices = [n for n in all_notices if n.id in new_ids]
    print(f"    신규 공지: {len(new_notices)}건")

    if not new_notices:
        print("    새로운 공지 없음. 종료.")
        return

    # 3. 요약 & Discord 전송
    print("[3] 요약 및 디스코드 전송...")
    embeds = []
    for notice in new_notices:
        print(f"    → {notice.source}: {notice.title[:40]}")
        try:
            summary = summarize_notice(notice.title, notice.content)
            save_notice(
                notice_id=notice.id,
                source=notice.source,
                title=notice.title,
                url=notice.url,
                date=notice.date,
                summary=summary,
            )
            embeds.append(build_discord_embed(notice, summary))
        except Exception as e:
            print(f"      [오류] {e}")

    if embeds:
        post_to_discord(embeds)

    print(f"=== 완료: {len(embeds)}건 전송 ===")


if __name__ == "__main__":
    run_pipeline()
