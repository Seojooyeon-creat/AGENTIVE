import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '@/lib/auth'
import Header from '@/components/Header'

export const dynamic = 'force-dynamic'

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0)

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (!session?.user?.email || !admins.includes(session.user.email)) notFound()

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  // ponytail: 전체 행을 받아 메모리 집계. 수만 건 넘어가면 SQL view/RPC로 집계 이동
  const { data, error } = await db
    .from('summary_feedback')
    .select('good, notices(id, title, source, url)')
    .limit(10000)
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as {
    good: boolean
    notices: { id: string; title: string; source: string; url: string } | null
  }[]
  const good = rows.filter((r) => r.good).length
  const total = rows.length

  const perNotice = new Map<string, { title: string; source: string; url: string; good: number; bad: number }>()
  for (const r of rows) {
    if (!r.notices) continue
    const e = perNotice.get(r.notices.id) ?? { ...r.notices, good: 0, bad: 0 }
    r.good ? e.good++ : e.bad++
    perNotice.set(r.notices.id, e)
  }
  // 별로에요 많은 순 → 개선 대상이 위로
  const list = Array.from(perNotice.values()).sort((a, b) => b.bad - a.bad || b.good + b.bad - (a.good + a.bad))

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-extrabold text-gray-900 mb-5">관리자 · AI 요약 피드백</h1>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            ['전체 응답', `${total}`],
            ['👍 좋았어요', `${pct(good, total)}% (${good})`],
            ['👎 별로에요', `${pct(total - good, total)}% (${total - good})`],
          ].map(([label, value]) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400 text-left border-b border-gray-100">
              <tr>
                <th className="p-3">공지</th>
                <th className="p-3 whitespace-nowrap">👍</th>
                <th className="p-3 whitespace-nowrap">👎</th>
                <th className="p-3 whitespace-nowrap">만족도</th>
              </tr>
            </thead>
            <tbody>
              {list.map((n) => (
                <tr key={n.url} className="border-b border-gray-50">
                  <td className="p-3">
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:text-cnu-blue">
                      {n.title}
                    </a>
                    <span className="ml-2 text-xs text-gray-400">{n.source}</span>
                  </td>
                  <td className="p-3 tabular-nums">{n.good}</td>
                  <td className="p-3 tabular-nums">{n.bad}</td>
                  <td className="p-3 tabular-nums">{pct(n.good, n.good + n.bad)}%</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-gray-400">아직 피드백이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
