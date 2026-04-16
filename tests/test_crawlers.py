"""크롤러 유닛 테스트 (외부 네트워크 호출 없음)"""

import hashlib
from unittest.mock import patch, MagicMock
from crawlers.portal import _make_id, Notice as PortalNotice, _fetch_notice_content as portal_fetch
from crawlers.department import _make_id as dept_make_id, Notice as DeptNotice, _fetch_notice_content as dept_fetch


# ── _make_id ──────────────────────────────────────────────────

def test_make_id_consistency():
    url = "https://plus.cnu.ac.kr/notice?id=123"
    assert _make_id(url) == _make_id(url)


def test_make_id_uniqueness():
    assert _make_id("https://a.com/notice?id=1") != _make_id("https://a.com/notice?id=2")


def test_make_id_is_md5():
    url = "https://example.com"
    expected = hashlib.md5(url.encode()).hexdigest()
    assert _make_id(url) == expected


def test_dept_make_id_same_as_portal():
    url = "https://computer.cnu.ac.kr/notice?id=42"
    assert _make_id(url) == dept_make_id(url)


# ── _fetch_notice_content — 성공 케이스 ──────────────────────

SAMPLE_HTML = """
<html><body>
  <div class="board_view_content">공지 본문 내용입니다.</div>
</body></html>
"""


def test_portal_fetch_content_parses_board_view():
    mock_resp = MagicMock()
    mock_resp.text = SAMPLE_HTML
    mock_resp.raise_for_status = MagicMock()

    with patch("crawlers.portal.requests.get", return_value=mock_resp):
        result = portal_fetch("https://plus.cnu.ac.kr/notice/1")

    assert "공지 본문 내용입니다." in result


DEPT_HTML = """
<html><body>
  <div class="board-view-content">학과 공지 본문</div>
</body></html>
"""


def test_dept_fetch_content_parses_board_view():
    mock_resp = MagicMock()
    mock_resp.text = DEPT_HTML
    mock_resp.raise_for_status = MagicMock()

    with patch("crawlers.department.requests.get", return_value=mock_resp):
        result = dept_fetch("https://computer.cnu.ac.kr/notice/1")

    assert "학과 공지 본문" in result


def test_fetch_content_returns_empty_on_error():
    with patch("crawlers.portal.requests.get", side_effect=Exception("timeout")):
        result = portal_fetch("https://plus.cnu.ac.kr/notice/1")
    assert result == ""


# ── fetch_portal_notices — 빈 게시판 목록 ────────────────────

def test_fetch_portal_notices_empty_boards():
    from crawlers.portal import fetch_portal_notices
    # NOTICE_BOARDS가 [] 이므로 외부 호출 없이 빈 리스트 반환
    result = fetch_portal_notices()
    assert result == []


# ── fetch_department_notices — HTML mock ─────────────────────

DEPT_LIST_HTML = """
<html><body>
<table class="board-table">
  <tbody>
    <tr>
      <td class="b-num-box">1</td>
      <td class="b-td-left"><a href="?mode=view&articleNo=999">테스트 공지 제목</a></td>
      <td></td><td></td>
      <td>2026-04-14</td>
    </tr>
  </tbody>
</table>
</body></html>
"""


def test_fetch_department_notices_parses_row():
    from crawlers.department import fetch_department_notices

    mock_list_resp = MagicMock()
    mock_list_resp.text = DEPT_LIST_HTML
    mock_list_resp.raise_for_status = MagicMock()

    mock_content_resp = MagicMock()
    mock_content_resp.text = "<div class='board-view-content'>공지 본문</div>"
    mock_content_resp.raise_for_status = MagicMock()

    with patch("crawlers.department.requests.get", side_effect=[mock_list_resp, mock_content_resp]):
        notices = fetch_department_notices(max_per_board=5)

    assert len(notices) == 1
    assert notices[0].title == "테스트 공지 제목"
    assert notices[0].date == "2026-04-14"
    assert notices[0].source == "학과-학부공지"
    assert "articleNo=999" in notices[0].url
