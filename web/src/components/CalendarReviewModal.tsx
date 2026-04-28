'use client'

import { useState } from 'react'
import { type Notice, buildCalendarDrafts, getSourceMeta } from '@/lib/utils'
import { X, CalendarDays, Loader2, Trash2, CalendarPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

type EventDraft = {
  notice: Notice
  title: string
  startDate: string
  endDate: string
}

type Props = {
  notices: Notice[]
  onClose: () => void
  onConfirm: (drafts: EventDraft[]) => Promise<void>
}

function toInputDate(isoDate: string) {
  return isoDate.slice(0, 10)
}

export type { EventDraft }

export default function CalendarReviewModal({ notices, onClose, onConfirm }: Props) {
  const [drafts, setDrafts] = useState<EventDraft[]>(() =>
    notices.flatMap((n) => buildCalendarDrafts(n))
  )
  const [loading, setLoading] = useState(false)

  const update = (idx: number, patch: Partial<EventDraft>) =>
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)))

  const remove = (idx: number) =>
    setDrafts((prev) => prev.filter((_, i) => i !== idx))

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm(drafts)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-white w-full sm:max-w-2xl sm:mx-4 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">캘린더 일정 확인</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              추가될 일정을 확인하고 제목·날짜를 수정할 수 있어요
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 이벤트 목록 */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {drafts.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              모든 일정이 제거됐습니다.
            </div>
          ) : (
            drafts.map((draft, idx) => {
              const meta = getSourceMeta(draft.notice.source)
              return (
                <div
                  key={draft.notice.id}
                  className="border border-gray-200 rounded-2xl p-4 space-y-3 hover:border-gray-300 transition-colors"
                >
                  {/* 배지 + 삭제 */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-xs font-semibold px-2.5 py-1 rounded-full border',
                        meta.badgeClass
                      )}
                    >
                      {meta.label}
                    </span>
                    <button
                      onClick={() => remove(idx)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="이 일정 제거"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 제목 편집 */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">
                      일정 제목
                    </label>
                    <input
                      type="text"
                      value={draft.title}
                      onChange={(e) => update(idx, { title: e.target.value })}
                      className="w-full text-sm font-medium text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-cnu-light focus:ring-2 focus:ring-cnu-light/20 transition-all"
                    />
                  </div>

                  {/* 날짜 편집 */}
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-1">
                        <label className="text-xs text-gray-400 mb-1 block">시작일</label>
                        <input
                          type="date"
                          value={toInputDate(draft.startDate)}
                          onChange={(e) => update(idx, { startDate: e.target.value })}
                          className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cnu-light focus:ring-2 focus:ring-cnu-light/20 transition-all"
                        />
                      </div>
                      <span className="text-gray-400 text-sm mt-4">~</span>
                      <div className="flex-1">
                        <label className="text-xs text-gray-400 mb-1 block">종료일</label>
                        <input
                          type="date"
                          value={toInputDate(draft.endDate)}
                          onChange={(e) => update(idx, { endDate: e.target.value })}
                          className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cnu-light focus:ring-2 focus:ring-cnu-light/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex-shrink-0 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{drafts.length}개</span> 일정 추가 예정
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || drafts.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-cnu-blue rounded-xl hover:bg-cnu-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CalendarPlus className="w-4 h-4" />
              )}
              {loading ? '추가 중...' : 'Google Calendar에 추가'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
