'use client'

import { MessageSquareText } from 'lucide-react'

// 구글 폼 URL. .env.local 에 NEXT_PUBLIC_FEEDBACK_FORM_URL 로 주입.
const FEEDBACK_FORM_URL =
  process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL ?? 'https://forms.gle/CtE26aTb9bKq2vRo7'

export default function FeedbackButton() {
  return (
    <a
      href={FEEDBACK_FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="피드백 보내기"
      className="group fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-cnu-blue text-white pl-4 pr-5 py-3 shadow-2xl shadow-blue-900/40 border border-white/10 hover:bg-cnu-light active:scale-[0.97] transition-all"
    >
      <MessageSquareText className="w-5 h-5" />
      <span className="text-sm font-semibold">피드백</span>
    </a>
  )
}
