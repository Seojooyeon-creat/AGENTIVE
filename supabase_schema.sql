-- AGENTIVE 공지사항 테이블
-- Supabase SQL Editor에서 한 번 실행하세요.

CREATE TABLE IF NOT EXISTS notices (
    id TEXT PRIMARY KEY,           -- URL의 MD5 해시 (중복 방지 키)
    source TEXT NOT NULL,          -- 예: '포털-학사공지', '학과-학부공지'
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    date TEXT,
    summary TEXT,                  -- Claude가 생성한 요약
    posted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 최근 공지 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_notices_posted_at ON notices (posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_notices_source ON notices (source);

-- anon 키(웹 조회용)는 읽기만 허용. 쓰기는 RLS를 우회하는 service_role 키(크롤러·봇)만 가능.
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notices_public_read ON notices;
CREATE POLICY notices_public_read ON notices FOR SELECT TO anon, authenticated USING (true);

-- 관심 키워드 구독 (디스코드 /키워드 명령으로 등록 → 관련 공지를 DM으로 전송)
CREATE TABLE IF NOT EXISTS user_keywords (
    discord_user_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (discord_user_id, keyword)
);

-- 웹에 공개되는 anon 키로는 읽기·쓰기가 안 되도록 RLS 활성화 (정책 없음 = service_role 키만 접근).
-- 따라서 크롤러·봇의 SUPABASE_KEY는 service_role 키여야 한다.
ALTER TABLE user_keywords ENABLE ROW LEVEL SECURITY;
