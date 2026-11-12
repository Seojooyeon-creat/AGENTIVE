import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createClient } from '@supabase/supabase-js'

/** AI 요약 피드백. 로그인 유저당 공지 1표. good: true/false = 투표, null = 취소. */

export const dynamic = 'force-dynamic'

const supabase = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function requireEmail(req: NextRequest): Promise<string | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  return token?.email ?? null
}

// 내 투표 목록 → { [noticeId]: good }
export async function GET(req: NextRequest) {
  const email = await requireEmail(req)
  if (!email) return NextResponse.json({ ratings: {} })
  const { data, error } = await supabase()
    .from('summary_feedback')
    .select('notice_id, good')
    .eq('user_id', email)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ratings: Object.fromEntries((data ?? []).map((r) => [r.notice_id, r.good])) })
}

export async function POST(req: NextRequest) {
  const email = await requireEmail(req)
  if (!email) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { noticeId, good } = await req.json().catch(() => ({}))
  if (typeof noticeId !== 'string' || !noticeId || !(good === true || good === false || good === null)) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const table = supabase().from('summary_feedback')
  const { error } =
    good === null
      ? await table.delete().eq('notice_id', noticeId).eq('user_id', email)
      : await table.upsert({ notice_id: noticeId, user_id: email, good })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
