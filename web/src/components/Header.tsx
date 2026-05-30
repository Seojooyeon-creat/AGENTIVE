'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { LogIn, LogOut, CalendarDays, ChevronDown } from 'lucide-react'

export default function Header() {
  const { data: session, status } = useSession()

  return (
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => signOut()}
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
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
                </button>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-all"
                  title="로그아웃"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:block">로그아웃</span>
                </button>
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
  )
}
