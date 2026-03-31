'use client'

import { useMemo, useState } from 'react'
import { Log, Category } from '@/lib/types'

type ExpensePeriod = '오늘' | '이번주' | '이번달'
const PERIODS: ExpensePeriod[] = ['오늘', '이번주', '이번달']

interface Props {
  logs: Log[]
  activeFilters: Set<Category>
  selectedDate?: string | null
  onClearDate?: () => void
  onOpenDashboard?: () => void
}

export default function StatsPanel({ logs, activeFilters, selectedDate, onClearDate, onOpenDashboard }: Props) {
  const [expensePeriod, setExpensePeriod] = useState<ExpensePeriod>('이번달')

  const cyclePeriod = () => {
    if (selectedDate) { onClearDate?.(); return }
    setExpensePeriod(p => PERIODS[(PERIODS.indexOf(p) + 1) % PERIODS.length])
  }

  const stats = useMemo(() => {
    const now = new Date()
    const todayStr = now.toDateString()
    const currentCycleId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const day = now.getDay()
    const diffToMon = day === 0 ? -6 : 1 - day
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() + diffToMon)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)

    const expenseLogs = logs.filter(l => l.category === '소비' && l.moneyType === '지출' && l.parsedData.value)
    const incomeLogs  = logs.filter(l => l.category === '소비' && l.moneyType === '수입' && l.parsedData.value && l.cycleId === currentCycleId)

    const expenseToday = expenseLogs
      .filter(l => { const t = new Date(l.timestamp); return t >= todayStart && t <= todayEnd })
      .reduce((s, l) => s + (l.parsedData.value ?? 0), 0)
    const expenseWeek = expenseLogs
      .filter(l => { const t = new Date(l.timestamp); return t >= weekStart && t <= weekEnd })
      .reduce((s, l) => s + (l.parsedData.value ?? 0), 0)
    const expenseMonth = expenseLogs
      .filter(l => l.cycleId === currentCycleId)
      .reduce((s, l) => s + (l.parsedData.value ?? 0), 0)

    const totalIncome = incomeLogs.reduce((s, l) => s + (l.parsedData.value ?? 0), 0)
    const balance = totalIncome - expenseMonth

    const todayCalories = logs
      .filter(l => l.category === '식단' && new Date(l.timestamp).toDateString() === todayStr)
      .reduce((s, l) => s + (l.parsedData.calories ?? 0), 0)

    const weekExerciseCalories = logs
      .filter(l => { const t = new Date(l.timestamp); return l.category === '운동' && t >= weekStart && t <= weekEnd })
      .reduce((s, l) => s + (l.parsedData.calories ?? 0), 0)

    const bodyLogs = logs
      .filter(l => l.category === '몸' && l.parsedData.value != null && l.parsedData.unit === 'kg')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const latestBodyValue = bodyLogs[0]?.parsedData.value ?? null

    const expenseSelectedDate = selectedDate
      ? expenseLogs
          .filter(l => {
            const d = new Date(l.timestamp)
            const s = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
            return s === selectedDate
          })
          .reduce((s, l) => s + (l.parsedData.value ?? 0), 0)
      : 0

    return { expenseToday, expenseWeek, expenseMonth, expenseSelectedDate, totalIncome, balance, todayCalories, weekExerciseCalories, latestBodyValue }
  }, [logs, selectedDate])

  const expenseValue = selectedDate
    ? stats.expenseSelectedDate
    : expensePeriod === '오늘' ? stats.expenseToday : expensePeriod === '이번주' ? stats.expenseWeek : stats.expenseMonth

  const af = activeFilters
  const showExpense  = af.size === 0 || af.has('소비')
  const showDiet     = af.size === 0 || af.has('식단')
  const showExercise = af.size === 0 || af.has('운동')
  const showBody     = af.size === 0 || af.has('몸')
  const showRight    = showDiet || showExercise || showBody

  if (!showExpense && !showRight) return null

  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--label3)' }
  const numStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: 'var(--label)', fontVariantNumeric: 'tabular-nums' }
  const unitStyle: React.CSSProperties = { fontSize: 10, color: 'var(--label4)', fontWeight: 400 }

  const badgeLabel = selectedDate
    ? selectedDate.slice(5).replace('-', '.')
    : expensePeriod

  const PeriodBadge = () => (
    <button
      onClick={cyclePeriod}
      style={{
        fontSize: 10, fontWeight: 500, color: 'var(--c-소비)',
        background: 'color-mix(in srgb, var(--c-소비) 12%, transparent)',
        border: '0.5px solid color-mix(in srgb, var(--c-소비) 22%, transparent)',
        borderRadius: 20, padding: '1px 6px', cursor: 'pointer',
        lineHeight: '16px',
      }}
    >
      {badgeLabel}
    </button>
  )

  const ExpenseSection = ({ fullWidth = false }: { fullWidth?: boolean }) => (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5,
      ...(fullWidth ? { flex: 1 } : { flex: 1.2, padding: '13px 14px' }),
      ...(fullWidth && { padding: '13px 16px' }),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={labelStyle}>소비</span>
        <PeriodBadge />
      </div>
      <span
        onClick={expenseValue > 0 ? onOpenDashboard : undefined}
        style={{
          ...numStyle,
          ...(expenseValue > 0 && onOpenDashboard ? { cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 } : {}),
        }}
      >
        {expenseValue > 0 ? `₩${expenseValue.toLocaleString('ko-KR')}` : '—'}
      </span>
      {expensePeriod === '이번달' && stats.totalIncome > 0 && expenseValue > 0 && (
        <div style={{ fontSize: 10, color: stats.balance < 0 ? 'rgba(255,100,90,0.65)' : 'var(--label4)' }}>
          잔여 {stats.balance < 0 ? '-' : ''}₩{Math.abs(stats.balance).toLocaleString('ko-KR')}
        </div>
      )}
    </div>
  )

  const onlyExpense = showExpense && !showRight
  const onlyRight = !showExpense && showRight

  if (onlyExpense) {
    return (
      <div style={{ padding: '0 16px 12px' }}>
        <div className="card" style={{ border: '0.5px solid var(--border)' }}>
          <ExpenseSection fullWidth />
        </div>
      </div>
    )
  }

  if (onlyRight) {
    const sections = [
      showDiet && { label: '식단', value: stats.todayCalories > 0 ? `${stats.todayCalories.toLocaleString()}` : '—', unit: stats.todayCalories > 0 ? 'kcal' : '' },
      showExercise && { label: '운동', value: stats.weekExerciseCalories > 0 ? `${stats.weekExerciseCalories.toLocaleString()}` : '—', unit: stats.weekExerciseCalories > 0 ? 'kcal' : '' },
      showBody && { label: '몸', value: stats.latestBodyValue != null ? `${stats.latestBodyValue}` : '—', unit: stats.latestBodyValue != null ? 'kg' : '' },
    ].filter(Boolean) as { label: string; value: string; unit: string }[]

    return (
      <div style={{ padding: '0 16px 12px' }}>
        <div className="card" style={{ border: '0.5px solid var(--border)', display: 'flex', flexDirection: 'row', alignItems: 'stretch', padding: '13px 0' }}>
          {sections.map((s, i) => (
            <>
              <div key={s.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <span style={labelStyle}>{s.label}</span>
                <span style={numStyle}>{s.value}{s.unit && <span style={unitStyle}> {s.unit}</span>}</span>
              </div>
              {i < sections.length - 1 && (
                <div key={`sep-${i}`} style={{ width: '0.5px', background: 'var(--sep)', alignSelf: 'stretch' }} />
              )}
            </>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 16px 12px' }}>
      <div className="card" style={{ border: '0.5px solid var(--border)', display: 'flex', flexDirection: 'row', alignItems: 'stretch' }}>
        <ExpenseSection />
        <div style={{ width: '0.5px', background: 'var(--sep)', alignSelf: 'stretch' }} />
        <div style={{ flex: 1.8, display: 'flex', flexDirection: 'row', alignItems: 'stretch', padding: '13px 0' }}>
          {showDiet && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <span style={labelStyle}>식단</span>
              <span style={numStyle}>
                {stats.todayCalories > 0 ? <>{stats.todayCalories.toLocaleString()}<span style={unitStyle}> kcal</span></> : '—'}
              </span>
            </div>
          )}
          {showDiet && (showExercise || showBody) && <div style={{ width: '0.5px', background: 'var(--sep)', alignSelf: 'stretch' }} />}
          {showExercise && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <span style={labelStyle}>운동</span>
              <span style={numStyle}>
                {stats.weekExerciseCalories > 0 ? <>{stats.weekExerciseCalories.toLocaleString()}<span style={unitStyle}> kcal</span></> : '—'}
              </span>
            </div>
          )}
          {showExercise && showBody && <div style={{ width: '0.5px', background: 'var(--sep)', alignSelf: 'stretch' }} />}
          {showBody && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <span style={labelStyle}>몸</span>
              <span style={numStyle}>
                {stats.latestBodyValue != null ? <>{stats.latestBodyValue}<span style={unitStyle}> kg</span></> : '—'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
