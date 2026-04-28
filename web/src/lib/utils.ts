import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type Notice = {
  id: string
  source: string
  title: string
  url: string
  date: string | null
  summary: string | null
  apply_start: string | null
  apply_deadline: string | null
  activity_start: string | null
  activity_end: string | null
  posted_at: string
}

export type CalendarEventDates = {
  start: string
  end: string
  isAllDay: boolean
}

export function parseCalendarDates(notice: Notice): CalendarEventDates {
  const fallback = notice.posted_at.slice(0, 10)

  if (notice.date) {
    // "신청기간 2025.03.01 ~ 2025.03.15" 형식 파싱
    const rangeMatch = notice.date.match(
      /(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})\s*~\s*(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})/
    )
    if (rangeMatch) {
      const [, sy, sm, sd, ey, em, ed] = rangeMatch
      const start = `${sy}-${sm.padStart(2, '0')}-${sd.padStart(2, '0')}`
      const endDate = new Date(`${ey}-${em.padStart(2, '0')}-${ed.padStart(2, '0')}`)
      endDate.setDate(endDate.getDate() + 1)
      const end = endDate.toISOString().slice(0, 10)
      return { start, end, isAllDay: true }
    }

    // 단일 날짜 "2025.03.15" 형식 파싱
    const singleMatch = notice.date.match(/(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})/)
    if (singleMatch) {
      const [, y, m, d] = singleMatch
      const start = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      const endDate = new Date(start)
      endDate.setDate(endDate.getDate() + 1)
      return { start, end: endDate.toISOString().slice(0, 10), isAllDay: true }
    }
  }

  const endDate = new Date(fallback)
  endDate.setDate(endDate.getDate() + 1)
  return { start: fallback, end: endDate.toISOString().slice(0, 10), isAllDay: true }
}

export type SourceMeta = {
  label: string
  color: string
  badgeClass: string
}

export function getSourceMeta(source: string): SourceMeta {
  if (source.startsWith('비교과')) {
    return {
      label: '비교과',
      color: '#7C3AED',
      badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    }
  }
  if (source.startsWith('학과')) {
    return {
      label: '학과 공지',
      color: '#059669',
      badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    }
  }
  return {
    label: '포털 공지',
    color: '#2563EB',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
  }
}

export function formatPeriod(start: string | null, end: string | null): string | null {
  if (!start && !end) return null
  const fmt = (iso: string) => iso.replace(/-/g, '.')
  if (start && end) return `${fmt(start)} ~ ${fmt(end)}`
  if (start) return `${fmt(start)} ~`
  return `~ ${fmt(end!)}`
}

export function formatDisplayDate(date: string | null, postedAt: string): string {
  if (date) {
    // "신청기간 2026.04.22 00:00~2026.04.28 23:59" → "2026.04.22 ~ 2026.04.28"
    const cleaned = date
      .replace(/신청기간\s*/g, '')
      .replace(/\s*\d{2}:\d{2}/g, '')   // 시간 제거
      .replace(/~/g, '~')
      .trim()
    return cleaned
  }
  return new Date(postedAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

type CalendarDraft = {
  notice: Notice
  title: string
  startDate: string
  endDate: string
}

function nextDay(iso: string): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function buildCalendarDrafts(notice: Notice): CalendarDraft[] {
  // 활동 기간 이벤트
  if (notice.activity_start || notice.activity_end) {
    const start = notice.activity_start ?? notice.activity_end!
    const end = notice.activity_end
      ? nextDay(notice.activity_end)
      : nextDay(notice.activity_start!)
    return [{ notice, title: notice.title, startDate: start, endDate: end }]
  }

  // 활동 기간 없으면 기존 date 필드로 폴백
  const { start, end } = parseCalendarDates(notice)
  return [{ notice, title: notice.title, startDate: start, endDate: end }]
}
