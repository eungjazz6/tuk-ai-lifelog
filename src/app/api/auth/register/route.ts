import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/users'
import { createSessionToken, COOKIE_NAME, MAX_AGE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { id, password } = await req.json()

  if (!id || !password) {
    return NextResponse.json({ error: '아이디와 비밀번호를 입력해주세요.' }, { status: 400 })
  }
  if (id.length < 2) {
    return NextResponse.json({ error: '아이디는 2자 이상이어야 합니다.' }, { status: 400 })
  }
  if (password.length < 4) {
    return NextResponse.json({ error: '비밀번호는 4자 이상이어야 합니다.' }, { status: 400 })
  }

  const result = registerUser(id, password)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 })
  }

  // 가입 후 자동 로그인
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
