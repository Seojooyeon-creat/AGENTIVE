"""Discord 봇 토큰으로 개인 DM 전송

게이트웨이 연결 없이 REST API만 사용하므로 GitHub Actions 파이프라인에서도 동작한다.
DM을 받으려면 유저가 봇과 같은 서버에 있고, 서버 멤버의 DM을 허용해 둔 상태여야 한다.
"""

import time
import requests

API_BASE = "https://discord.com/api/v10"
MAX_RETRY_WAIT = 10  # 초


def _post(path: str, token: str, payload: dict) -> requests.Response:
    """POST 요청. rate limit(429)이면 retry_after만큼 기다렸다가 한 번 재시도"""
    headers = {"Authorization": f"Bot {token}"}
    resp = requests.post(f"{API_BASE}{path}", headers=headers, json=payload, timeout=10)
    if resp.status_code == 429:
        time.sleep(min(float(resp.json().get("retry_after", 1)), MAX_RETRY_WAIT))
        resp = requests.post(f"{API_BASE}{path}", headers=headers, json=payload, timeout=10)
    return resp


def send_dm(token: str, user_id: str, payload: dict) -> bool:
    """유저에게 DM 전송. 성공 여부 반환 (DM 차단·서버 미참여 등은 False)"""
    channel = _post("/users/@me/channels", token, {"recipient_id": user_id})
    if not channel.ok:
        print(f"[Discord DM] 채널 생성 실패 (user {user_id}): {channel.status_code} {channel.text}")
        return False

    resp = _post(f"/channels/{channel.json()['id']}/messages", token, payload)
    if not resp.ok:
        print(f"[Discord DM] 전송 실패 (user {user_id}): {resp.status_code} {resp.text}")
        return False
    return True
