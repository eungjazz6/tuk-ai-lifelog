'use client'

import { useState } from 'react'
import { Log, Category, MoneyType, SubCategory, PaymentMethod, CATEGORY_META } from '@/lib/types'

const CATEGORIES: Category[] = ['소비', '식단', '운동', '몸', '일정', '메모']

const UNITS: Record<Category, string[]> = {
  '소비': ['KRW'],
  '식단': ['kcal', 'g', 'ml'],
  '운동': ['km', 'min', 'hr', '회', 'kcal'],
  '몸':   ['kg', '%', 'hr', 'min'],
  '일정': [],
  '메모': [],
}

const MONEY_TYPES: MoneyType[] = ['지출', '수입', '저축·투자']

const SUB_CATEGORIES: Record<MoneyType, SubCategory[]> = {
  '지출':     ['식비','교통','쇼핑','건강비','구독','고정지출','기타지출'],
  '수입':     ['월급','부수입','용돈','환급','기타수입'],
  '저축·투자': ['적금','주식','코인','펀드','기타투자'],
}

interface Props {
  log: Log
  onClose: () => void
  onSave: () => void
}

export default function EditLogModal({ log, onClose, onSave }: Props) {
  const [category, setCategory]   = useState<Category>(log.category)
  const [item, setItem]           = useState(log.parsedData.item)
  const [value, setValue]         = useState(log.parsedData.value?.toString() ?? '')
  const [unit, setUnit]           = useState(log.parsedData.unit ?? '')
  const [calories, setCalories]   = useState(log.parsedData.calories?.toString() ?? '')
  const [notes, setNotes]         = useState(log.parsedData.notes ?? '')
  const [datetime, setDatetime]   = useState(
    log.parsedData.datetime
      ? log.parsedData.datetime.slice(0, 10)
      : new Date(log.timestamp).toISOString().slice(0, 10)
  )
  const [moneyType, setMoneyType]         = useState<MoneyType>(log.moneyType ?? '지출')
  const [subCategory, setSubCategory]     = useState<SubCategory | ''>(log.subCategory ?? '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(log.paymentMethod ?? '카드')
  const [saving, setSaving] = useState(false)

  // 카테고리 바뀌면 unit 초기화
  function handleCategoryChange(cat: Category) {
    setCategory(cat)
    const units = UNITS[cat]
    setUnit(units[0] ?? '')
  }

  async function handleSave() {
    if (!item.trim()) return
    setSaving(true)
    const body: Partial<Log> = {
      category,
      parsedData: {
        ...log.parsedData,
        item: item.trim(),
        value: value !== '' ? Number(value) : undefined,
        unit: unit || undefined,
        calories: calories !== '' ? Number(calories) : undefined,
        notes: notes.trim() || undefined,
        datetime: datetime || undefined,
      },
      timestamp: datetime
        ? new Date(`${datetime}T${new Date(log.timestamp).toTimeString().slice(0,8)}`).toISOString()
        : log.timestamp,
      ...(category === '소비' && {
        moneyType,
        subCategory: subCategory || undefined,
        paymentMethod: moneyType === '지출' ? paymentMethod : undefined,
      }),
    }
    await fetch(`/api/logs/${log.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    onSave()
    onClose()
  }

  const color = CATEGORY_META[category].color
  const pill: React.CSSProperties = {
    padding: '5px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500,
    cursor: 'pointer', border: 'none', transition: 'all 0.15s',
  }
  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 12,
    background: 'var(--bg3)', border: '0.5px solid var(--border)',
    color: 'var(--label)', fontSize: 14, outline: 'none',
  }

  return (
    <>
      {/* 오버레이 */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
      />

      {/* 바텀 시트 */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 81,
        background: 'var(--bg)',
        borderTop: '0.5px solid var(--border)',
        borderRadius: '20px 20px 0 0',
        padding: '0 0 env(safe-area-inset-bottom)',
        maxHeight: '92dvh',
        overflowY: 'auto',
        animation: 'sheetUp 0.25s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <style>{`@keyframes sheetUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>

        {/* 핸들 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 9999, background: 'var(--border)' }} />
        </div>

        <div style={{ padding: '8px 20px 32px' }}>

          {/* 제목 */}
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--label)', marginBottom: 20 }}>기록 수정</div>

          {/* 카테고리 */}
          <Label>카테고리</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
            {CATEGORIES.map(cat => {
              const active = category === cat
              const c = CATEGORY_META[cat].color
              return (
                <button key={cat} onClick={() => handleCategoryChange(cat)} style={{
                  ...pill,
                  background: active ? `color-mix(in srgb, ${c} 20%, transparent)` : 'var(--bg2)',
                  color: active ? c : 'var(--label3)',
                  border: active ? `0.5px solid color-mix(in srgb, ${c} 40%, transparent)` : '0.5px solid var(--border)',
                }}>
                  {cat}
                </button>
              )
            })}
          </div>

          {/* 항목명 */}
          <Label>항목</Label>
          <input value={item} onChange={e => setItem(e.target.value)} style={{ ...inp, marginBottom: 14 }} placeholder="항목명" />

          {/* 날짜 */}
          <Label>날짜</Label>
          <input type="date" value={datetime} onChange={e => setDatetime(e.target.value)}
            style={{ ...inp, marginBottom: 14, colorScheme: 'dark' }} />

          {/* 값 + 단위 */}
          {UNITS[category].length > 0 && (
            <>
              <Label>수치</Label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input type="number" value={value} onChange={e => setValue(e.target.value)}
                  style={{ ...inp, flex: 1 }} placeholder="값" />
                {UNITS[category].length > 1 ? (
                  <select value={unit} onChange={e => setUnit(e.target.value)}
                    style={{ ...inp, width: 80, flex: 'none' }}>
                    {UNITS[category].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                ) : (
                  <div style={{ ...inp, width: 70, flex: 'none', color: 'var(--label3)', textAlign: 'center' }}>
                    {UNITS[category][0]}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 칼로리 (식단·운동) */}
          {(category === '식단' || category === '운동') && (
            <>
              <Label>칼로리 (kcal)</Label>
              <input type="number" value={calories} onChange={e => setCalories(e.target.value)}
                style={{ ...inp, marginBottom: 14 }} placeholder="kcal" />
            </>
          )}

          {/* 소비 세부 */}
          {category === '소비' && (
            <>
              <Label>유형</Label>
              <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
                {MONEY_TYPES.map(mt => (
                  <button key={mt} onClick={() => { setMoneyType(mt); setSubCategory('') }} style={{
                    ...pill,
                    background: moneyType === mt ? 'var(--primary)' : 'var(--bg2)',
                    color: moneyType === mt ? '#fff' : 'var(--label3)',
                    border: moneyType === mt ? 'none' : '0.5px solid var(--border)',
                  }}>
                    {mt}
                  </button>
                ))}
              </div>

              <Label>서브 카테고리</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
                {SUB_CATEGORIES[moneyType].map(sc => (
                  <button key={sc} onClick={() => setSubCategory(sc)} style={{
                    ...pill,
                    background: subCategory === sc ? `color-mix(in srgb, ${color} 20%, transparent)` : 'var(--bg2)',
                    color: subCategory === sc ? color : 'var(--label3)',
                    border: subCategory === sc ? `0.5px solid color-mix(in srgb, ${color} 40%, transparent)` : '0.5px solid var(--border)',
                  }}>
                    {sc}
                  </button>
                ))}
              </div>

              {moneyType === '지출' && (
                <>
                  <Label>결제 수단</Label>
                  <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
                    {(['카드', '현금'] as PaymentMethod[]).map(pm => (
                      <button key={pm} onClick={() => setPaymentMethod(pm)} style={{
                        ...pill,
                        background: paymentMethod === pm ? `color-mix(in srgb, ${pm === '카드' ? '#7B78EE' : '#1D9E75'} 20%, transparent)` : 'var(--bg2)',
                        color: paymentMethod === pm ? (pm === '카드' ? '#7B78EE' : '#1D9E75') : 'var(--label3)',
                        border: paymentMethod === pm ? `0.5px solid color-mix(in srgb, ${pm === '카드' ? '#7B78EE' : '#1D9E75'} 40%, transparent)` : '0.5px solid var(--border)',
                      }}>
                        {pm}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* 메모 */}
          <Label>메모</Label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            style={{ ...inp, resize: 'none', marginBottom: 20 }} placeholder="추가 메모 (선택)" />

          {/* 버튼 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: '13px 0', borderRadius: 14,
              background: 'var(--bg2)', border: '0.5px solid var(--border)',
              color: 'var(--label3)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}>
              취소
            </button>
            <button onClick={handleSave} disabled={saving || !item.trim()} style={{
              flex: 2, padding: '13px 0', borderRadius: 14,
              background: saving || !item.trim() ? 'rgba(123,120,238,0.3)' : 'var(--primary)',
              color: saving || !item.trim() ? 'rgba(255,255,255,0.4)' : '#fff',
              fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              border: 'none',
            }}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--label4)', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
      {children}
    </div>
  )
}
