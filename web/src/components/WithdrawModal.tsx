'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { X, UserX, Loader2, AlertTriangle } from 'lucide-react'

type Props = {
  onClose: () => void
}

export default function WithdrawModal({ onClose }: Props) {
  const [loading, setLoading] = useState(false)

  const handleWithdraw = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? '탈퇴 처리에 실패했습니다.')
      }
      toast.success('탈퇴가 완료됐습니다. Google 접근 권한이 회수됐어요.')
      // 세션 쿠키 정리 + 홈으로 이동
      await signOut({ callbackUrl: '/' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '탈퇴 처리에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />

      <div className="relative bg-white w-full sm:max-w-md sm:mx-4 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col animate-slide-up">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-md shadow-red-200">
              <UserX className="w-4.5 h-4.5 text-white" />
            </div>
            <h2 className="text-base font-bold text-gray-900">회원 탈퇴</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-40"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            탈퇴하면 AGENTIVE에 부여한 <span className="font-semibold text-gray-900">Google 접근 권한</span>
            (캘린더·프로필)이 즉시 회수되고 로그아웃됩니다.
          </p>

          <div className="flex gap-2.5 rounded-xl bg-amber-50 border border-amber-100 px-3.5 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              이미 Google Calendar에 추가한 일정은 삭제되지 않습니다. 다시 이용하려면
              언제든 Google 로그인으로 재가입할 수 있어요.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleWithdraw}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-200"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
            {loading ? '처리 중...' : '탈퇴하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
