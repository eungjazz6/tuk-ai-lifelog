'use client'

import { useState } from 'react'
import { useSpendingSettings } from '@/hooks/useSpendingSettings'

interface Props {
  onClose: () => void
}

export default function SpendingSettings({ onClose }: Props) {
  const { settings, setMonthStartDay, addCard, removeCard } = useSpendingSettings()
  const [cardName, setCardName] = useState('')
  const [cardResetDay, setCardResetDay] = useState('')
  const [addError, setAddError] = useState('')

  const now = new Date()
  const startDay = settings.monthStartDay
  // 이번 달 주기 표시
  const cycleStart = new Date(now.getFullYear(), now.getMonth(), startDay)
  if (cycleStart > now) cycleStart.setMonth(cycleStart.getMonth() - 1)
  const cycleEnd = new Date(cycleStart)
  cycleEnd.setMonth(cycleEnd.getMonth() + 1)
  cycleEnd.setDate(cycleEnd.getDate() - 1)
  const fmt = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`

  function handleAddCard() {
    const name = cardName.trim()
    const day = parseInt(cardResetDay)
    if (!name) { setAddError('카드 이름을 입력해주세요.'); return }
    if (!day || day < 1 || day > 31) { setAddError('리셋일은 1~31 사이로 입력해주세요.'); return }
    addCard(name, day)
    setCardName('')
    setCardResetDay('')
    setAddError('')
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg3)', border: '0.5px solid var(--border)',
    borderRadius: 10, color: 'var(--label)', fontSize: 14,
    padding: '10px 12px', outline: 'none', width: '100%',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 70,
      background: 'var(--bg)',
      overflowY: 'auto',
      animation: 'slideInRight 0.22s cubic-bezier(0.22,1,0.36,1)',
    }}>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

      {/* 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 1,
        background: 'var(--bg)', borderBottom: '0.5px solid var(--border)',
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'var(--bg2)', border: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--label2)', flexShrink: 0,
        }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--label)' }}>대시보드 설정</span>
      </div>

      <div style={{ padding: '24px 20px 60px', maxWidth: 480, margin: '0 auto' }}>

        {/* ─── 한달 주기 ─────────────────────────── */}
        <Section title="한달 주기">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 14, color: 'var(--label2)' }}>매월</span>
            <input
              type="number" min={1} max={31}
              value={startDay}
              onChange={e => {
                const v = parseInt(e.target.value)
                if (v >= 1 && v <= 31) setMonthStartDay(v)
              }}
              style={{ ...inputStyle, width: 64, textAlign: 'center' }}
            />
            <span style={{ fontSize: 14, color: 'var(--label2)' }}>일부터 한달로 계산</span>
          </div>
          <div style={{
            fontSize: 12, color: 'var(--label4)',
            background: 'var(--bg2)', borderRadius: 10, padding: '8px 12px',
          }}>
            이번 달: {fmt(cycleStart)} ~ {fmt(cycleEnd)}
          </div>
        </Section>

        {/* ─── 카드 추가 ──────────────────────────── */}
        <Section title="카드 추가">
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              placeholder="카드 이름"
              value={cardName}
              onChange={e => { setCardName(e.target.value); setAddError('') }}
              style={{ ...inputStyle, flex: 1 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <input
                type="number" min={1} max={31}
                placeholder="리셋일"
                value={cardResetDay}
                onChange={e => { setCardResetDay(e.target.value); setAddError('') }}
                style={{ ...inputStyle, width: 64, textAlign: 'center' }}
              />
              <span style={{ fontSize: 13, color: 'var(--label3)', whiteSpace: 'nowrap' }}>일</span>
            </div>
          </div>
          {addError && (
            <p style={{ fontSize: 12, color: '#E07FAF', marginBottom: 8 }}>{addError}</p>
          )}
          <button
            onClick={handleAddCard}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 10,
              background: 'var(--primary)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
            }}>
            + 카드 추가
          </button>
        </Section>

        {/* ─── 카드 목록 ──────────────────────────── */}
        {settings.cards.length > 0 && (
          <Section title="내 카드">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {settings.cards.map(card => (
                <div key={card.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 12,
                  background: 'var(--bg3)', border: '0.5px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>💳</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--label)' }}>{card.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--label4)', marginTop: 2 }}>리셋일 매월 {card.resetDay}일</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeCard(card.id)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)', border: '0.5px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'var(--label3)', flexShrink: 0,
                    }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </Section>
        )}

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--label4)', marginBottom: 12, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {title}
      </div>
      {children}
    </div>
  )
}
