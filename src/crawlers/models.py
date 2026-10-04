"""크롤러 공용 모델·유틸 (portal / department / with_cnu에서 공유)"""

import hashlib
from bs4 import BeautifulSoup
from dataclasses import dataclass
from typing import Optional

MAX_CONTENT_LENGTH = 3000

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
}


@dataclass
class Notice:
    id: str          # 중복 방지용 고유 ID (URL 해시)
    source: str      # 출처 (예: '포털-학사공지', '학과-학부공지')
    title: str
    url: str
    date: Optional[str]
    content: str     # 본문 (요약 전 원문)


def make_id(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()


def extract_content(html: str, selectors: tuple[str, ...]) -> str:
    """HTML에서 selectors 순서대로 본문 영역을 찾아 텍스트로 추출 (없으면 빈 문자열)"""
    soup = BeautifulSoup(html, "lxml")
    for selector in selectors:
        content_area = soup.select_one(selector)
        if content_area:
            return content_area.get_text(separator="\n", strip=True)[:MAX_CONTENT_LENGTH]
    return ""
