'use client'

import { useState, useEffect } from 'react'
import { Category } from '@/lib/types'

const DEFAULT_ORDER: Category[] = ['일정', '소비', '운동', '식단', '몸', '메모']
const STORAGE_KEY = 'tuk-filter-order'

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  '소비': <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 5h12v7a1 1 0 01-1 1H3a1 1 0 01-1-1V5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M5 5V4a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  '식단': <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M5 5c0-1.5 1-3 3-3s3 1.5 3 3c0 2-1.5 3-3 3S5 7 5 5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  '운동': <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 8h2m8 0h2M4 8l1.5-3h5L12 8M4 8l1.5 3h5L12 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  '몸': <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M4 14c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  '일정': <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  '메모': <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 2h10a1 1 0 011 1v10l-3 2H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
}

interface Props {
  activeFilters: Set<Category>
  onToggle: (cat: Category) => void
}

export default function CategoryFilter({ activeFilters, onToggle }: Props) {
  const [order, setOrder] = useState<Category[]>(DEFAULT_ORDER)
  const [editMode, setEditMode] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Category[]
        if (parsed.length === DEFAULT_ORDER.length && DEFAULT_ORDER.every(f => parsed.includes(f)))
          setOrder(parsed)
      }
    } catch {}
  }, [])

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) return
    const next = [...order]
    const [item] = next.splice(dragIdx, 1)
    next.splice(i, 0, item)
    setOrder(next)
    setDragIdx(i)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1.5">
      <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
        {order.map((cat, i) => {
          const isActive = activeFilters.has(cat) && !editMode

          return (
            <button
              key={cat}
              draggable={editMode}
              onDragStart={editMode ? () => setDragIdx(i) : undefined}
              onDragOver={editMode ? (e) => handleDragOver(e, i) : undefined}
              onDragEnd={editMode ? () => setDragIdx(null) : undefined}
              onClick={() => { if (!editMode) onToggle(cat) }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-[6px] rounded-full text-[13px] font-medium transition-all duration-150 select-none"
              style={{
                background: isActive ? `color-mix(in srgb, var(--c-${cat}) 15%, transparent)` : 'linear-gradient(145deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.12) 100%)',
                border: '0.5px solid var(--surface-border)',
                color: isActive ? 'var(--label)' : 'var(--label3)',
                opacity: dragIdx === i ? 0.4 : 1,
                cursor: editMode ? 'grab' : 'pointer',
              }}
            >
              {editMode && <span style={{ color: 'var(--label3)', fontSize: 10 }}>⠿</span>}
              <span style={{ color: isActive ? `var(--c-${cat})` : 'var(--label4)' }}>
                {CATEGORY_ICON[cat]}
              </span>
              <span>{cat}</span>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => setEditMode(v => !v)}
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all"
        style={{
          background: editMode ? 'var(--primary)' : 'var(--bg2)',
          color: editMode ? '#fff' : 'var(--label2)',
        }}
      >
        {editMode ? '✓' : '···'}
      </button>
    </div>
  )
}
