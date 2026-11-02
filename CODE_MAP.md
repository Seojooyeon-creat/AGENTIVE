# AGENTIVE 코드 맵

주요 기능이 구현된 파일 위치. 파이프라인(Python, `src/`)과 웹(Next.js, `web/src/`) 두 축으로 나뉜다.

## 전체 흐름

```
[크롤러 3종] → 중복 제거 → [Claude 요약] → [Supabase 저장] → Discord 웹훅
                                                   └→ 키워드 매칭 → Discord DM / 웹 푸시
웹: Google 로그인 → 공지 조회 → 키워드 등록 / 알림 켜기 / 캘린더 추가
```

- 실행 주체: GitHub Actions `crawl.yml`(3시간 주기), Fly.io의 Discord 봇(`/크롤링` 수동 실행)
- 진입점: `src/main.py` → `run_pipeline()`

---

## 1. 크롤링 — `src/crawlers/`

| 파일 | 대상 | 비고 |
|---|---|---|
| `portal.py` | 포털 장학공지 (plus.cnu.ac.kr) | `NOTICE_BOARDS` 리스트에 게시판 추가 |
| `department.py` | 학과 학부공지 + 소중대 공지 | 페이지네이션 지원 |
| `with_cnu.py` | CNU with U 비교과 프로그램 | 포털 계정 로그인 필요 |
| `models.py` | `Notice` 데이터클래스, `extract_content()`, `make_id()` | URL MD5 해시가 공지 ID |

공지의 `source`는 `"출처-게시판"` 형식(예: `포털-장학공지`). `-` 앞 prefix로 이모지·웹훅·웹 필터가 결정된다 (`main.py`의 `SOURCE_CONFIGS`).

## 2. AI 요약 — `src/summarizer.py`

- `summarize_notice(notice, keywords)` → `NoticeSummary`
- Claude API 한 번 호출로 추출: 핵심 요약, 신청 기간(텍스트 + ISO 시작/마감), 활동 기간, 할 일, **관련 키워드**(등록된 키워드 중 AI가 관련 있다고 판단한 것)
- 키워드 매칭이 단순 문자열이 아니라 AI 판단인 이유: "장학" 키워드에 "장학금 반환 안내" 같은 무관한 공지를 거르기 위함

## 3. 파이프라인 — `src/main.py`

| 함수 | 역할 |
|---|---|
| `run_pipeline()` | 전체 흐름 조율 |
| `_collect_notices()` | 크롤러 3종 호출 + 출처별 건수 출력 |
| `_summarize_and_save()` | 요약 후 `save_notice()` |
| `build_discord_embed()` | 공지 → Discord embed |
| `post_to_discord()` | 출처별 웹훅 전송 (10개씩 청크) |
| `build_keyword_dms()` | 키워드 매칭 결과 → 유저별 알림 목록 |
| `post_keyword_dms()` | Discord ID(숫자) 유저에게 DM |
| `post_keyword_pushes()` | 이메일 유저에게 웹 푸시, 만료 구독 정리 |

유저 ID 규칙: 숫자면 Discord, 아니면 웹(Google 이메일). 같은 `user_keywords` 테이블을 공유한다.

## 4. DB — Supabase

### 스키마 `supabase_schema.sql`

| 테이블 | PK | 용도 | RLS |
|---|---|---|---|
| `notices` | `id` (URL 해시) | 공지 + 요약 + 추출 일정 + `matched_keywords[]` | anon 읽기 허용 |
| `user_keywords` | `(discord_user_id, keyword)` | 키워드 구독. Discord ID 또는 이메일 | service_role만 |
| `push_subscriptions` | `endpoint` | 브라우저 푸시 구독 (p256dh, auth) | service_role만 |

### Python 접근 `src/database.py`

