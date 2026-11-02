import type { Metadata, Viewport } from 'next'
import './globals.css'
import SessionProvider from '@/components/SessionProvider'
import FeedbackButton from '@/components/FeedbackButton'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'AGENTIVE — 충남대 컴퓨터인공지능학부 공지 캘린더',
  description: '충남대 컴퓨터인공지능학부 학생을 위한 학교·학부 공지와 비교과 활동을 Google Calendar에 손쉽게 추가하세요.',
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'AGENTIVE' },
}

export const viewport: Viewport = {
  themeColor: '#003399',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <SessionProvider>
          {children}
          <FeedbackButton />
          <Toaster position="top-center" richColors />
        </SessionProvider>
      </body>
    </html>
  )
}
