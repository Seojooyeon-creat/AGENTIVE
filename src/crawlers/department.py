"""충남대학교 컴퓨터융합학부(컴AI학부) 공지사항 크롤러"""

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

# 컴퓨터융합학부 / AI학과 공지 게시판
# 실제 URL은 학과 홈페이지에서 확인 후 수정
DEPT_BOARDS = [
    {
        "name": "학부공지",
        "url": "https://computer.cnu.ac.kr/computer/notice/bachelor.do",
        # 링크가 ?mode=view&articleNo=... 형태라서 페이지 URL 자체가 base
        "base_url": "https://computer.cnu.ac.kr/computer/notice/bachelor.do",
        "list_selector": "table.board-table tbody tr",
        "title_selector": "td.b-td-left a",
        "date_selector": "td:nth-child(5)",  # 번호/제목/첨부/작성자/등록일/조회수 순
    },
]


@dataclass
class Notice:
    id: str
    source: str
    title: str
    url: str
    date: Optional[str]
    content: str


def _make_id(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()


def _fetch_notice_content(url: str, timeout: int = 10) -> str:
    """개별 공지 본문 수집"""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        content_area = (
            soup.select_one(".board-view-content")
            or soup.select_one(".view-content")
            or soup.select_one(".content")
            or soup.select_one("div[class*='view']")
        )
        if content_area:
            return content_area.get_text(separator="\n", strip=True)[:3000]
        return ""
    except Exception:
        return ""


def fetch_department_notices(max_per_board: int = 10) -> list[Notice]:
    """학과 홈페이지 공지사항 크롤링"""
    notices: list[Notice] = []

    for board in DEPT_BOARDS:
        try:
            resp = requests.get(board["url"], headers=HEADERS, timeout=15)
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"[학과 크롤러] {board['name']} 요청 실패: {e}")
            continue

        soup = BeautifulSoup(resp.text, "lxml")
        rows = soup.select(board["list_selector"])

        count = 0
        for row in rows:
            if count >= max_per_board:
                break

            # 상단 고정 공지(b-top-box) 스킵
            if "b-top-box" in row.get("class", []):
                continue
            # b-num-box에 "공지" 텍스트 있는 행도 스킵
            num_td = row.select_one("td.b-num-box")
            if num_td and "공지" in num_td.get_text():
                continue

            link_tag = row.select_one(board["title_selector"])
            if not link_tag:
                continue

            title = link_tag.get_text(strip=True)
            href = link_tag.get("href", "")
            if not href:
                continue

            if href.startswith("http"):
                full_url = href
            elif href.startswith("?"):
                # ?mode=view&articleNo=... 형태
                full_url = board["base_url"] + href
            elif href.startswith("/"):
                full_url = "https://computer.cnu.ac.kr" + href
            else:
                full_url = board["base_url"] + "/" + href

            date_td = row.select_one(board["date_selector"])
            date = date_td.get_text(strip=True) if date_td else None

            content = _fetch_notice_content(full_url)

            notices.append(
                Notice(
                    id=_make_id(full_url),
                    source=f"학과-{board['name']}",
                    title=title,
                    url=full_url,
                    date=date,
                    content=content or title,
                )
            )
            count += 1

    return notices
