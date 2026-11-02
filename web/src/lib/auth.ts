import { NextAuthOptions } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import GoogleProvider from 'next-auth/providers/google'

/** Google 액세스 토큰은 1시간이면 만료된다. refresh_token으로 새 토큰을 받아온다. */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken!,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error_description ?? data.error)
    return {
      ...token,
      accessToken: data.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
      error: undefined,
    }
  } catch (e) {
    console.error('[auth] 토큰 갱신 실패:', e)
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'profile',
            'email',
            'https://www.googleapis.com/auth/calendar.events',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  pages: {
    signIn: '/notices',
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        }
      }
      // 만료 1분 전부터 갱신
      if (token.expiresAt && Date.now() / 1000 < token.expiresAt - 60) return token
      if (!token.refreshToken) return { ...token, error: 'RefreshAccessTokenError' }
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.error = token.error
      return session
    },
  },
}
