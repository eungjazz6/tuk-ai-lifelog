'use client'

import { useMemo, useState } from 'react'
import { Log } from '@/lib/types'
import { useSpendingSettings, CardConfig } from '@/hooks/useSpendingSettings'
import SpendingSettings from './SpendingSettings'

type Period = 'week' | 'month' | 'year'

const SC_COLOR: Record<string, string> = {
  '식비':     '#7B78EE', '교통':     '#9B86D4', '쇼핑':     '#C47FD8',
  '건강비':   '#E07FAF', '구독':     '#E87FA0', '고정지출': '#BA7517',
  '기타지출': '#5F5E5A', '월급':     '#7B78EE', '부수입':   '#9B86D4',
  '용돈':     '#C47FD8', '환급':     '#1D9E75', '기타수입': '#5F5E5A',
  '적금':     '#1D9E75', '주식':     '#185FA5', '코인':     '#E07FAF',
  '펀드':     '#BA7517', '기타투자': '#5F5E5A',
}

// ─── 기간 계산 ────────────────────────────────────────
function getPeriodRange(p: Period, monthStartDay: number): { start: Date; end: Date } {
  const now = new Date()
  if (p === 'week') {
    const day = now.getDay()
    const mon = new Date(now)
    mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    mon.setHours(0, 0, 0, 0)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    sun.setHours(23, 59, 59, 999)
    return { start: mon, end: sun }
  }
  if (p === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), monthStartDay, 0, 0, 0, 0)
    if (start > now) start.setMonth(start.getMonth() - 1)
    const end = new Date(start)
    end.setMonth(end.getMonth() + 1)
    end.setMilliseconds(-1)
    return { start, end }
  }
  return {
    start: new Date(now.getFullYear(), 0, 1),
    end:   new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
  }
}

// ─── 카드 주기 계산 ───────────────────────────────────
function getCardCycles(logs: Log[], resetDay: number) {
  const now = new Date()
  const today = now.getDate()

  const currentStart = new Date(
    today >= resetDay
      ? new Date(now.getFullYear(), now.getMonth(), resetDay)
      : new Date(now.getFullYear(), now.getMonth() - 1, resetDay)
  )
  currentStart.setHours(0, 0, 0, 0)

  const prevStart = new Date(currentStart)
  prevStart.setMonth(prevStart.getMonth() - 1)

  const prevEnd = new Date(currentStart)
  prevEnd.setMilliseconds(-1)

  const currentEnd = new Date()
  currentEnd.setHours(23, 59, 59, 999)

  const calc = (s: Date, e: Date) =>
    logs
      .filter(l => { const d = new Date(l.timestamp); return l.category === '소비' && l.moneyType === '지출' && d >= s && d <= e })
      .reduce((sum, l) => sum + (l.parsedData.value ?? 0), 0)

  return {
    current: calc(currentStart, currentEnd),
    prev:    calc(prevStart, prevEnd),
    cycleStart: currentStart,
  }
}

// ─── 막대 차트 데이터 ─────────────────────────────────
function buildBarData(logs: Log[], p: Period, monthStartDay: number) {
  const { start, end } = getPeriodRange(p, monthStartDay)
  const src = logs.filter(l => {
    const d = new Date(l.timestamp)
    return l.category === '소비' && d >= start && d <= end
  })

  const labels = p === 'week'
    ? ['월','화','수','목','금','토','일']
    : p === 'month'
      ? ['1주','2주','3주','4주','5주']
      : ['1','2','3','4','5','6','7','8','9','10','11','12']

  const getIdx = (d: Date) => {
    if (p === 'week')  { const day = d.getDay(); return day === 0 ? 6 : day - 1 }
    if (p === 'month') return Math.min(Math.floor((d.getDate() - 1) / 7), 4)
    return d.getMonth()
  }

  const data = labels.map(label => ({ label, income: 0, expense: 0 }))
  src.forEach(l => {
    const val = l.parsedData.value ?? 0
    const idx = getIdx(new Date(l.timestamp))
    if (l.moneyType === '수입') data[idx].income += val
    else if (l.moneyType === '지출') data[idx].expense += val
  })
  return data
}

