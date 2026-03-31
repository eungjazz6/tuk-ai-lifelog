'use client'

import { useState } from 'react'
import { Log } from '@/lib/types'
import LogCard from './LogCard'
import EditLogModal from './EditLogModal'

// ── 작은 아이콘 (20×20용) ───────────────────────────
const ICON: Record<string, React.ReactNode> = {
  '소비': <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 5h12v7a1 1 0 01-1 1H3a1 1 0 01-1-1V5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M5 5V4a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  '식단': <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M5 5c0-1.5 1-3 3-3s3 1.5 3 3c0 2-1.5 3-3 3S5 7 5 5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  '운동': <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 8h2m8 0h2M4 8l1.5-3h5L12 8M4 8l1.5 3h5L12 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  '몸':   <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M4 14c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  '일정': <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  '메모': <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 2h10a1 1 0 011 1v10l-3 2H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
}

function fmtValue(log: Log): string | null {
  const { value, unit, calories } = log.parsedData
  if (unit === 'KRW' && value) return `₩${value.toLocaleString('ko-KR')}`
  if (value && unit && calories && log.category === '운동') return `${value.toLocaleString()} ${unit} · ${calories.toLocaleString()} kcal`
  if (value && unit) return `${value.toLocaleString()} ${unit}`
  if (calories) return `${calories.toLocaleString()} kcal`
  return null
}

interface Props { logs: Log[]; onRefresh: () => void }

export default function LogGroup({ logs, onRefresh }: Props) {
  // 단일 로그면 기존 카드 그대로
  if (logs.length === 1) return <LogCard log={logs[0]} onDelete={onRefresh} />

  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState<Log | null>(null)

  // 로그 중 가장 descriptive한 이름 (가장 긴 item명)
  const title = logs.reduce((best, l) =>
    l.parsedData.item.length > best.length ? l.parsedData.item : best, '')

  async function handleDelete(id: string) {
    await fetch(`/api/logs/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <>
      {editing && <EditLogModal log={editing} onClose={() => setEditing(null)} onSave={onRefresh} />}

      <div
        className="animate-slide-up flex items-center gap-3 px-4 py-2.5"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* 두 아이콘 겹치기 */}
        <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
          {logs.slice(0, 2).map((log, i) => (
            <div key={log.id} style={{
              position: 'absolute',
              ...(i === 0 ? { top: 0, left: 0 } : { bottom: 0, right: 0 }),
              width: 22, height: 22,
              borderRadius: 7,
              background: `color-mix(in srgb, var(--c-${log.category}) 20%, transparent)`,
              color: `var(--c-${log.category})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              outline: '2px solid var(--bg)',
            }}>
              {ICON[log.category]}
            </div>
          ))}
        </div>

        {/* 항목명 */}
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-medium truncate" style={{ color: 'var(--label)' }}>
            {title}
          </div>
        </div>

        {/* 오른쪽: 값들 + 각 로그별 수정/삭제 */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          {logs.map(log => {
            const val = fmtValue(log)
            if (!val && !hovered) return null
            return (
              <div key={log.id} className="flex items-center gap-1.5">
                {val && (
                  <span className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--label)' }}>
                    {val}
                  </span>
                )}
                {/* 카드/현금 뱃지 */}
                {log.category === '소비' && log.moneyType === '지출' && log.paymentMethod && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{
                    background: log.paymentMethod === '카드' ? 'rgba(123,120,238,0.15)' : 'rgba(29,158,117,0.15)',
                    color: log.paymentMethod === '카드' ? 'var(--primary)' : '#1D9E75',
                  }}>
                    {log.paymentMethod}
                  </span>
                )}
                {hovered && (
                  <>
                    <button onClick={() => setEditing(log)}
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(123,120,238,0.14)', color: 'var(--primary)', flexShrink: 0 }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M8.5 1.5a1.414 1.414 0 0 1 2 2L4 10H2v-2L8.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(log.id)}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                      style={{ background: 'rgba(255,59,48,0.14)', color: '#ff453a', flexShrink: 0 }}>
                      ✕
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