| 함수 | 역할 |
|---|---|
| `filter_new_notices(ids)` | 이미 저장된 ID 제외 → 중복 알림 방지의 핵심 |
| `save_notice(...)` | upsert |
| `list_keywords / add_keyword / remove_keyword` | 키워드 CRUD. 유저당 10개, 20자 제한, 공백 정규화 |
| `fetch_keyword_subscriptions()` | `{키워드: [유저ID...]}` 전체 (1000행 페이징) |
| `fetch_push_subscriptions(user_ids)` | `{유저ID: [구독...]}` |
| `delete_push_subscription(endpoint)` | 404/410 만료 구독 삭제 |

### 웹 접근 `web/src/app/api/`

| 라우트 | 메서드 | 테이블 | 인증 |
|---|---|---|---|
| `notices/route.ts` | GET | `notices` (anon 키) | 없음. `source` prefix 필터, `limit` |
| `keywords/route.ts` | GET/POST/DELETE | `user_keywords` (service_role) | 세션 이메일 |
| `push/route.ts` | POST/DELETE | `push_subscriptions` (service_role) | 세션 이메일 |
| `calendar/add/route.ts` | POST | — (Google Calendar API) | 세션 accessToken |
| `account/route.ts` | DELETE | — (Google 토큰 revoke) | 세션. 자체 유저 테이블 없음 |

`web/src/lib/supabase.ts`는 anon 클라이언트. 쓰기 라우트는 각자 service_role 키로 클라이언트를 만든다.

## 5. Google Auth — `web/src/lib/auth.ts`

- NextAuth + Google 프로바이더, JWT 세션(DB 없음)
- 스코프: openid, profile, email, `calendar.events`
- `access_type: offline` + `prompt: consent` → refresh_token 확보
- `jwt` 콜백: 로그인 시 access/refresh/만료시각 저장, 만료 1분 전부터 `refreshAccessToken()`으로 갱신, 실패 시 `error` 플래그
- 핸들러: `app/api/auth/[...nextauth]/route.ts`, 타입 확장: `types/next-auth.d.ts`

## 6. Google 캘린더 추가

| 파일 | 역할 |
|---|---|
| `app/notices/page.tsx` | 공지 선택 → 모달 → `/api/calendar/add` 호출. 401이면 "다시 로그인" 토스트 |
| `components/FloatingCalendarBar.tsx` | 선택 건수 표시 하단 바 |
| `components/CalendarReviewModal.tsx` | 추가 전 제목·날짜 확인·편집. 요약에서 뽑은 `apply_*`/`activity_*` 날짜가 초깃값 |
| `app/api/calendar/add/route.ts` | 종일 이벤트로 Calendar API POST. 설명에 요약·출처·링크 포함 |

## 7. 키워드 알림

### Discord
- `src/discord_bot.py`: 상시 실행 봇. `/키워드` 등록·삭제 슬래시 명령, Q&A 챗봇, 3시간 스케줄러, `/크롤링` 수동 실행
- `src/discord_dm.py`: 봇 토큰으로 DM 전송

### 웹 푸시 (PWA)
| 파일 | 역할 |
|---|---|
| `web/public/manifest.json` | 홈 화면 설치용 (standalone, 아이콘 3종) |
| `web/public/sw.js` | 푸시 수신 → 알림 표시, 클릭 → URL 이동 |
| `components/PushToggle.tsx` | 구독 UI. iOS는 홈 화면 추가 후에만 가능하다고 안내 |
| `components/KeywordModal.tsx` | 키워드 등록 UI |
| `src/web_push.py` | pywebpush로 VAPID 전송. 404/410 → `None`(삭제 대상) |
| `src/push_test.py` | 테스트 전송: `python src/push_test.py <이메일> [메시지]` |

VAPID 키 쌍: `.env`의 `VAPID_PRIVATE_KEY` ↔ `web/.env.local`의 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

## 8. 테스트

- `tests/`: pytest 55개. 크롤러는 HTML mock, 외부 호출 없음
- 실행: `agentive/bin/python -m pytest tests -q`