// ─── SVG 도넛 차트 ────────────────────────────────────
function DonutChart({ items, total }: { items: { label: string; value: number; color: string }[]; total: number }) {
  const CX = 100, CY = 100, R = 78, r = 50, GAP = 0.02

  if (total === 0) return (
    <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--label4)', fontSize: 13 }}>지출 내역 없음</div>
  )
  if (items.length === 1) return (
    <svg viewBox="0 0 200 200" width={170} height={170} style={{ display: 'block', margin: '0 auto' }}>
      <circle cx={CX} cy={CY} r={R} fill={items[0].color} opacity={0.88} />
      <circle cx={CX} cy={CY} r={r} fill="var(--bg2)" />
      <CenterLabel total={total} />
    </svg>
  )

  let angle = -Math.PI / 2
  const paths: JSX.Element[] = []
  const labels: JSX.Element[] = []

  items.forEach((seg, i) => {
    const sweep = (seg.value / total) * 2 * Math.PI - GAP
    const end = angle + sweep
    const large = sweep > Math.PI ? 1 : 0
    const x1 = CX + R * Math.cos(angle), y1 = CY + R * Math.sin(angle)
    const x2 = CX + R * Math.cos(end),   y2 = CY + R * Math.sin(end)
    const ix1 = CX + r * Math.cos(end),  iy1 = CY + r * Math.sin(end)
    const ix2 = CX + r * Math.cos(angle),iy2 = CY + r * Math.sin(angle)
    paths.push(
      <path key={i} d={`M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${ix1} ${iy1} A${r} ${r} 0 ${large} 0 ${ix2} ${iy2}Z`}
        fill={seg.color} opacity={0.88} />
    )
    const pct = Math.round(seg.value / total * 100)
    if (pct >= 10) {
      const mid = angle + sweep / 2
      labels.push(
        <text key={`l${i}`} x={CX + (R + 12) * Math.cos(mid)} y={CY + (R + 12) * Math.sin(mid)}
          textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="rgba(255,255,255,0.65)" fontWeight="600">
          {pct}%
        </text>
      )
    }
    angle = end + GAP
  })

  return (
    <svg viewBox="0 0 200 200" width={170} height={170} style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
      {paths}{labels}
      <CenterLabel total={total} />
    </svg>
  )
}

function CenterLabel({ total }: { total: number }) {
  const txt = total >= 10000 ? `${Math.round(total / 10000).toLocaleString()}만` : total.toLocaleString()
  return (
    <>
      <text x={100} y={94} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.4)">지출</text>
      <text x={100} y={110} textAnchor="middle" fontSize={15} fontWeight="700" fill="white">{txt}원</text>
    </>
  )
}

