'use client'

import { useEffect, useRef, useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { LogIn, LogOut, CalendarDays, ChevronDown, UserX, Bell } from 'lucide-react'
import WithdrawModal from './WithdrawModal'
import KeywordModal from './KeywordModal'

export default function Header() {
  const { data: session, status } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [keywordOpen, setKeywordOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  return (
    <>
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-gray-100/80 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cnu-blue to-cnu-light flex items-center justify-center shadow-md shadow-blue-200 group-hover:shadow-blue-300 transition-shadow">
            <CalendarDays className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-base text-gray-900 tracking-tight group-hover:text-cnu-blue transition-colors">
              AGENTIVE
            </span>
            <span className="text-[10px] font-semibold text-cnu-light bg-blue-50 px-1.5 py-0.5 rounded-md leading-none">
              Beta
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <Link
            href="/notices"
            className="text-sm font-medium text-gray-600 hover:text-cnu-blue hover:bg-blue-50 px-3 py-2 rounded-lg transition-all"
          >
            공지 목록
          </Link>

          <div className="ml-2 pl-2 border-l border-gray-200">
            {status === 'loading' ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            ) : session ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-all"
                >
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name ?? ''}
                      width={28}
                      height={28}
                      className="rounded-full ring-2 ring-white shadow-sm"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-cnu-blue flex items-center justify-center text-white text-xs font-bold">
                      {session.user?.name?.[0] ?? 'U'}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[100px] truncate">
                    {session.user?.name}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-400 hidden sm:block transition-transform ${
                      menuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white border border-gray-100 shadow-xl shadow-gray-200/60 p-1.5 animate-slide-up origin-top-right">
                    <div className="px-3 py-2 border-b border-gray-50 mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {session.user?.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        setKeywordOpen(true)
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      <Bell className="w-4 h-4 text-gray-400" />
                      관심 키워드
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        signOut()
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-gray-400" />
                      로그아웃
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        setWithdrawOpen(true)
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <UserX className="w-4 h-4" />
                      회원 탈퇴
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="flex items-center gap-2 bg-cnu-blue text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-cnu-light active:scale-[0.97] transition-all shadow-sm shadow-blue-200"
              >
                <LogIn className="w-4 h-4" />
                <span>Google 로그인</span>
              </button>
            )}
          </div>
        </nav>
      </div>
    </header>

    {/* header의 backdrop-blur가 fixed 기준 컨테이너가 되어 모달이 잘리므로 header 밖에서 렌더 */}
    {withdrawOpen && <WithdrawModal onClose={() => setWithdrawOpen(false)} />}
    {keywordOpen && <KeywordModal onClose={() => setKeywordOpen(false)} />}
    </>
  )
}
