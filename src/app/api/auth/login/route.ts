import { NextRequest, NextResponse } from 'next/server'
import { verifyUser } from '@/lib/users'
import { createSessionToken, COOKIE_NAME, MAX_AGE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { id, password } = await req.json()

  if (!verifyUser(id, password)) {
    return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 })
  }

  const token = await createSessionToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
  return res
}
