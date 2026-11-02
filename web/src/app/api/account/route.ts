import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * 회원 탈퇴 (Google 접근 권한 회수).
 *
 * 이 앱은 사용자 정보를 자체 DB에 저장하지 않는다(next-auth JWT 방식).
 * 따라서 "탈퇴"는 사용자가 로그인 시 부여한 Google OAuth 권한
 * (calendar.events · profile · email)을 회수하는 것을 의미한다.
 * access token을 회수하면 offline 권한으로 발급된 refresh token까지 함께 회수된다.
 * 세션 쿠키 정리는 클라이언트의 signOut()이 담당한다.
 */
export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token?.accessToken) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const res = await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: token.accessToken as string }),
  })

  // 이미 만료·회수된 토큰이면 Google이 400을 반환한다.
  // 결과적으로 권한이 없는 상태이므로 탈퇴로선 성공으로 간주한다.
  if (!res.ok && res.status !== 400) {
    const body = await res.json().catch(() => ({}))
    return NextResponse.json(
      { error: body?.error_description ?? body?.error ?? '권한 회수에 실패했습니다.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
