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
          : 'opacity-0 translate-y-6 pointer-events-none'
      )}
    >
      <div className="flex items-center gap-3 bg-gray-900/95 text-white rounded-2xl px-4 py-3 shadow-2xl shadow-black/40 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2 pl-1">
          <div className="w-6 h-6 rounded-lg bg-cnu-accent/20 flex items-center justify-center">
            <span className="text-xs font-black text-cnu-accent">{count}</span>
          </div>
          <span className="text-sm font-medium text-white/90">
            개 선택됨
          </span>
        </div>

        <div className="w-px h-5 bg-white/15" />

        <button
          onClick={onAdd}
          disabled={loading}
          className="flex items-center gap-2 bg-gradient-to-r from-cnu-blue to-cnu-light text-white text-sm font-semibold px-4 py-2 rounded-xl hover:from-cnu-light hover:to-cnu-blue active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-blue-900/40"
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
          className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-50"
          aria-label="선택 취소"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
