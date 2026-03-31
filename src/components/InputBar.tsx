'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  onSubmit: (text: string) => Promise<void>
  isLoading: boolean
  autoFocus?: boolean
}

const GLASS = 'var(--surface-bg)'
const GLASS_BORDER = '0.5px solid var(--surface-border)'
const GLASS_SHADOW = 'var(--surface-shadow)'

export default function InputBar({ onSubmit, isLoading, autoFocus = true }: Props) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    setText('')
    await onSubmit(trimmed)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  const hasText = text.trim().length > 0

  return (
    <div style={{
      padding: '8px 16px',
      paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {/* + 버튼 */}
      <button
        style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: GLASS, border: GLASS_BORDER, boxShadow: GLASS_SHADOW,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--label2)', cursor: 'pointer',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>

      {/* 입력창 */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 8,
        background: GLASS, borderRadius: 22, padding: '0 14px',
        height: 44, border: GLASS_BORDER, boxShadow: GLASS_SHADOW,
      }}>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="일상을 툭 던져봐!"
          disabled={isLoading}
          className="flex-1 bg-transparent outline-none disabled:opacity-40"
          style={{ fontSize: 15, color: 'var(--label)', border: 'none' }}
        />
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ color: 'var(--label3)', flexShrink: 0 }}>
          <rect x="5" y="1" width="6" height="9" rx="3" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M2 9c0 3.314 2.686 5 6 5s6-1.686 6-5M8 14v1.5"
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </div>

      {/* 전송 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={isLoading}
        style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: hasText && !isLoading ? 'var(--primary)' : 'var(--label)',
          border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: hasText ? 'pointer' : 'default',
          transition: 'background 0.15s',
        }}
      >
        {isLoading ? (
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"
            style={{ color: 'var(--bg)' }}>
            <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
            <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : hasText ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#fff' }}>
            <path d="M12 3l8 8h-5v10H9V11H4l8-8z"/>
          </svg>
        ) : (
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none"
            style={{ color: 'var(--bg)' }}>
            <path d="M1 6h2M4 2v8M7 1v10M10 2v8M13 4v4" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </button>
    </div>
  )
}
