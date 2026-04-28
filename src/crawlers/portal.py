"""충남대학교 포털 공지사항 크롤러"""

import hashlib
import requests
from bs4 import BeautifulSoup
from dataclasses import dataclass
from typing import Optional

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

# 충남대 포털 공지사항 게시판
# 링크가 ./?mode=V&no=... 형태라 base_url = 게시판 디렉터리 경로
NOTICE_BOARDS = []  # 포털 사이트 응답 느림 — 필요시 다시 추가


@dataclass
class Notice:
    id: str          # 중복 방지용 고유 ID (URL 해시)
    source: str      # 출처 (예: '포털-학사공지')
    title: str
    url: str
    date: Optional[str]
    content: str     # 본문 (요약 전 원문)


def _make_id(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()


def _fetch_notice_content(url: str, timeout: int = 10) -> str:
    """개별 공지 본문을 가져옴"""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        # 포털 본문 영역 (실제 선택자는 사이트 구조에 따라 조정 필요)
        content_area = (
            soup.select_one(".board_view_content")
            or soup.select_one(".view_content")
            or soup.select_one(".cont_wrap")
            or soup.find("div", class_=lambda c: c and "content" in c.lower())
        )
        if content_area:
            return content_area.get_text(separator="\n", strip=True)[:3000]
        return ""
    except Exception:
        return ""


def fetch_portal_notices() -> list[Notice]:
    """포털 전체 공지사항 목록을 크롤링"""
    notices: list[Notice] = []

    for board in NOTICE_BOARDS:
        try:
            resp = requests.get(board["url"], headers=HEADERS, timeout=15)
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"[포털 크롤러] {board['name']} 요청 실패: {e}")
            continue

        soup = BeautifulSoup(resp.text, "lxml")

        # 테이블 행 파싱 (class 없는 순수 table)
        rows = soup.select("table tbody tr")

        for row in rows:
            tds = row.find_all("td")
            if not tds:
                continue

            # 1번째 td가 "공지" 텍스트면 고정 공지 → 스킵
            if tds[0].get_text(strip=True) == "공지":
                continue

            # 2번째 td에서 제목 링크 추출
            if len(tds) < 2:
                continue
            link_tag = tds[1].select_one("a")
            if not link_tag:
                continue

            title = link_tag.get_text(strip=True)
            href = link_tag.get("href", "")
            if not href:
                continue

            # ./?mode=V&no=... → https://plus.cnu.ac.kr/_prog/_board/?mode=V&no=...
            if href.startswith("http"):
                full_url = href
            elif href.startswith("./"):
                full_url = board["base_url"] + href[2:]
            elif href.startswith("?"):
                full_url = board["base_url"] + href
            elif href.startswith("/"):
                full_url = "https://plus.cnu.ac.kr" + href
            else:
                full_url = board["base_url"] + href

            # 4번째 td = 작성일
            date = tds[3].get_text(strip=True) if len(tds) >= 4 else None

            # 본문 수집
            content = _fetch_notice_content(full_url)

            notices.append(
                Notice(
                    id=_make_id(full_url),
                    source=f"포털-{board['name']}",
                    title=title,
                    url=full_url,
                    date=date,
                    content=content or title,
                )
            )

    return notices
