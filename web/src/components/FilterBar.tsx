'use client'

import { cn } from '@/lib/utils'

const FILTERS = ['전체', '비교과', '학과'] as const
export type FilterType = (typeof FILTERS)[number]

type Props = {
  active: FilterType
  onChange: (f: FilterType) => void
  counts: Record<FilterType, number>
}

export default function FilterBar({ active, onChange, counts }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border',
            active === filter
              ? 'bg-cnu-blue text-white border-cnu-blue shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-cnu-light hover:text-cnu-blue'
          )}
        >
          {filter}
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-semibold',
              active === filter
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 text-gray-500'
            )}
          >
            {counts[filter]}
          </span>
        </button>
      ))}
    </div>
  )
}
