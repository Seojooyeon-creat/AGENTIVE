"""충남대학교 포털 공지사항 크롤러"""

import requests
from bs4 import BeautifulSoup

from crawlers.models import HEADERS, Notice, extract_content, make_id

# 충남대 포털 공지사항 게시판
# 링크가 ./?mode=V&no=... 형태라 base_url = 게시판 디렉터리 경로
NOTICE_BOARDS = []  # 포털 사이트 응답 느림 — 필요시 다시 추가

# 포털 본문 영역 후보 (실제 선택자는 사이트 구조에 따라 조정 필요)
CONTENT_SELECTORS = (
    ".board_view_content",
    ".view_content",
    ".cont_wrap",
    "div[class*='content' i]",
)


def _fetch_notice_content(url: str, timeout: int = 10) -> str:
    """개별 공지 본문을 가져옴"""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        return extract_content(resp.text, CONTENT_SELECTORS)
    except Exception:
        return ""


def _resolve_url(base_url: str, href: str) -> str:
    """게시판 상대 링크(./?mode=V&no=... 등)를 절대 URL로 변환"""
    if href.startswith("http"):
        return href
    if href.startswith("./"):
        return base_url + href[2:]
    if href.startswith("?"):
        return base_url + href
    if href.startswith("/"):
        return "https://plus.cnu.ac.kr" + href
    return base_url + href


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

            full_url = _resolve_url(board["base_url"], href)

            # 4번째 td = 작성일
            date = tds[3].get_text(strip=True) if len(tds) >= 4 else None

            # 본문 수집
            content = _fetch_notice_content(full_url)

            notices.append(
                Notice(
                    id=make_id(full_url),
                    source=f"포털-{board['name']}",
                    title=title,
                    url=full_url,
                    date=date,
                    content=content or title,
                )
            )

    return notices
