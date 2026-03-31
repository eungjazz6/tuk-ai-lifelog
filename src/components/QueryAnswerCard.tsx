'use client'

import { useEffect, useState } from 'react'

interface Props {
  message: string
  onClose: () => void
}

export default function QueryAnswerCard({ message, onClose }: Props) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 8000)
    const t2 = setTimeout(() => onClose(), 8400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onClose])

  return (
    <div
      className={fading ? 'animate-fade-out' : 'animate-slide-up'}
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        width: 'min(calc(100vw - 32px), 400px)',
      }}
      onClick={onClose}
    >
      <div style={{
        background: 'var(--bg2)',
        border: '0.5px solid var(--border)',
        borderRadius: 20,
        padding: '14px 18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        cursor: 'pointer',
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--label4)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 8,
        }}>
          답변
        </div>
        <div style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: 'var(--label)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'keep-all',
        }}>
          {message}
        </div>
      </div>
    </div>
  )
}
