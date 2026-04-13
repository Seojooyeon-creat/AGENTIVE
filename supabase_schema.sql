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
