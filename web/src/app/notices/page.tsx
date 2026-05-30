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
import { Search, RefreshCw, LogIn, Inbox, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusTab = '진행중' | '만료됨'

export default function NoticesPage() {
  const { data: session } = useSession()

  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState<StatusTab>('진행중')
  const [filter, setFilter] = useState<FilterType>('전체')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

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

  const isExpiredNotice = (n: Notice): boolean => {
    if (n.apply_deadline) return new Date(n.apply_deadline) < today
    if (n.date) {
      const match = n.date.match(/~\s*(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})/)
      if (match) {
        const [, y, m, d] = match
        return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`) < today
      }
    }
    return false
  }

  const statusCounts = useMemo(() => {
    const expired = notices.filter(isExpiredNotice).length
    return { 진행중: notices.length - expired, 만료됨: expired }
  }, [notices, today])

  const filtered = useMemo(() =>
    notices.filter((n) => {
      const expired = isExpiredNotice(n)
      if (statusTab === '진행중' && expired) return false
      if (statusTab === '만료됨' && !expired) return false
      const matchFilter =
        filter === '전체' ||
        (filter === '비교과' && n.source.startsWith('비교과')) ||
        (filter === '학과' && n.source.startsWith('학과')) ||
        (filter === '소프트웨어중심대학사업단' && n.source.startsWith('소중대'))

      const q = search.toLowerCase()
      const matchSearch =
        !q || n.title.toLowerCase().includes(q) || (n.summary ?? '').toLowerCase().includes(q)
      return matchFilter && matchSearch
    }), [notices, filter, search, statusTab, today])

  const counts = useMemo(() => {
    const base = notices.filter((n) => {
      const expired = isExpiredNotice(n)
      return statusTab === '진행중' ? !expired : expired
    })
    return {
      전체: base.length,
      비교과: base.filter((n) => n.source.startsWith('비교과')).length,
      학과: base.filter((n) => n.source.startsWith('학과')).length,
      소프트웨어중심대학사업단: base.filter((n) => n.source.startsWith('소중대')).length,
    }
  }, [notices, statusTab, today])

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

      {/* Page Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">공지 목록</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                원하는 공지를 선택하고 Google Calendar에 추가하세요.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:block">총 {notices.length}개</span>
            </div>
          </div>

          {/* Search + Refresh */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="공지 제목이나 내용으로 검색..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-cnu-light focus:ring-2 focus:ring-cnu-light/20 transition-all placeholder:text-gray-400"
              />
            </div>
            <button
              onClick={fetchNotices}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-white hover:border-gray-300 hover:text-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cnu-light' : ''}`} />
              <span className="hidden sm:block">{loading ? '로딩 중' : '새로고침'}</span>
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-3">
            {(['진행중', '만료됨'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setStatusTab(tab); setSelected(new Set()) }}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                  statusTab === tab
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {tab}
                <span className="ml-1.5 text-xs tabular-nums opacity-70">
                  {statusCounts[tab]}
                </span>
              </button>
            ))}
          </div>

          {/* Filter Bar */}
          <FilterBar active={filter} onChange={setFilter} counts={counts} />
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 pb-28">
        {/* Login Banner */}
        {!session && (
          <div className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 rounded-2xl px-5 py-4 mb-6">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <LogIn className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">
                Google Calendar에 추가하려면 로그인이 필요해요
              </p>
              <p className="text-xs text-blue-500 mt-0.5">공지는 로그인 없이도 볼 수 있습니다.</p>
            </div>
            <button
              onClick={() => signIn('google')}
              className="flex-shrink-0 bg-cnu-blue text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-cnu-light active:scale-[0.97] transition-all shadow-sm"
            >
              로그인
            </button>
          </div>
        )}

        {/* Notice Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border-2 border-gray-100 p-5 h-56 overflow-hidden"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-14 h-5 animate-shimmer rounded-full" />
                  <div className="w-5 h-5 animate-shimmer rounded-full" />
                </div>
                <div className="w-4/5 h-4 animate-shimmer rounded-lg mb-2" />
                <div className="w-full h-3 animate-shimmer rounded mb-1.5" />
                <div className="w-11/12 h-3 animate-shimmer rounded mb-1.5" />
                <div className="w-3/4 h-3 animate-shimmer rounded mb-4" />
                <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between">
                  <div className="w-20 h-3 animate-shimmer rounded" />
                  <div className="w-14 h-3 animate-shimmer rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
              <Inbox className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-700 font-semibold text-base mb-1">
              {search ? '검색 결과가 없습니다.' : '공지사항이 없습니다.'}
            </p>
            <p className="text-gray-400 text-sm">
              {search ? '다른 키워드로 검색해보세요.' : '잠시 후 다시 확인해보세요.'}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-4 text-sm text-cnu-light hover:text-cnu-blue font-medium hover:underline transition-colors"
              >
                검색 초기화
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-gray-400">
                {search
                  ? `"${search}" 검색결과 ${filtered.length}개`
                  : `총 ${filtered.length}개의 공지`}
              </p>
              {selected.size > 0 && (
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  선택 취소 ({selected.size})
                </button>
              )}
            </div>
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
          </div>
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
