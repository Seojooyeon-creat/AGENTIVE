"""웹 푸시(PWA) 전송

웹에서 키워드를 등록한 유저(이메일 ID)에게 Web Push 프로토콜로 알림을 보낸다.
VAPID 키는 웹(NEXT_PUBLIC_VAPID_PUBLIC_KEY)과 쌍이어야 한다.
"""

import json
import os

from pywebpush import webpush, WebPushException

GONE_STATUSES = {404, 410}  # 구독이 만료·해지됨 → DB에서 지워야 한다


def send_push(subscription: dict, payload: dict) -> bool | None:
    """구독 하나에 알림 전송.

    True: 성공 / False: 일시 실패 / None: 구독이 만료됨(삭제 대상)
    subscription: {"endpoint", "keys": {"p256dh", "auth"}}
    """
    private_key = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
    subject = os.environ.get("VAPID_SUBJECT", "mailto:admin@example.com").strip()
    if not private_key:
        print("[푸시] VAPID_PRIVATE_KEY 미설정 — 전송 생략")
        return False
    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps(payload, ensure_ascii=False),
            vapid_private_key=private_key,
            vapid_claims={"sub": subject},
            ttl=60 * 60 * 24,
        )
        return True
    except WebPushException as e:
        status = getattr(e.response, "status_code", None)
        if status in GONE_STATUSES:
            return None
        print(f"[푸시] 전송 실패 ({status}): {e}")
        return False
