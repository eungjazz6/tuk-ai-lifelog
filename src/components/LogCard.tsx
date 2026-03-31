'use client'

import { useState } from 'react'
import { Log } from '@/lib/types'
import EditLogModal from './EditLogModal'

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  '소비': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 5h12v7a1 1 0 01-1 1H3a1 1 0 01-1-1V5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M5 5V4a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  '식단': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v12M5 5c0-1.5 1-3 3-3s3 1.5 3 3c0 2-1.5 3-3 3S5 7 5 5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  '운동': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 8h2m8 0h2M4 8l1.5-3h5L12 8M4 8l1.5 3h5L12 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  '몸': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M4 14c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  '일정': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  '메모': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 2h10a1 1 0 011 1v10l-3 2H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
}


function formatValue(value?: number, unit?: string, calories?: number, category?: string): string | null {
  if (unit === 'KRW' && value) return `₩${value.toLocaleString('ko-KR')}`
  if (value && unit && calories && category === '운동')
    return `${value.toLocaleString()} ${unit} · ${calories.toLocaleString()} kcal`
  if (value && unit) return `${value.toLocaleString()} ${unit}`
  if (calories) return `${calories.toLocaleString()} kcal`
  return null
}

interface Props { log: Log; onDelete: () => void }

export default function LogCard({ log, onDelete }: Props) {
  const [deleting, setDeleting] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)

  const color = `var(--c-${log.category})`
  const icon = CATEGORY_ICON[log.category]
  const valueStr = formatValue(log.parsedData.value, log.parsedData.unit, log.parsedData.calories, log.category)

  if (!icon) return null

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`/api/logs/${log.id}`, { method: 'DELETE' })
      onDelete()
    } catch { setDeleting(false) }
  }

  return (
    <>
    {editing && <EditLogModal log={log} onClose={() => setEditing(false)} onSave={onDelete} />}
    <div
      className="animate-slide-up flex items-center gap-3 px-4 py-2.5 transition-opacity"
      style={{ opacity: deleting ? 0.3 : 1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
        style={{
          background: `color-mix(in srgb, ${color} 18%, transparent)`,
          color,
        }}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium truncate" style={{ color: 'var(--label)' }}>
          {log.parsedData.item}
        </div>
      </div>

      <div className="flex-shrink-0 text-right flex items-center gap-2">
        <div className="flex flex-col items-end gap-1">
          {valueStr && (
            <div className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--label)' }}>
              {valueStr}
            </div>
          )}
          {log.category === '소비' && log.moneyType === '지출' && log.paymentMethod && (
            <div className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                background: log.paymentMethod === '카드'
                  ? 'rgba(123,120,238,0.15)'
                  : 'rgba(29,158,117,0.15)',
                color: log.paymentMethod === '카드'
                  ? 'var(--primary)'
                  : '#1D9E75',
              }}>
              {log.paymentMethod}
            </div>
          )}
        </div>
        {hovered && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              className="w-5 h-5 rounded-full flex items-center justify-center transition-opacity"
              style={{ background: 'rgba(123,120,238,0.14)', color: 'var(--primary)' }}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M8.5 1.5a1.414 1.414 0 0 1 2 2L4 10H2v-2L8.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-opacity"
              style={{ background: 'rgba(255,59,48,0.14)', color: '#ff453a' }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  )
}