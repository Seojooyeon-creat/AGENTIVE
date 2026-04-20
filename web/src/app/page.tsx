import Link from 'next/link'
import Header from '@/components/Header'
import { CalendarDays, Bell, Zap, ChevronRight } from 'lucide-react'

const features = [
  {
    icon: Bell,
    title: '실시간 공지 수집',
    desc: 'CNU with U 비교과 활동과 학과 공지사항을 3시간마다 자동으로 수집합니다.',
    color: 'text-purple-500',
    bg: 'bg-purple-50',
  },
  {
    icon: CalendarDays,
    title: 'Google Calendar 연동',
    desc: '마음에 드는 공지를 선택하면 Google Calendar에 자동으로 일정을 추가합니다.',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    icon: Zap,
    title: 'AI 요약 제공',
    desc: 'Claude AI가 공지의 핵심 내용을 3줄로 요약해 빠르게 파악할 수 있게 합니다.',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-br from-cnu-blue via-[#0041A8] to-cnu-light py-24 px-4">
          {/* 배경 장식 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
          </div>

          <div className="relative max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium px-4 py-1.5 rounded-full border border-white/20 mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              자동 수집 운영 중
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-5">
              충남대 공지사항을
              <br />
              <span className="text-cnu-accent">내 캘린더</span>에 담아두세요
            </h1>

            <p className="text-lg text-white/80 leading-relaxed mb-10 max-w-xl mx-auto">
              비교과 활동 신청기간, 학과 공지 마감일을 놓치지 마세요.
              <br />
              원하는 공지를 선택하면 Google Calendar에 자동으로 추가됩니다.
            </p>

            <Link
              href="/notices"
              className="inline-flex items-center gap-2 bg-white text-cnu-blue font-semibold text-base px-7 py-3.5 rounded-xl hover:bg-blue-50 transition-colors shadow-lg shadow-black/20"
            >
              공지 둘러보기
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            이런 기능을 제공해요
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gray-900 py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-4">지금 바로 시작해보세요</h2>
            <p className="text-gray-400 mb-8">
              Google 계정으로 로그인하면 바로 캘린더에 일정을 추가할 수 있어요.
            </p>
            <Link
              href="/notices"
              className="inline-flex items-center gap-2 bg-cnu-blue text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-cnu-light transition-colors"
            >
              공지 보러 가기
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-gray-100 py-6 px-4 text-center text-sm text-gray-400">
        © 2025 AGENTIVE — 충남대학교 공지 알리미
      </footer>
    </div>
  )
}
