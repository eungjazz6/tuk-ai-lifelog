'use client'

import { useState, useMemo } from 'react'
import { Log, CATEGORY_META, Category } from '@/lib/types'
import LogCard from './LogCard'

interface Props {
  logs: Log[]
  activeFilters: Set<Category>
  onDelete: () => void
  viewMode: 'month' | 'week'
  selectedDate: string | null
  onSelectDate: (date: string | null) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']


const DOW_COLOR = (dow: number) =>
  dow === 0 ? 'rgba(255,69,58,0.55)' : dow === 6 ? 'rgba(91,87,232,0.7)' : 'var(--label3)'

function toLocalDateStr(timestamp: string): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function dateToStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function CalendarView({ logs, activeFilters, onDelete, viewMode, selectedDate, onSelectDate }: Props) {
  const today = new Date()
  const todayStr = toLocalDateStr(today.toISOString())

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [weekBase, setWeekBase] = useState<Date>(getMonday(today))

  const filteredLogs = useMemo(() =>
    activeFilters.size === 0 ? logs : logs.filter(l => activeFilters.has(l.category as Category)),
    [logs, activeFilters]
  )

  const logsByDate = useMemo(() => {
    const map: Record<string, Log[]> = {}
    for (const log of filteredLogs) {
      if (!CATEGORY_META[log.category]) continue
      const key = toLocalDateStr(log.timestamp)
      if (!map[key]) map[key] = []
      map[key].push(log)
    }
    return map
  }, [filteredLogs])

  const selectedLogs = selectedDate ? (logsByDate[selectedDate] ?? []) : []

  // ── 월간 뷰 ─────────────────────────────────────────────
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    onSelectDate(null)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    onSelectDate(null)
  }

