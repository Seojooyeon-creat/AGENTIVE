import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createClient } from '@supabase/supabase-js'

/**
 * 관심 키워드 관리 (웹).
 *
 * user_keywords 테이블을 Discord 봇과 공유한다. 봇은 discord_user_id에 Discord ID(숫자)를,
 * 웹은 Google 로그인 이메일을 넣는다. 크롤러는 두 출처의 키워드를 모두 AI에 넘겨 매칭하고,
 * DM은 숫자 ID에만 보낸다. 제한값(20자·10개)은 src/database.py 와 맞춘다.
 */

const MAX_KEYWORDS_PER_USER = 10
const MAX_KEYWORD_LENGTH = 20

export const dynamic = 'force-dynamic'

// user_keywords 는 RLS로 anon 접근이 막혀 있어 service_role 키가 필요하다 (서버 전용).
const supabase = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function requireEmail(req: NextRequest): Promise<string | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  return token?.email ?? null
}

const normalize = (k: unknown) => (typeof k === 'string' ? k.split(/\s+/).filter(Boolean).join(' ') : '')

async function listKeywords(email: string): Promise<string[]> {
  const { data, error } = await supabase()
    .from('user_keywords')
    .select('keyword')
    .eq('discord_user_id', email)
    .order('created_at')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => r.keyword as string)
}

export async function GET(req: NextRequest) {
  const email = await requireEmail(req)
  if (!email) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  try {
    return NextResponse.json({ keywords: await listKeywords(email) })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const email = await requireEmail(req)
  if (!email) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const keyword = normalize((await req.json().catch(() => ({})))?.keyword)
  if (!keyword) return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 })
  if (keyword.length > MAX_KEYWORD_LENGTH) {
    return NextResponse.json({ error: `키워드는 ${MAX_KEYWORD_LENGTH}자 이내로 입력해주세요.` }, { status: 400 })
  }

  try {
    const existing = await listKeywords(email)
    if (!existing.includes(keyword) && existing.length >= MAX_KEYWORDS_PER_USER) {
      return NextResponse.json(
        { error: `키워드는 최대 ${MAX_KEYWORDS_PER_USER}개까지 등록할 수 있어요.` },
        { status: 400 }
      )
    }
    const { error } = await supabase()
      .from('user_keywords')
      .upsert({ discord_user_id: email, keyword })
    if (error) throw new Error(error.message)
    return NextResponse.json({ keyword })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const email = await requireEmail(req)
  if (!email) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const keyword = normalize((await req.json().catch(() => ({})))?.keyword)
  if (!keyword) return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 })

  const { error } = await supabase()
    .from('user_keywords')
    .delete()
    .eq('discord_user_id', email)
    .eq('keyword', keyword)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
