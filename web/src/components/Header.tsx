'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { LogIn, LogOut, CalendarDays } from 'lucide-react'

export default function Header() {
  const { data: session, status } = useSession()

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cnu-blue to-cnu-light flex items-center justify-center shadow-sm">
            <CalendarDays className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900 group-hover:text-cnu-blue transition-colors">
            AGENTIVE
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/notices"
            className="text-sm font-medium text-gray-600 hover:text-cnu-blue transition-colors"
          >
            공지 목록
          </Link>

          {status === 'loading' ? (
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
          ) : session ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {session.user?.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name ?? ''}
                    width={32}
                    height={32}
                    className="rounded-full ring-2 ring-gray-100"
                  />
                )}
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {session.user?.name}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:block">로그아웃</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn('google')}
              className="flex items-center gap-2 bg-cnu-blue text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-cnu-light transition-colors shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              Google 로그인
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