// ─── SVG 막대 차트 ────────────────────────────────────
function BarChart({ data }: { data: { label: string; income: number; expense: number }[] }) {
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1)
  const W = 280, H = 80, n = data.length
  const groupW = W / n
  const bw = Math.min(groupW * 0.27, 11)
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} width="100%" style={{ overflow: 'visible' }}>
      {data.map((d, i) => {
        const cx = (i + 0.5) * groupW
        const ih = (d.income / maxVal) * H, eh = (d.expense / maxVal) * H
        return (
          <g key={i}>
            <rect x={cx - bw - 1.5} y={H - ih} width={bw} height={Math.max(ih, 1)} fill="#7B78EE" rx={2} opacity={0.8} />
            <rect x={cx + 1.5}      y={H - eh} width={bw} height={Math.max(eh, 1)} fill="#E07FAF" rx={2} opacity={0.8} />
            <text x={cx} y={H + 13} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.35)">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── 카드 현황 카드 ───────────────────────────────────
function CardStatusCard({ card, logs }: { card: CardConfig; logs: Log[] }) {
  const { current, prev, cycleStart } = getCardCycles(logs, card.resetDay)
  const fmt = (v: number) =>
    v === 0 ? '0원' : v >= 10000 ? `${Math.round(v / 10000).toLocaleString()}만원` : `${v.toLocaleString()}원`
  const mo = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`

  return (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: 'var(--bg2)', border: '0.5px solid var(--border)', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>💳</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--label)' }}>{card.name}</div>
          <div style={{ fontSize: 11, color: 'var(--label4)' }}>리셋일 매월 {card.resetDay}일 · {mo(cycleStart)}부터</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatBox label="이번 주기 누적" value={fmt(current)} sub="← 다음 달 결제 예정" color="#E07FAF" />
        <StatBox label="지난 주기 합계" value={fmt(prev)} sub="지난달 결제액" color="var(--label3)" />
      </div>
    </div>
  )
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--bg3)', border: '0.5px solid var(--border)' }}>
      <div style={{ fontSize: 10, color: 'var(--label4)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', marginBottom: 3 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--label4)' }}>{sub}</div>
    </div>
  )
}

// ─── 공통 섹션 카드 ───────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14, padding: '16px', borderRadius: 20, background: 'var(--bg2)', border: '0.5px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--label4)', marginBottom: 14, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{title}</div>
      {children}
    </div>
  )
}

function SubcatRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round(value / total * 100) : 0
  const fmt = (v: number) => v >= 10000 ? `${Math.round(v / 10000).toLocaleString()}만원` : `${v.toLocaleString()}원`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: 'var(--label2)', width: 54, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 3, borderRadius: 9999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 9999, background: color, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--label)', fontVariantNumeric: 'tabular-nums', minWidth: 52, textAlign: 'right' }}>{fmt(value)}</span>
      <span style={{ fontSize: 11, color: 'var(--label4)', minWidth: 26, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

// ─── 메인 대시보드 ────────────────────────────────────
export default function SpendingDashboard({ logs, onBack }: { logs: Log[]; onBack: () => void }) {
  const [period, setPeriod] = useState<Period>('month')
  const [showSettings, setShowSettings] = useState(false)
  const { settings } = useSpendingSettings()

  const { start, end } = useMemo(() => getPeriodRange(period, settings.monthStartDay), [period, settings.monthStartDay])

  const filtered = useMemo(() =>
    logs.filter(l => { const d = new Date(l.timestamp); return l.category === '소비' && d >= start && d <= end }),
    [logs, start, end]
  )

  const totalIncome  = useMemo(() => filtered.filter(l => l.moneyType === '수입').reduce((s, l) => s + (l.parsedData.value ?? 0), 0), [filtered])
  const totalExpense = useMemo(() => filtered.filter(l => l.moneyType === '지출').reduce((s, l) => s + (l.parsedData.value ?? 0), 0), [filtered])
  const totalSave    = useMemo(() => filtered.filter(l => l.moneyType === '저축·투자').reduce((s, l) => s + (l.parsedData.value ?? 0), 0), [filtered])
  const balance = totalIncome - totalExpense - totalSave

  const cardTotal = useMemo(() =>
    filtered.filter(l => l.moneyType === '지출' && l.paymentMethod === '카드').reduce((s, l) => s + (l.parsedData.value ?? 0), 0),
    [filtered]
  )
  const cashTotal = useMemo(() =>
    filtered.filter(l => l.moneyType === '지출' && l.paymentMethod === '현금').reduce((s, l) => s + (l.parsedData.value ?? 0), 0),
    [filtered]
  )

  const expenseItems = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.filter(l => l.moneyType === '지출').forEach(l => { const k = l.subCategory ?? '기타지출'; map[k] = (map[k] ?? 0) + (l.parsedData.value ?? 0) })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, color: SC_COLOR[label] ?? '#5F5E5A' }))
  }, [filtered])

  const incomeItems = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.filter(l => l.moneyType === '수입').forEach(l => { const k = l.subCategory ?? '기타수입'; map[k] = (map[k] ?? 0) + (l.parsedData.value ?? 0) })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, color: SC_COLOR[label] ?? '#5F5E5A' }))
  }, [filtered])

  const barData = useMemo(() => buildBarData(logs, period, settings.monthStartDay), [logs, period, settings.monthStartDay])
  const fmtC = (v: number) => v >= 10000 ? `${Math.round(v / 10000).toLocaleString()}만` : v.toLocaleString()

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'var(--bg)', overflowY: 'auto' }}>
      {showSettings && <SpendingSettings onClose={() => setShowSettings(false)} />}

      {/* 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 1,
        background: 'var(--bg)', borderBottom: '0.5px solid var(--border)',
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'var(--bg2)', border: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--label2)', flexShrink: 0,
        }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: 'var(--label)' }}>소비 대시보드</span>
        {/* 설정 아이콘 */}
        <button onClick={() => setShowSettings(true)} style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'var(--bg2)', border: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--label3)', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.6"/>
          </svg>
        </button>
      </div>

      <div style={{ padding: '20px 20px 60px', maxWidth: 480, margin: '0 auto' }}>

        {/* 기간 선택 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['week','month','year'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '6px 14px', borderRadius: 9999, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: period === p ? 'var(--primary)' : 'var(--bg2)',
              color:      period === p ? '#fff' : 'var(--label3)',
              border:     period === p ? 'none' : '0.5px solid var(--border)',
            }}>
              {p === 'week' ? '이번 주' : p === 'month' ? '이번 달' : '올해'}
            </button>
          ))}
        </div>

        {/* 요약 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
          {[['수입', totalIncome, '#7B78EE'], ['지출', totalExpense, '#E07FAF'], ['저축', totalSave, '#1D9E75']].map(([label, value, color]) => (
            <div key={label as string} style={{ padding: '14px 10px', borderRadius: 18, background: 'var(--bg2)', border: '0.5px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--label4)', marginBottom: 6 }}>{label as string}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: color as string, fontVariantNumeric: 'tabular-nums' }}>
                {fmtC(value as number)}<span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7, marginLeft: 1 }}>원</span>
              </div>
            </div>
          ))}
        </div>

        {/* 순수익 */}
        <div style={{
          padding: '11px 16px', borderRadius: 14, marginBottom: 16,
          background: 'var(--bg2)', border: '0.5px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: 'var(--label3)' }}>순수익</span>
          <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: balance >= 0 ? '#7B78EE' : '#E07FAF' }}>
            {balance >= 0 ? '+' : ''}{fmtC(balance)}원
          </span>
        </div>

        {/* 결제 수단 */}
        {(cardTotal > 0 || cashTotal > 0) && (
          <SectionCard title="결제 수단">
            {[
              { label: '카드', value: cardTotal, color: 'var(--primary)' },
              { label: '현금', value: cashTotal, color: '#1D9E75' },
            ].map(({ label, value, color }) => (
              <SubcatRow key={label} label={label} value={value} total={totalExpense} color={color} />
            ))}
          </SectionCard>
        )}

        {/* 도넛 차트 */}
        <SectionCard title="지출 구성">
          <DonutChart items={expenseItems} total={totalExpense} />
          {expenseItems.length > 0 && (
            <div style={{ marginTop: 18 }}>
              {expenseItems.map(({ label, value, color }) => (
                <SubcatRow key={label} label={label} value={value} total={totalExpense} color={color} />
              ))}
            </div>
          )}
        </SectionCard>

        {/* 막대 차트 */}
        <SectionCard title="수입 / 지출 추이">
          <BarChart data={barData} />
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            {[['#7B78EE','수입'],['#E07FAF','지출']].map(([color,label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: 12, color: 'var(--label3)' }}>{label}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 수입 내역 */}
        {incomeItems.length > 0 && (
          <SectionCard title="수입 내역">
            {incomeItems.map(({ label, value, color }) => (
              <SubcatRow key={label} label={label} value={value} total={totalIncome} color={color} />
            ))}
          </SectionCard>
        )}

        {/* 내 카드 현황 */}
        {settings.cards.length > 0 && (
          <SectionCard title="내 카드 현황">
            {settings.cards.map(card => (
              <CardStatusCard key={card.id} card={card} logs={logs} />
            ))}
          </SectionCard>
        )}

      </div>
    </div>
  )
}
