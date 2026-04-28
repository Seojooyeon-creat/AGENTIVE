"""CNU with U 비교과 프로그램 크롤러

대상: https://with.cnu.ac.kr  (개인 비교과 프로그램 목록)
로그인 필요 — 환경변수 WITHCNU_USER_ID, WITHCNU_PASSWORD 설정 필수

로그인 방식: jsbn.js 기반 RSA-1024 + PKCS#1 v1.5 암호화 (loginTy=9999 SSO 경로)
"""

import os
import re
import json
import hashlib
import requests
from bs4 import BeautifulSoup
from dataclasses import dataclass
from typing import Optional

BASE_URL = "https://with.cnu.ac.kr"
LOGIN_PAGE_URL = f"{BASE_URL}/comm/login/user/dialog/login.do"
LOGIN_POST_URL = f"{BASE_URL}/comm/login/user/loginProc.do"
LIST_URL = f"{BASE_URL}/ptfol/imng/icmpNsbjtPgm/findIcmpNsbjtPgmList.do"
INFO_URL = f"{BASE_URL}/ptfol/imng/icmpNsbjtPgm/findIcmpNsbjtPgmInfo.do"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": BASE_URL,
}


@dataclass
class Notice:
    id: str
    source: str
    title: str
    url: str
    date: Optional[str]
    content: str


def _make_id(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()


# ── RSA PKCS#1 v1.5 암호화 (외부 라이브러리 불필요) ──────────────────────────

def _pkcs1_v1_5_pad(message: bytes, key_len: int) -> bytes:
    m_len = len(message)
    ps_len = key_len - m_len - 3
    if ps_len < 8:
        raise ValueError("Message too long for RSA key size")
    ps = bytearray()
    while len(ps) < ps_len:
        b = os.urandom(1)[0]
        if b != 0:
            ps.append(b)
    return b"\x00\x02" + bytes(ps) + b"\x00" + message


def _rsa_encrypt(modulus_hex: str, exponent_hex: str, plaintext: str) -> str:
    """jsbn.js 방식 RSA 암호화 → hex 문자열 반환"""
    n = int(modulus_hex, 16)
    e = int(exponent_hex, 16)
    key_len = (n.bit_length() + 7) // 8
    em = _pkcs1_v1_5_pad(plaintext.encode("utf-8"), key_len)
    m_int = int.from_bytes(em, "big")
    c_int = pow(m_int, e, n)
    return format(c_int, f"0{key_len * 2}x")


# ── 로그인 ────────────────────────────────────────────────────────────────────

def _login(session: requests.Session, user_id: str, password: str) -> bool:
    try:
        resp = session.get(LOGIN_PAGE_URL, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"[with.cnu 크롤러] 로그인 페이지 요청 실패: {e}")
        return False

    soup = BeautifulSoup(resp.text, "lxml")
    modulus = soup.select_one("#RSAModulus")
    exponent = soup.select_one("#RSAExponent")
    if not modulus or not exponent:
        print("[with.cnu 크롤러] RSA 공개키를 찾을 수 없음")
        return False

    enc_id = _rsa_encrypt(modulus["value"], exponent["value"], user_id)
    enc_pw = _rsa_encrypt(modulus["value"], exponent["value"], password)

    payload = {
        "rtnUrl": "",
        "rtnUrlDecrypt": "",
        "loginTy": "9999",   # SSO 경로 (재학생)
        "userId": enc_id,
        "password": enc_pw,
    }
    try:
        post_resp = session.post(
            LOGIN_POST_URL,
            data=payload,
            headers={**HEADERS, "Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
            allow_redirects=True,
        )
        post_resp.raise_for_status()
    except requests.RequestException as e:
        print(f"[with.cnu 크롤러] 로그인 POST 실패: {e}")
        return False

    # 로그인 실패 시 /non/index.do로 유지됨
    if post_resp.url.rstrip("/").endswith("/non/index.do"):
        print("[with.cnu 크롤러] 로그인 실패 — 인증 오류 (학번/비밀번호 확인 필요)")
        return False

    return True


# ── 날짜 파싱 ─────────────────────────────────────────────────────────────────

def _extract_date(etc_info_txt: str) -> Optional[str]:
    """etc_info_txt에서 신청기간만 추출"""
    m = re.search(r"신청기간\s*([\d.:\s~]+?)(?:교육기간|$)", etc_info_txt)
    if m:
        return "신청기간 " + m.group(1).strip()
    return etc_info_txt[:50] if etc_info_txt else None


# ── 상세 페이지 본문 ──────────────────────────────────────────────────────────

def _fetch_detail(session: requests.Session, enc_seq: str) -> str:
    try:
        resp = session.get(INFO_URL, params={"encSddpbSeq": enc_seq}, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        content_area = (
            soup.select_one(".view_cont")
            or soup.select_one(".cont_detail")
            or soup.select_one(".pgm_detail")
            or soup.select_one(".view-content")
            or soup.select_one(".con_box")
        )
        return content_area.get_text(separator="\n", strip=True)[:3000] if content_area else ""
    except Exception:
        return ""


# ── 공개 인터페이스 ───────────────────────────────────────────────────────────

def fetch_with_cnu_programs() -> list[Notice]:
    """CNU with U 개인 비교과 프로그램 목록 크롤링"""
    user_id = os.environ.get("WITHCNU_USER_ID", "").strip()
    password = os.environ.get("WITHCNU_PASSWORD", "").strip()
    if not user_id or not password:
        print("[with.cnu 크롤러] WITHCNU_USER_ID / WITHCNU_PASSWORD 환경변수 미설정, 건너뜀")
        return []

    session = requests.Session()

    if not _login(session, user_id, password):
        return []

    try:
        resp = session.get(LIST_URL, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"[with.cnu 크롤러] 목록 페이지 요청 실패: {e}")
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    all_cards = soup.select(".lica_wrap li")
    # 4열 그리드 레이아웃 — 빈 li 제외하고 실제 프로그램 카드만 필터링
    cards = [c for c in all_cards if c.select_one("a.tit")]

    if not cards:
        print("[with.cnu 크롤러] 개인비교과: 카드 항목 없음")
        return []

    notices: list[Notice] = []
    for card in cards:
        # 제목
        title_tag = card.select_one("a.tit")
        if not title_tag:
            continue
        title = title_tag.get_text(strip=True)
        if not title:
            continue

        # encSddpbSeq → 상세 URL
        detail_btn = card.select_one("a.detailBtn[data-params]")
        enc_seq = ""
        if detail_btn:
            try:
                params = json.loads(detail_btn["data-params"])
                enc_seq = params.get("encSddpbSeq", "")
            except (json.JSONDecodeError, KeyError):
                pass

        full_url = f"{INFO_URL}?encSddpbSeq={enc_seq}" if enc_seq else LIST_URL
        notice_id = _make_id(full_url)

        # 날짜 (신청기간)
        date_tag = card.select_one(".etc_info_txt")
        date = _extract_date(date_tag.get_text(strip=True)) if date_tag else None

        # 주관부서 — 제목에 덧붙여 본문으로 활용
        dept_tag = card.select_one(".major_type")
        dept = dept_tag.get_text(strip=True) if dept_tag else ""

        # 상세 페이지 본문 수집
        content = _fetch_detail(session, enc_seq) if enc_seq else ""
        if not content:
            content = f"{dept} | {title}" if dept else title

        notices.append(
            Notice(
                id=notice_id,
                source="비교과-개인",
                title=title,
                url=full_url,
                date=date,
                content=content,
            )
        )

    return notices
