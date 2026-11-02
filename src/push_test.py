"""웹 푸시 테스트 전송: python src/push_test.py <이메일> [메시지]

크롤링 없이, 해당 유저의 구독 전부에 테스트 알림 1건을 보낸다.
"""

import sys

from dotenv import load_dotenv

from database import delete_push_subscription, fetch_push_subscriptions
from web_push import send_push

load_dotenv()


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    email = sys.argv[1]
    body = sys.argv[2] if len(sys.argv) > 2 else "푸시 알림이 정상 동작합니다."
    subs = fetch_push_subscriptions([email]).get(email, [])
    if not subs:
        sys.exit(f"{email} 의 푸시 구독이 없습니다. 웹에서 알림을 먼저 켜주세요.")
    payload = {"title": "🔔 AGENTIVE 테스트", "body": body, "url": "/notices"}
    for sub in subs:
        result = send_push(sub, payload)
        if result is None:
            delete_push_subscription(sub["endpoint"])
        print(f"{'OK' if result else 'FAIL' if result is False else 'EXPIRED(삭제)'}  {sub['endpoint'][:60]}...")


if __name__ == "__main__":
    main()
