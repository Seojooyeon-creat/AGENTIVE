"""크롤러 유닛 테스트 (외부 네트워크 호출 없음)"""

import hashlib
from unittest.mock import patch, MagicMock
from crawlers.models import Notice, make_id, extract_content
from crawlers.portal import _fetch_notice_content as portal_fetch
from crawlers.department import _fetch_notice_content as dept_fetch


# ── make_id ───────────────────────────────────────────────────

def test_make_id_consistency():
    url = "https://plus.cnu.ac.kr/notice?id=123"
    assert make_id(url) == make_id(url)


def test_make_id_uniqueness():
    assert make_id("https://a.com/notice?id=1") != make_id("https://a.com/notice?id=2")


def test_make_id_is_md5():
    url = "https://example.com"
    expected = hashlib.md5(url.encode()).hexdigest()
    assert make_id(url) == expected


# ── extract_content ───────────────────────────────────────────

def test_extract_content_first_matching_selector():
    html = "<div class='view_content'>본문 A</div><div class='cont_wrap'>본문 B</div>"
    assert extract_content(html, (".view_content", ".cont_wrap")) == "본문 A"


def test_extract_content_no_match_returns_empty():
    assert extract_content("<p>본문 없음</p>", (".view_content",)) == ""


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

    mock_session = MagicMock()
    mock_session.get.return_value = mock_resp

    result = dept_fetch(mock_session, "https://computer.cnu.ac.kr/notice/1")

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

EMPTY_LIST_HTML = "<html><body><table class='board-table'><tbody></tbody></table></body></html>"


def test_fetch_department_notices_parses_row():
    from crawlers.department import fetch_department_notices

    mock_list_resp = MagicMock()
    mock_list_resp.text = DEPT_LIST_HTML
    mock_list_resp.raise_for_status = MagicMock()

    mock_content_resp = MagicMock()
    mock_content_resp.text = "<div class='board-view-content'>공지 본문</div>"
    mock_content_resp.raise_for_status = MagicMock()

    mock_empty_resp = MagicMock()
    mock_empty_resp.text = EMPTY_LIST_HTML
    mock_empty_resp.raise_for_status = MagicMock()

    mock_session = MagicMock()
    # 게시판 2개: 첫 게시판은 [목록, 본문] 후 마지막 페이지, 둘째는 빈 목록
    mock_session.get.side_effect = [mock_list_resp, mock_content_resp, mock_empty_resp]

    with patch("crawlers.department._make_session", return_value=mock_session):
        notices = fetch_department_notices()

    assert len(notices) == 1
    assert notices[0].title == "테스트 공지 제목"
    assert notices[0].date == "2026-04-14"
    assert notices[0].source == "학과-학부공지"
    assert "articleNo=999" in notices[0].url


def test_notice_dataclass_shared():
    """세 크롤러가 동일한 Notice 모델을 사용"""
    from crawlers import portal, department, with_cnu
    assert portal.Notice is Notice
    assert department.Notice is Notice
    assert with_cnu.Notice is Notice


# ── with.cnu 로그인 실패 감지 ─────────────────────────────────

def _with_cnu_session(post_url: str, post_body: str):
    login_page = MagicMock()
    login_page.text = '<input id="RSAModulus" value="c7"><input id="RSAExponent" value="10001">'
    post_resp = MagicMock()
    post_resp.url = post_url
    post_resp.text = post_body
    session = MagicMock()
    session.get.return_value = login_page
    session.post.return_value = post_resp
    return session


def test_with_cnu_login_detects_alert_failure(capsys):
    """200 응답이어도 alert + /non/index.do 이동 스크립트면 로그인 실패"""
    from crawlers import with_cnu

    body = '<script>alert("로그인 실패 횟수가 초과되었습니다."); location.href("/non/index.do");</script>'
    session = _with_cnu_session("https://with.cnu.ac.kr/comm/login/user/loginProc.do", body)

    with patch.object(with_cnu, "_rsa_encrypt", return_value="enc"):
        assert with_cnu._login(session, "id", "pw") is False
    assert "로그인 실패 횟수가 초과" in capsys.readouterr().out


def test_with_cnu_login_success():
    from crawlers import with_cnu

    session = _with_cnu_session("https://with.cnu.ac.kr/index.do", "<html>메인</html>")

    with patch.object(with_cnu, "_rsa_encrypt", return_value="enc"):
        assert with_cnu._login(session, "id", "pw") is True