  // ── 주간 뷰 ─────────────────────────────────────────────
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekBase, i))
  const prevWeek = () => setWeekBase(d => addDays(d, -7))
  const nextWeek = () => setWeekBase(d => addDays(d, 7))

  const weekLabel = (() => {
    const start = weekDays[0]
    const end = weekDays[6]
    if (start.getMonth() === end.getMonth())
      return `${start.getFullYear()}년 ${start.getMonth() + 1}월`
    return `${start.getMonth() + 1}월 ~ ${end.getMonth() + 1}월`
  })()

  // ── 공통: 선택 날짜 로그 패널 ───────────────────────────
  const LogPanel = () => (
    selectedDate ? (
      selectedLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 mt-4">
          <div className="text-3xl" style={{ color: 'var(--label3)' }}>✦</div>
          <p className="text-[15px] font-medium" style={{ color: 'var(--label2)' }}>아직 기록이 없어요</p>
          <p className="text-[13px]" style={{ color: 'var(--label3)' }}>배떡 이만원, 런닝 5km</p>
        </div>
      ) : (
        <div className="mt-4 mx-4 card rounded-2xl overflow-hidden">
          <div className="px-4 pt-3 pb-1">
            <span className="text-[11px] font-semibold tracking-wide" style={{ color: 'var(--label4)' }}>
              {selectedDate.slice(5).replace('-', '월 ')}일 · {selectedLogs.length}개
            </span>
          </div>
          <div>
            {[...selectedLogs].reverse().map((log, i) => (
              <div key={log.id}>
                {i > 0 && <div className="ml-[52px] mr-4" style={{ height: '0.5px', background: 'var(--sep)' }} />}
                <LogCard log={log} onDelete={onDelete} />
              </div>
            ))}
          </div>
        </div>
      )
    ) : null
  )

  // ── 날짜 셀 내 항목명 미리보기 ───────────────────────────
  const ItemPreview = ({ dateStr }: { dateStr: string }) => {
    const items = logsByDate[dateStr] ?? []
    if (items.length === 0) return null
    const show = items.slice(0, 2)
    const extra = items.length - 2
    return (
      <div className="w-full px-0.5 flex flex-col gap-[2px] mt-0.5">
        {show.map(log => {
          const c = `var(--c-${log.category})`
          return (
            <div key={log.id}
              className="truncate text-center"
              style={{ fontSize: 9, color: c, background: `color-mix(in srgb, ${c} 20%, transparent)`, borderRadius: 4, padding: '1px 3px' }}>
              {log.parsedData.item}
            </div>
          )
        })}
        {extra > 0 && (
          <div className="text-center" style={{ fontSize: 9, color: 'var(--label4)' }}>+{extra}</div>
        )}
      </div>
    )
  }

  if (viewMode === 'month') {
    return (
      <div className="pb-32 lg:pb-6">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full text-xl"
            style={{ color: 'var(--label2)', background: 'var(--bg2)' }}>‹</button>
          <span className="text-[16px] font-semibold" style={{ color: 'var(--label)' }}>{year}년 {month + 1}월</span>
          <button onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full text-xl"
            style={{ color: 'var(--label2)', background: 'var(--bg2)' }}>›</button>
        </div>

        <div className="grid grid-cols-7 px-2 mb-1">
          {WEEKDAYS.map((d, i) => (
            <div key={d} className="text-center text-[12px] font-medium py-1"
              style={{ color: DOW_COLOR(i) }}>
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 px-2 gap-y-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const dow = (firstDay + day - 1) % 7

            return (
              <button key={dateStr} onClick={() => onSelectDate(isSelected ? null : dateStr)}
                className="flex flex-col items-center py-1 rounded-2xl transition-all duration-100"
                style={{ background: isSelected ? 'color-mix(in srgb, var(--primary) 18%, transparent)' : 'transparent', minHeight: 64 }}>
                <div
                  className="w-8 h-8 flex items-center justify-center rounded-full text-[14px]"
                  style={{
                    color: isToday ? 'var(--primary)' : DOW_COLOR(dow),
                    fontWeight: isToday || isSelected ? 700 : 400,
                  }}>
                  {day}
                </div>
                <ItemPreview dateStr={dateStr} />
              </button>
            )
          })}
        </div>

        <LogPanel />
      </div>
    )
  }

  // ── 주간 뷰 ─────────────────────────────────────────────
  return (
    <div className="pb-32 lg:pb-6">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={prevWeek}
          className="w-8 h-8 flex items-center justify-center rounded-full text-xl"
          style={{ color: 'var(--label2)', background: 'var(--bg2)' }}>‹</button>
        <span className="text-[16px] font-semibold" style={{ color: 'var(--label)' }}>{weekLabel}</span>
        <button onClick={nextWeek}
          className="w-8 h-8 flex items-center justify-center rounded-full text-xl"
          style={{ color: 'var(--label2)', background: 'var(--bg2)' }}>›</button>
      </div>

      <div className="grid grid-cols-7 px-2 gap-x-1">
        {weekDays.map(date => {
          const dateStr = dateToStr(date)
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const dow = date.getDay()

          return (
            <button key={dateStr} onClick={() => onSelectDate(isSelected ? null : dateStr)}
              className="flex flex-col items-center py-1 rounded-2xl transition-all duration-100"
              style={{ background: isSelected ? 'color-mix(in srgb, var(--primary) 18%, transparent)' : 'transparent', minHeight: 64 }}>
              <div className="text-[11px] font-medium mb-1"
                style={{ color: DOW_COLOR(dow) }}>
                {WEEKDAYS[dow]}
              </div>
              <div
                className="w-8 h-8 flex items-center justify-center rounded-full text-[14px]"
                style={{
                  color: isToday ? 'var(--primary)' : dow === 0 ? '#FF453A' : dow === 6 ? 'var(--primary)' : 'var(--label)',
                  fontWeight: isToday || isSelected ? 700 : 400,
                }}>
                {date.getDate()}
              </div>
              <ItemPreview dateStr={dateStr} />
            </button>
          )
        })}
      </div>

      <LogPanel />
    </div>
  )
}
