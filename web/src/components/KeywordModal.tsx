'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { X, Bell, Plus, Loader2 } from 'lucide-react'
import PushToggle from './PushToggle'

type Props = {
  onClose: () => void
  onChange?: (keywords: string[]) => void
}

const MAX_KEYWORDS = 10
const MAX_LENGTH = 20

export default function KeywordModal({ onClose, onChange }: Props) {
  const [keywords, setKeywords] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const update = (next: string[]) => {
    setKeywords(next)
    onChange?.(next)
  }

  useEffect(() => {
    fetch('/api/keywords')
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error)
        setKeywords((await res.json()).keywords)
      })
      .catch((e) => toast.error(e.message ?? '키워드를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const keyword = input.trim()
    if (!keyword || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error)
      if (!keywords.includes(body.keyword)) update([...keywords, body.keyword])
      setInput('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '등록에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (keyword: string) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/keywords', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      update(keywords.filter((k) => k !== keyword))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col animate-slide-up">
        <div className="sm:hidden w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3" />

        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-cnu-blue" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">관심 키워드</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                AI가 새 공지마다 관련 여부를 판단해 표시해드려요.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" aria-label="닫기">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={add} className="px-6 pb-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={MAX_LENGTH}
            placeholder="예: 인턴십, 장학, 공모전"
            disabled={loading || keywords.length >= MAX_KEYWORDS}
            className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-cnu-light focus:ring-2 focus:ring-cnu-light/20 transition-all placeholder:text-gray-400 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || loading || !input.trim() || keywords.length >= MAX_KEYWORDS}
            className="flex items-center gap-1.5 bg-cnu-blue text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-cnu-light active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            추가
          </button>
        </form>

        <div className="px-6 pb-6 min-h-[88px]">
          {loading ? (
            <div className="flex gap-2">
              {['w-16', 'w-20', 'w-12'].map((w) => (
                <div key={w} className={`h-8 ${w} animate-shimmer rounded-full`} />
              ))}
            </div>
          ) : keywords.length === 0 ? (
            <p className="text-sm text-gray-400 py-3">
              등록한 키워드가 없어요. 관심 있는 주제를 추가해보세요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {keywords.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full bg-blue-50 text-cnu-blue text-sm font-medium border border-blue-100"
                >
                  {k}
                  <button
                    onClick={() => remove(k)}
                    disabled={busy}
                    className="p-0.5 rounded-full hover:bg-blue-100 text-blue-400 hover:text-cnu-blue transition-colors disabled:opacity-50"
                    aria-label={`${k} 삭제`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-3">
            {keywords.length}/{MAX_KEYWORDS}개 · 키워드당 {MAX_LENGTH}자 이내
          </p>
        </div>

        <div className="px-6 pb-6 pt-4 border-t border-gray-100">
          <PushToggle />
        </div>
      </div>
    </div>
  )
}
