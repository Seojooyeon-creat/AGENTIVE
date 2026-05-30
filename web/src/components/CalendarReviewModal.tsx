'use client'

import { useState } from 'react'
import { type Notice, buildCalendarDrafts, getSourceMeta } from '@/lib/utils'
import { X, CalendarDays, Loader2, Trash2, CalendarPlus, CheckCircle2 } from 'lucide-react'
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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white w-full sm:max-w-2xl sm:mx-4 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-up">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cnu-blue to-cnu-light flex items-center justify-center shadow-md shadow-blue-200">
              <CalendarDays className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">캘린더 일정 확인</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                제목과 날짜를 수정한 뒤 추가하세요
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Event list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {drafts.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-gray-500 text-sm font-medium">모든 일정이 제거됐습니다.</p>
            </div>
          ) : (
            drafts.map((draft, idx) => {
              const meta = getSourceMeta(draft.notice.source)
              return (
                <div
                  key={draft.notice.id}
                  className="group border border-gray-200 rounded-2xl p-4 space-y-3.5 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  {/* Badge + delete */}
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
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="이 일정 제거"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title input */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 block">
                      일정 제목
                    </label>
                    <input
                      type="text"
                      value={draft.title}
                      onChange={(e) => update(idx, { title: e.target.value })}
                      className="w-full text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:bg-white focus:border-cnu-light focus:ring-2 focus:ring-cnu-light/20 transition-all"
                    />
                  </div>

                  {/* Date inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1.5 block">시작일</label>
                      <input
                        type="date"
                        value={toInputDate(draft.startDate)}
                        onChange={(e) => update(idx, { startDate: e.target.value })}
                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:bg-white focus:border-cnu-light focus:ring-2 focus:ring-cnu-light/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1.5 block">종료일</label>
                      <input
                        type="date"
                        value={toInputDate(draft.endDate)}
                        onChange={(e) => update(idx, { endDate: e.target.value })}
                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:bg-white focus:border-cnu-light focus:ring-2 focus:ring-cnu-light/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex-shrink-0 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            <span className="font-bold text-gray-900">{drafts.length}개</span>
            <span className="text-gray-400"> 일정 추가 예정</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || drafts.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-cnu-blue to-cnu-light rounded-xl hover:from-cnu-light hover:to-cnu-blue active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-200"
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
