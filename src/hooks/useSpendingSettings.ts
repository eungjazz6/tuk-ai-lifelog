'use client'

import { useState, useEffect, useCallback } from 'react'

export interface CardConfig {
  id: string
  name: string
  resetDay: number // 결제 주기 리셋일 (1~31)
}

export interface SpendingSettingsData {
  monthStartDay: number // 한달 주기 시작일 (1~31)
  cards: CardConfig[]
}

const DEFAULT: SpendingSettingsData = { monthStartDay: 1, cards: [] }
const KEY = 'tuk-spending-settings'

export function useSpendingSettings() {
  const [settings, setSettings] = useState<SpendingSettingsData>(DEFAULT)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setSettings(JSON.parse(raw))
    } catch {}
  }, [])

  const persist = useCallback((next: SpendingSettingsData) => {
    setSettings(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
  }, [])

  const setMonthStartDay = useCallback((day: number) => {
    setSettings(prev => {
      const next = { ...prev, monthStartDay: day }
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const addCard = useCallback((name: string, resetDay: number) => {
    setSettings(prev => {
      const next = { ...prev, cards: [...prev.cards, { id: `${Date.now()}`, name, resetDay }] }
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const removeCard = useCallback((id: string) => {
    setSettings(prev => {
      const next = { ...prev, cards: prev.cards.filter(c => c.id !== id) }
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  return { settings, setMonthStartDay, addCard, removeCard, persist }
}
