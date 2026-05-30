import Link from 'next/link'
import Header from '@/components/Header'
import { CalendarDays, Bell, Zap, ChevronRight, ArrowRight, Clock, Users, BookOpen } from 'lucide-react'

const features = [
  {
    icon: Bell,
    title: '실시간 공지 수집',
    desc: 'CNU with U 비교과 활동과 학과 공지사항을 3시간마다 자동으로 수집합니다.',
    gradient: 'from-purple-500 to-purple-600',
    glow: 'shadow-purple-200',
    step: '01',
  },
  {
    icon: Zap,
    title: 'AI 핵심 요약',
    desc: 'Claude AI가 공지의 핵심 내용을 3줄로 요약해 빠르게 파악할 수 있게 합니다.',
    gradient: 'from-amber-400 to-orange-500',
    glow: 'shadow-amber-200',
    step: '02',
  },
  {
    icon: CalendarDays,
    title: 'Google Calendar 연동',
    desc: '마음에 드는 공지를 선택하면 Google Calendar에 자동으로 일정을 추가합니다.',
    gradient: 'from-blue-500 to-cnu-light',
    glow: 'shadow-blue-200',
    step: '03',
  },
]

const stats = [
  { icon: BookOpen, value: '매 3시간', label: '자동 수집 주기' },
  { icon: Zap, value: 'AI 요약', label: 'Claude 기반' },
  { icon: Clock, value: '원클릭', label: '캘린더 추가' },
  { icon: Users, value: '무료', label: '충남대 학생 누구나' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#001f5c] via-cnu-blue to-[#0041A8] py-28 px-4">
          <div className="dot-pattern absolute inset-0 pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-cnu-accent/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative max-w-3xl mx-auto text-center animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium px-4 py-1.5 rounded-full border border-white/20 mb-8">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              자동 수집 운영 중
              <span className="w-px h-3 bg-white/30" />
              <span className="text-white/70 text-xs">3시간 주기</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold text-white leading-tight mb-6 tracking-tight">
              충남대 공지사항을
              <br />
              <span className="text-cnu-accent">내 캘린더</span>에 담아두세요
            </h1>

            <p className="text-lg text-white/75 leading-relaxed mb-10 max-w-xl mx-auto">
              비교과 활동 신청기간, 학과 공지 마감일을 놓치지 마세요.
              <br />
              원하는 공지를 선택하면 Google Calendar에 자동으로 추가됩니다.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/notices"
                className="inline-flex items-center gap-2 bg-white text-cnu-blue font-semibold text-base px-7 py-3.5 rounded-xl hover:bg-blue-50 active:scale-[0.98] transition-all shadow-xl shadow-black/20"
              >
                공지 둘러보기
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white font-medium text-sm px-5 py-3.5 rounded-xl border border-white/20 hover:border-white/40 hover:bg-white/10 transition-all"
              >
                더 알아보기
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="bg-white border-b border-gray-100 py-6 px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-cnu-blue" />
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm leading-tight">{value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-5xl mx-auto px-4 sm:px-6 py-24">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold text-cnu-light bg-blue-50 px-3 py-1 rounded-full mb-4 tracking-wider uppercase">
              주요 기능
            </span>
            <h2 className="text-3xl font-bold text-gray-900">
              이런 기능을 제공해요
            </h2>
            <p className="text-gray-500 mt-3 text-base max-w-md mx-auto">
              공지 수집부터 캘린더 등록까지, 3단계로 간편하게.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, gradient, glow, step }) => (
              <div
                key={title}
                className="group relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
              >
                <div className="absolute top-4 right-4 text-5xl font-black text-gray-50 leading-none select-none group-hover:text-gray-100 transition-colors">
                  {step}
                </div>
                <div className={`relative w-12 h-12 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center mb-5 shadow-lg ${glow}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-base">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-gray-50 border-y border-gray-100 py-24 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-semibold text-cnu-light bg-blue-50 px-3 py-1 rounded-full mb-4 tracking-wider uppercase">
                사용 방법
              </span>
              <h2 className="text-3xl font-bold text-gray-900">
                딱 3단계면 충분해요
              </h2>
            </div>

            <div className="space-y-4">
              {[
                { n: '1', title: 'Google 계정으로 로그인', desc: '간단하게 구글 계정 하나로 시작할 수 있어요.' },
                { n: '2', title: '원하는 공지 선택', desc: 'AI 요약을 보고 마음에 드는 공지를 탭해서 선택하세요.' },
                { n: '3', title: '캘린더에 추가', desc: '선택한 공지의 날짜가 Google Calendar에 자동으로 등록됩니다.' },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex gap-5 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cnu-blue to-cnu-light flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {n}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 mb-0.5">{title}</div>
                    <div className="text-sm text-gray-500">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-br from-gray-900 to-gray-800 py-20 px-4 relative overflow-hidden">
          <div className="dot-pattern absolute inset-0 opacity-30 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-1 bg-gradient-to-r from-transparent via-cnu-accent to-transparent" />
          <div className="relative max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">지금 바로 시작해보세요</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Google 계정으로 로그인하면 바로 캘린더에 일정을 추가할 수 있어요.
              <br />
              <span className="text-gray-500 text-sm">무료로 이용 가능하며 별도 설치가 필요 없습니다.</span>
            </p>
            <Link
              href="/notices"
              className="inline-flex items-center gap-2 bg-white text-cnu-blue font-semibold px-7 py-3.5 rounded-xl hover:bg-blue-50 active:scale-[0.98] transition-all shadow-lg"
            >
              공지 보러 가기
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-gray-100 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cnu-blue to-cnu-light flex items-center justify-center">
              <CalendarDays className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-800 text-sm">AGENTIVE</span>
          </div>
          <p className="text-sm text-gray-400">
            © 2025 AGENTIVE — 충남대학교 공지 알리미
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            서비스 정상 운영 중
          </div>
        </div>
      </footer>
    </div>
  )
}
