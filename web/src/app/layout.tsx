import type { Metadata } from 'next'
import './globals.css'
import SessionProvider from '@/components/SessionProvider'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'AGENTIVE — 충남대 공지 캘린더',
  description: '충남대학교 공지사항과 비교과 활동을 Google Calendar에 손쉽게 추가하세요.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <SessionProvider>
          {children}
          <Toaster position="top-center" richColors />
        </SessionProvider>
      </body>
    </html>
  )
}
