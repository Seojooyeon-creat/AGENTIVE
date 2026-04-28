'use client'

import { type Notice, getSourceMeta, formatDisplayDate, formatPeriod } from '@/lib/utils'
import { ExternalLink, Calendar, Check, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  notice: Notice
  selected: boolean
  onToggle: (id: string) => void
}

export default function NoticeCard({ notice, selected, onToggle }: Props) {
  const meta = getSourceMeta(notice.source)
  const displayDate = formatDisplayDate(notice.date, notice.posted_at)
  const activityPeriod = formatPeriod(notice.activity_start, notice.activity_end)

  return (
    <div
      onClick={() => onToggle(notice.id)}
      className={cn(
        'relative bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200 hover:shadow-md group',
        selected
          ? 'border-cnu-light shadow-md shadow-blue-100 ring-1 ring-cnu-light/30'
          : 'border-gray-100 hover:border-gray-200'
      )}
    >
      {/* 선택 체크박스 */}
      <div
        className={cn(
          'absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0',
          selected
            ? 'bg-cnu-blue border-cnu-blue'
            : 'border-gray-300 group-hover:border-cnu-light'
        )}
      >
        {selected && <Check className="w-3 h-3 text-white stroke-[3]" />}
      </div>

      {/* 소스 배지 */}
      <span
        className={cn(
          'inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border mb-3',
          meta.badgeClass
        )}
      >
        {meta.label}
      </span>

      {/* 제목 */}
      <h3 className="font-semibold text-gray-900 text-sm leading-snug pr-8 mb-2 line-clamp-2">
        {notice.title}
      </h3>

      {/* 요약 */}
      {notice.summary && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 mb-3">
          {notice.summary
            .replace(/📌\s*\*\*핵심 내용\*\*:\s*/g, '')
            .replace(/📅\s*\*\*중요 일정\*\*:\s*/g, '')
            .replace(/✅\s*\*\*학생 행동 필요\*\*:\s*/g, '')
            .replace(/\*\*/g, '')}
        </p>
      )}

      {/* 활동 기간 */}
      {activityPeriod && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 mb-3">
          <Activity className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="font-medium">활동</span>
          <span className="text-emerald-500">{activityPeriod}</span>
        </div>
      )}

      {/* 하단 메타 정보 */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Calendar className="w-3.5 h-3.5" />
          <span>{displayDate}</span>
        </div>
        <a
          href={notice.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-cnu-light hover:text-cnu-blue font-medium transition-colors"
        >
          원문 보기
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}
