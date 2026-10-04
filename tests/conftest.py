import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

# main.py가 import 시점에 웹훅 환경변수를 요구하므로 테스트용 기본값 설정
os.environ.setdefault("DISCORD_WEBHOOK_URL", "https://discord.test/webhook-main")
os.environ.setdefault("DISCORD_WEBHOOK_URL_WITHCNU", "https://discord.test/webhook-withcnu")
os.environ.setdefault("DISCORD_WEBHOOK_URL_SOFT", "https://discord.test/webhook-soft")
