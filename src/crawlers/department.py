"""충남대학교 컴퓨터융합학부(컴AI학부) 공지사항 크롤러"""

import requests
from datetime import datetime, timedelta
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup
from typing import Optional

from crawlers.models import HEADERS as BASE_HEADERS, Notice, extract_content, make_id

HEADERS = {
    **BASE_HEADERS,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

TIMEOUT = 30
MAX_RETRIES = 3
PAGE_SIZE = 10

CONTENT_SELECTORS = (
    ".board-view-content",
    ".view-content",
    ".content",
    "div[class*='view']",
)


def _make_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=MAX_RETRIES,
        backoff_factor=2,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update(HEADERS)
    return session


# 컴퓨터융합학부 / AI학과 공지 게시판
DEPT_BOARDS = [
    {
        "name": "학부공지",
        "source_prefix": "학과",
        "url": "https://computer.cnu.ac.kr/computer/notice/bachelor.do",
        "base_url": "https://computer.cnu.ac.kr/computer/notice/bachelor.do",
        "list_selector": "table.board-table tbody tr",
        "title_selector": "td.b-td-left a",
        "date_selector": "td:nth-child(5)",  # 번호/제목/첨부/작성자/등록일/조회수 순
    },
    {
        "name": "소중대공지",
        "source_prefix": "소중대",
        "url": "https://computer.cnu.ac.kr/computer/notice/project.do",
        "base_url": "https://computer.cnu.ac.kr/computer/notice/project.do",
        "list_selector": "table.board-table tbody tr",
        "title_selector": "td.b-td-left a",
        "date_selector": "td:nth-child(5)",
    },
]


def _parse_date(date_str: str) -> Optional[datetime]:
    """YY.MM.DD 형식 파싱"""
    try:
        return datetime.strptime(date_str.strip(), "%y.%m.%d")
    except (ValueError, AttributeError):
        return None


def _is_pinned(row) -> bool:
    """상단 고정 공지(b-top-box / '공지' 번호 셀) 여부"""
    if "b-top-box" in row.get("class", []):
        return True
    num_td = row.select_one("td.b-num-box")
    return bool(num_td and "공지" in num_td.get_text())


def _resolve_url(base_url: str, href: str) -> str:
    if href.startswith("http"):
        return href
    if href.startswith("?"):
        return base_url + href
    if href.startswith("/"):
        return "https://computer.cnu.ac.kr" + href
    return base_url + "/" + href


def _fetch_notice_content(session: requests.Session, url: str) -> str:
    """개별 공지 본문 수집"""
    try:
        resp = session.get(url, timeout=TIMEOUT)
        resp.raise_for_status()
        return extract_content(resp.text, CONTENT_SELECTORS)
    except Exception:
        return ""


def fetch_department_notices(days_lookback: int = 30) -> list[Notice]:
    """학과 홈페이지 공지사항 크롤링 (페이지네이션, 날짜 컷오프)"""
    notices: list[Notice] = []
    session = _make_session()
    cutoff = datetime.now() - timedelta(days=days_lookback)

    for board in DEPT_BOARDS:
        offset = 0
        board_done = False

        while not board_done:
            page_url = (
                f"{board['url']}?mode=list&&articleLimit={PAGE_SIZE}"
                f"&article.offset={offset}"
            )
            try:
                resp = session.get(page_url, timeout=TIMEOUT)
                resp.raise_for_status()
            except requests.RequestException as e:
                print(f"[학과 크롤러] {board['name']} offset={offset} 요청 실패: {e}")
                break

            soup = BeautifulSoup(resp.text, "lxml")
            rows = soup.select(board["list_selector"])

            if not rows:
                break

            page_had_notice = False
            for row in rows:
                if _is_pinned(row):
                    continue

                link_tag = row.select_one(board["title_selector"])
                if not link_tag:
                    continue

                date_td = row.select_one(board["date_selector"])
                date_str = date_td.get_text(strip=True) if date_td else None
                parsed_date = _parse_date(date_str) if date_str else None

                # 컷오프보다 오래된 공지가 나오면 이 게시판은 종료
                if parsed_date and parsed_date < cutoff:
                    board_done = True
                    break

                title = link_tag.get_text(strip=True)
                href = link_tag.get("href", "")
                if not href:
                    continue

                full_url = _resolve_url(board["base_url"], href)
                content = _fetch_notice_content(session, full_url)

                notices.append(
                    Notice(
                        id=make_id(full_url),
                        source=f"{board['source_prefix']}-{board['name']}",
                        title=title,
                        url=full_url,
                        date=date_str,
                        content=content or title,
                    )
                )
                page_had_notice = True

            if not page_had_notice or board_done:
                break

            # 페이지에 rows가 PAGE_SIZE보다 적으면 마지막 페이지
            non_pinned = [r for r in rows if not _is_pinned(r)]
            if len(non_pinned) < PAGE_SIZE:
                break

            offset += PAGE_SIZE

    # 날짜 내림차순 정렬
    notices.sort(
        key=lambda n: (_parse_date(n.date) if n.date else None) or datetime.min,
        reverse=True,
    )
    return notices
