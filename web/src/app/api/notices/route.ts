import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source')
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)

  let query = supabase
    .from('notices')
    .select('id, source, title, url, date, summary, apply_start, apply_deadline, activity_start, activity_end, posted_at')
    .order('posted_at', { ascending: false })
    .limit(limit)

  if (source && source !== '전체') {
    query = query.ilike('source', `${source}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
