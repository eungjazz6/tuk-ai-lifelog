'use client'

import { useEffect, useState } from 'react'

interface Props { message: string; onClose: () => void }

export default function FeedbackToast({ message, onClose }: Props) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2000)
    const t2 = setTimeout(() => onClose(), 2350)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onClose])

  return (
    <div
      className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none
        px-5 py-2.5 rounded-full text-[13px] font-medium
        ${fading ? 'animate-fade-out' : 'animate-slide-up'}`}
      style={{
        background: 'var(--bg3)',
        color: 'var(--label)',
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </div>
  )
}