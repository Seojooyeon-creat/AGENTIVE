import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type EventDraft = {
  notice: { id: string; title: string; url: string; source: string; summary: string | null }
  title: string
  startDate: string
  endDate: string
}

async function createCalendarEvent(
  accessToken: string,
  draft: EventDraft
): Promise<{ success: boolean; error?: string }> {
  const event = {
    summary: draft.title,
    description: [
      draft.notice.summary ?? '',
      '',
      `출처: ${draft.notice.source}`,
      `링크: ${draft.notice.url}`,
    ]
      .join('\n')
      .trim(),
    start: { date: draft.startDate },
    end: { date: draft.endDate },
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { success: false, error: body?.error?.message ?? res.statusText }
  }

  return { success: true }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { drafts }: { drafts: EventDraft[] } = await req.json()

  if (!Array.isArray(drafts) || drafts.length === 0) {
    return NextResponse.json({ error: '추가할 일정을 선택해주세요.' }, { status: 400 })
  }

  const results = await Promise.all(
    drafts.map((draft) => createCalendarEvent(session.accessToken!, draft))
  )

  const failed = results.filter((r) => !r.success)

  if (failed.length === results.length) {
    return NextResponse.json(
      { error: `모든 이벤트 추가 실패: ${failed[0]?.error}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    added: results.length - failed.length,
    failed: failed.length,
  })
}
