'use client'

import { type Notice, getSourceMeta, formatDisplayDate, formatPeriod, isExpired } from '@/lib/utils'
import { ExternalLink, Calendar, Check, Activity, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  notice: Notice
  selected: boolean
  onToggle: (id: string) => void
}

export default function NoticeCard({ notice, selected, onToggle }: Props) {
  const meta = getSourceMeta(notice.source)
  const displayDate = formatDisplayDate(notice.date, notice.posted_at)
  const applyPeriod = formatPeriod(notice.apply_start, notice.apply_deadline)
  const activityPeriod = formatPeriod(notice.activity_start, notice.activity_end)
  const expired = isExpired(notice)

  const cleanSummary = notice.summary
    ?.replace(/📌\s*\*\*핵심 내용\*\*:\s*/g, '')
    .replace(/📅\s*\*\*중요 일정\*\*:\s*/g, '')
    .replace(/✅\s*\*\*학생 행동 필요\*\*:\s*/g, '')
    .replace(/\*\*/g, '')
    .trim()

  return (
    <div
      onClick={() => onToggle(notice.id)}
      className={cn(
        'relative bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200 group flex flex-col',
        expired
          ? 'border-gray-100 opacity-70'
          : selected
          ? 'border-cnu-light shadow-lg shadow-blue-100/60 ring-1 ring-cnu-light/20'
          : 'border-gray-100 hover:border-gray-200 hover:shadow-md hover:-translate-y-0.5'
      )}
    >
      {/* Selected accent bar */}
      {selected && !expired && (
        <div className="absolute left-0 top-4 bottom-4 w-0.5 bg-gradient-to-b from-cnu-blue to-cnu-light rounded-r-full" />
      )}

      {/* Top row: badge + expired tag + checkbox */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border',
              meta.badgeClass
            )}
          >
            {meta.label}
          </span>
          {expired && (
            <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full border bg-gray-100 text-gray-400 border-gray-200">
              마감
            </span>
          )}
        </div>

        <div
          className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ml-2',
            selected
              ? 'bg-cnu-blue border-cnu-blue shadow-md shadow-blue-300'
              : 'border-gray-200 group-hover:border-cnu-light'
          )}
        >
          {selected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2.5 line-clamp-2">
        {notice.title}
      </h3>

      {/* Summary */}
      {cleanSummary && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 mb-3 flex-1">
          {cleanSummary}
        </p>
      )}

      {/* Apply period */}
      {applyPeriod && (
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 mb-2 w-fit border',
            expired
              ? 'text-gray-400 bg-gray-50 border-gray-100'
              : 'text-orange-700 bg-orange-50 border-orange-100'
          )}
        >
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span className="font-medium">신청기간</span>
          <span className={cn('font-mono', expired ? 'text-gray-400' : 'text-orange-600')}>
            {applyPeriod}
          </span>
        </div>
      )}

      {/* Activity period */}
      {activityPeriod && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 mb-3 w-fit">
          <Activity className="w-3 h-3 flex-shrink-0" />
          <span className="font-medium">활동기간</span>
          <span className="text-emerald-600 font-mono">{activityPeriod}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Calendar className="w-3 h-3" />
          <span>{displayDate}</span>
        </div>
        <a
          href={notice.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-cnu-light hover:text-cnu-blue font-medium transition-colors group/link"
        >
          원문 보기
          <ExternalLink className="w-3 h-3 group-hover/link:scale-110 transition-transform" />
        </a>
      </div>
    </div>
  )
}
