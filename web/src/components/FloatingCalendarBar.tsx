'use client'

import { CalendarPlus, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  count: number
  loading: boolean
  onAdd: () => void
  onClear: () => void
}

export default function FloatingCalendarBar({ count, loading, onAdd, onClear }: Props) {
  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300',
        count > 0
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
      )}
    >
      <div className="flex items-center gap-3 bg-gray-900 text-white rounded-2xl px-5 py-3.5 shadow-2xl shadow-black/30 border border-white/10">
        <span className="text-sm font-medium">
          <span className="font-bold text-cnu-accent">{count}개</span> 선택됨
        </span>

        <div className="w-px h-5 bg-white/20" />

        <button
          onClick={onAdd}
          disabled={loading}
          className="flex items-center gap-2 bg-cnu-blue hover:bg-cnu-light text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CalendarPlus className="w-4 h-4" />
          )}
          {loading ? '추가 중...' : '캘린더에 추가'}
        </button>

        <button
          onClick={onClear}
          disabled={loading}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="선택 취소"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>
    </div>
  )
}
