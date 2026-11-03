# AGENTIVE

충남대학교 컴퓨터인공지능학부 학생을 위한 공지 통합·요약 알림 서비스.

흩어진 공지를 자동으로 모으고, AI가 핵심만 요약해, 관심 키워드에 맞는 공지만 알려준다.

- 웹: https://agentive-web.vercel.app

## 기능

| 기능 | 설명 |
|---|---|
| 공지 자동 수집 | 포털 장학공지 · 학부 공지 · 소프트웨어중심대학 공지 · CNU with U 비교과 프로그램을 3시간마다 크롤링. 이미 전달한 공지는 제외 |
| AI 요약 | Claude가 핵심 내용, 신청 기간, 활동 기간, 할 일을 추출해 구조화 요약 |
| 키워드 개인화 알림 | 등록한 관심 키워드와 실제 관련 있는 공지만 AI가 골라 Discord DM · 웹 푸시로 발송 |
| 웹 (PWA) | Google 로그인 → 출처별 공지 조회, 키워드 등록, 푸시 알림, 홈 화면 설치 |
| 캘린더 연동 | 추출된 신청·활동 기간을 클릭 한 번으로 Google 캘린더에 추가 |
| Discord 봇 | 출처별 채널 알림, `/질문` 학교생활 Q&A, `/키워드` 관리, `/크롤링` 수동 실행 |

## 구조

```
[크롤러 4종] → 중복 제거 → [Claude 요약] → [Supabase 저장] → Discord 웹훅
                                                   └→ 키워드 매칭 → Discord DM / 웹 푸시
웹: Google 로그인 → 공지 조회 → 키워드 등록 / 알림 켜기 / 캘린더 추가
```

```
src/                 Python 파이프라인
  main.py            진입점 (run_pipeline)
  crawlers/          portal.py · department.py · with_cnu.py
  summarizer.py      Claude 요약 + 키워드 매칭
  database.py        Supabase 접근
  discord_bot.py     Discord 봇 (Fly.io 상시 실행)
web/                 Next.js 14 웹 (Vercel)
  src/app/           페이지 + API 라우트 (notices, keywords, push, calendar, account)
  public/sw.js       서비스 워커 (웹 푸시)
tests/               pytest
supabase_schema.sql  테이블 스키마 (notices, user_keywords, push_subscriptions)
.github/workflows/   crawl.yml (3시간 주기) · test.yml · fly-deploy.yml
```

## 기술 스택

| 구분 | 스택 |
|---|---|
| Backend | Python 3.11, BeautifulSoup4, discord.py, pywebpush |
| AI | Anthropic Claude API |
| Database | Supabase (PostgreSQL) |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, NextAuth (Google OAuth) |
| Infra | GitHub Actions, Fly.io, Vercel |

## 실행

### 파이프라인 / 봇

```bash
pip install -r requirements.txt
python src/main.py          # 크롤링 → 요약 → 저장 → 알림 1회 실행
python src/discord_bot.py   # Discord 봇
pytest tests/ -v
```

`.env` 환경변수:

| 변수 | 용도 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API |
| `SUPABASE_URL`, `SUPABASE_KEY` | Supabase (service_role) |
| `DISCORD_BOT_TOKEN` | Discord 봇 |
| `DISCORD_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL_SOFT`, `DISCORD_WEBHOOK_URL_WITHCNU` | 출처별 채널 웹훅 |
| `WITHCNU_USER_ID`, `WITHCNU_PASSWORD` | CNU with U 로그인 (포털 계정) |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | 웹 푸시 서명 |

### 웹

```bash
cd web
cp .env.local.example .env.local   # 값 채우기
npm install
npm run dev
```

## 배포

- 크롤링: GitHub Actions `crawl.yml` (매 3시간, Secrets에 위 환경변수 등록)
- Discord 봇: `fly deploy` (Dockerfile, `fly.toml`)
- 웹: Vercel (`web/` 디렉터리)
