'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { toast } from 'sonner'
import Header from '@/components/Header'
import NoticeCard from '@/components/NoticeCard'
import FilterBar, { type FilterType } from '@/components/FilterBar'
import FloatingCalendarBar from '@/components/FloatingCalendarBar'
import CalendarReviewModal, { type EventDraft } from '@/components/CalendarReviewModal'
import { type Notice } from '@/lib/utils'
import { Search, RefreshCw, LogIn, Inbox } from 'lucide-react'

export default function NoticesPage() {
  const { data: session } = useSession()

  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('전체')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)

  const fetchNotices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notices?limit=60')
      if (!res.ok) throw new Error()
      setNotices(await res.json())
    } catch {
      toast.error('공지 목록을 불러오는 데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchNotices() }, [fetchNotices])

  const filtered = useMemo(() =>
    notices.filter((n) => {
      const matchFilter =
        filter === '전체' ||
        (filter === '비교과' && n.source.startsWith('비교과')) ||
        (filter === '학과' && n.source.startsWith('학과')) ||
        (filter === '포털' && n.source.startsWith('포털'))
      const q = search.toLowerCase()
      const matchSearch =
        !q || n.title.toLowerCase().includes(q) || (n.summary ?? '').toLowerCase().includes(q)
      return matchFilter && matchSearch
    }), [notices, filter, search])

  const counts = useMemo(() => ({
    전체: notices.length,
    비교과: notices.filter((n) => n.source.startsWith('비교과')).length,
    학과: notices.filter((n) => n.source.startsWith('학과')).length,
    포털: notices.filter((n) => n.source.startsWith('포털')).length,
  }), [notices])

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleOpenModal = () => {
    if (!session) {
      toast('Google 계정으로 로그인이 필요합니다.', {
        action: { label: '로그인', onClick: () => signIn('google') },
      })
      return
    }
    setShowModal(true)
  }

  const handleConfirm = async (drafts: EventDraft[]) => {
    try {
      const res = await fetch('/api/calendar/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drafts }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? '캘린더 추가에 실패했습니다.')
        return
      }
      toast.success(
        `${data.added}개 일정이 Google Calendar에 추가됐습니다!` +
        (data.failed > 0 ? ` (${data.failed}개 실패)` : '')
      )
      setSelected(new Set())
      setShowModal(false)
    } catch {
      toast.error('네트워크 오류가 발생했습니다.')
    }
  }

  const selectedNotices = notices.filter((n) => selected.has(n.id))

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 pb-28">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-gray-900">공지 목록</h1>
          <p className="text-sm text-gray-500 mt-1">
            원하는 공지를 선택하고 Google Calendar에 추가하세요.
          </p>
        </div>

        {!session && (
          <div className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 mb-6">
            <LogIn className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">
                Google Calendar에 추가하려면 로그인이 필요해요
              </p>
              <p className="text-xs text-blue-600 mt-0.5">공지는 로그인 없이도 볼 수 있습니다.</p>
            </div>
            <button
              onClick={() => signIn('google')}
              className="flex-shrink-0 bg-cnu-blue text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-cnu-light transition-colors"
            >
              로그인
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="공지 제목이나 내용으로 검색..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-cnu-light focus:ring-2 focus:ring-cnu-light/20 transition-all"
            />
          </div>
          <button
            onClick={fetchNotices}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:block">새로고침</span>
          </button>
        </div>

        <div className="mb-6">
          <FilterBar active={filter} onChange={setFilter} counts={counts} />
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border-2 border-gray-100 p-5 h-52 animate-pulse">
                <div className="w-16 h-5 bg-gray-100 rounded-full mb-3" />
                <div className="w-3/4 h-4 bg-gray-100 rounded mb-2" />
                <div className="w-full h-3 bg-gray-100 rounded mb-1.5" />
                <div className="w-5/6 h-3 bg-gray-100 rounded mb-1.5" />
                <div className="w-2/3 h-3 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">
              {search ? '검색 결과가 없습니다.' : '공지사항이 없습니다.'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-3 text-sm text-cnu-light hover:underline">
                검색 초기화
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">총 {filtered.length}개</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((notice) => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  selected={selected.has(notice.id)}
                  onToggle={toggleSelect}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <FloatingCalendarBar
        count={selected.size}
        loading={false}
        onAdd={handleOpenModal}
        onClear={() => setSelected(new Set())}
      />

      {showModal && (
        <CalendarReviewModal
          notices={selectedNotices}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}
