'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const filled = mode === 'login'
    ? id && password
    : id && password && passwordConfirm

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setId('')
    setPassword('')
    setPasswordConfirm('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!filled) return

    if (mode === 'register' && password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    setError('')

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, password }),
    })

    if (res.ok) {
      window.location.href = '/'
    } else {
      const data = await res.json()
      setError(data.error ?? '오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const inputStyle = {
    borderRadius: 9999,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: '#fff',
  } as React.CSSProperties

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#000' }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full flex flex-col gap-3"
        style={{ maxWidth: 320, padding: '0 24px' }}
      >
        {/* 로고 */}
        <div className="text-center mb-4">
          <div className="text-5xl font-bold mb-2" style={{ color: '#fff', letterSpacing: '-0.03em' }}>
            Tuk
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            자연어 한 줄로 기록하는 라이프로그
          </p>
        </div>

        {/* 탭 */}
        <div
          className="flex p-1 mb-1"
          style={{
            borderRadius: 9999,
            background: 'rgba(255,255,255,0.07)',
          }}
        >
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className="flex-1 py-2 text-sm font-medium transition-all"
              style={{
                borderRadius: 9999,
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#000' : 'rgba(255,255,255,0.35)',
              }}
            >
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {/* 아이디 */}
        <input
          type="text"
          value={id}
          onChange={e => setId(e.target.value)}
          placeholder="아이디"
          autoComplete="username"
          autoFocus
          className="w-full px-4 py-3 text-sm outline-none transition-all"
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
        />

        {/* 비밀번호 */}
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className="w-full px-4 py-3 text-sm outline-none transition-all"
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
        />

        {/* 비밀번호 확인 (회원가입만) */}
        {mode === 'register' && (
          <input
            type="password"
            value={passwordConfirm}
            onChange={e => setPasswordConfirm(e.target.value)}
            placeholder="비밀번호 확인"
            autoComplete="new-password"
            className="w-full px-4 py-3 text-sm outline-none transition-all animate-slide-up"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
          />
        )}

        {/* 에러 */}
        {error && (
          <p className="text-xs text-center animate-slide-up" style={{ color: '#E07FAF' }}>
            {error}
          </p>
        )}

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={loading || !filled}
          className="w-full py-3 text-sm font-semibold transition-all mt-1"
          style={{
            borderRadius: 9999,
            background: filled ? '#fff' : 'rgba(255,255,255,0.10)',
            color: filled ? '#000' : 'rgba(255,255,255,0.25)',
            cursor: filled && !loading ? 'pointer' : 'not-allowed',
            border: 'none',
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              {mode === 'login' ? '로그인 중…' : '가입 중…'}
            </span>
          ) : (
            mode === 'login' ? '로그인' : '가입하기'
          )}
        </button>
      </form>
    </div>
  )
}
