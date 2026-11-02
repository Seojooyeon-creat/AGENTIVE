import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createClient } from '@supabase/supabase-js'

/** 웹 푸시 구독 저장·해제. 크롤러(src/main.py)가 키워드 매칭 공지를 이 구독으로 전송한다. */

export const dynamic = 'force-dynamic'

const supabase = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function requireEmail(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  return token?.email ?? null
}

type Sub = { endpoint?: string; keys?: { p256dh?: string; auth?: string } }

export async function POST(req: NextRequest) {
  const email = await requireEmail(req)
  if (!email) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const sub: Sub = await req.json().catch(() => ({}))
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: '잘못된 구독 정보입니다.' }, { status: 400 })
  }

  const { error } = await supabase()
    .from('push_subscriptions')
    .upsert({ endpoint: sub.endpoint, user_id: email, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const email = await requireEmail(req)
  if (!email) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { endpoint } = await req.json().catch(() => ({}))
  if (!endpoint) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })

  const { error } = await supabase()
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', email)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
