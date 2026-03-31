'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Log, Category, CATEGORY_META } from '@/lib/types'
import InputBar from '@/components/InputBar'
import LogCard from '@/components/LogCard'
import LogGroup from '@/components/LogGroup'
import CategoryFilter from '@/components/CategoryFilter'
import StatsPanel from '@/components/StatsPanel'
import FeedbackToast from '@/components/FeedbackToast'
import QueryAnswerCard from '@/components/QueryAnswerCard'
import CalendarView from '@/components/CalendarView'
import SpendingDashboard from '@/components/SpendingDashboard'

type ViewMode = 'list' | 'month' | 'week'
type Theme = 'dark' | 'light'

export default function Home() {
  const [logs, setLogs] = useState<Log[]>([])
  const [activeFilters, setActiveFilters] = useState<Set<Category>>(new Set())
  const [feedback, setFeedback] = useState<string | null>(null)
  const [queryAnswer, setQueryAnswer] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [feedbackKey, setFeedbackKey] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [theme, setTheme] = useState<Theme>('dark')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeyMasked, setApiKeyMasked] = useState('')
  const [apiKeySaving, setApiKeySaving] = useState(false)
  const [dashboard, setDashboard] = useState<'spending' | null>(null)
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)


  useEffect(() => {
    if (!drawerOpen) return
    fetch('/api/config').then(r => r.json()).then(d => {
      setApiKeyMasked(d.masked ?? '')
    })
  }, [drawerOpen])

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return
    setApiKeySaving(true)
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geminiApiKey: apiKeyInput }),
    })
    setApiKeyMasked(apiKeyInput.slice(0, 8) + '••••••••••••••••••••')
    setApiKeyInput('')
    setApiKeySaving(false)
  }


  useEffect(() => {
    const saved = localStorage.getItem('tuk-theme') as Theme | null
    if (saved) setTheme(saved)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('tuk-theme', theme)
  }, [theme])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/logs')
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) setLogs(data as Log[])
    } catch {}
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useEffect(() => {
    if (logs.length > 0 && viewMode === 'list')
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length, viewMode])

  const toggleFilter = (cat: Category) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const handleSubmit = async (text: string) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, recentLogs: logs.slice(-5) }),
      })
      const data = await res.json() as { feedback: string; queryAnswer?: string; action?: string }
      if (data.queryAnswer) {
        setQueryAnswer(data.queryAnswer)
      } else {
        setFeedback(data.feedback ?? '완료')
        setFeedbackKey(k => k + 1)
      }
      await fetchLogs()
    } catch {
      setFeedback('연결 오류')
      setFeedbackKey(k => k + 1)
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = activeFilters.size === 0
    ? logs
    : logs.filter(l => activeFilters.has(l.category as Category))
  const todayStr = new Date().toDateString()
  const displayed = [...filtered].sort((a, b) => {
    const aIsToday = new Date(a.timestamp).toDateString() === todayStr
    const bIsToday = new Date(b.timestamp).toDateString() === todayStr
    if (aIsToday && !bIsToday) return -1
    if (!aIsToday && bIsToday) return 1
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })

  const grouped = useMemo(() => {
    const map: Record<string, Log[]> = {}
    for (const log of displayed) {
      if (!CATEGORY_META[log.category]) continue
      const key = new Date(log.timestamp).toDateString()
      if (!map[key]) map[key] = []
      map[key].push(log)
    }
    return Object.entries(map)
  }, [displayed])

  const tomorrowSchedules = useMemo(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDateStr = tomorrow.toDateString()
    return logs.filter(l =>
      l.category === '일정' &&
      new Date(l.timestamp).toDateString() === tomorrowDateStr
    )
  }, [logs])

  function sectionLabel(dateStr: string) {
    const d = new Date(dateStr), today = new Date()
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return '오늘'
    if (d.toDateString() === yesterday.toDateString()) return '어제'
    return `${d.getMonth() + 1}월 ${d.getDate()}일`
  }

  const VIEW_ICONS: Record<ViewMode, React.ReactNode> = {
    list: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    month: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="1.5" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9.5" y="1.5" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="1.5" y="9.5" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9.5" y="9.5" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
    week: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M2 6h12" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M6 6v8" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  }

  const SegmentedControl = () => (
    <div className="flex rounded-full p-[3px]"
      style={{ background: 'var(--surface-bg)', border: '0.5px solid var(--surface-border)', boxShadow: 'var(--surface-shadow)' }}>
      {(['list', 'month', 'week'] as ViewMode[]).map(m => (
        <button key={m} onClick={() => setViewMode(m)}
          className="w-8 h-7 rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            background: viewMode === m ? 'rgba(255,255,255,0.18)' : 'transparent',
            color: viewMode === m ? 'var(--label)' : 'var(--label3)',
          }}>
          {VIEW_ICONS[m]}
        </button>
      ))}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 51,
        width: 260,
        background: 'var(--bg)',
        borderRight: '0.5px solid var(--border)',
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        padding: '52px 24px 32px',
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--label)', marginBottom: 32, letterSpacing: '-0.5px' }}>Tuk</div>

        {/* 대시보드 메뉴 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--label4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>대시보드</div>
          <button
            onClick={() => { setDashboard('spending'); setDrawerOpen(false) }}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 12, textAlign: 'left',
              background: 'var(--bg2)', border: '0.5px solid var(--border)',
              color: 'var(--label2)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
            <span style={{ fontSize: 15 }}>💳</span>
            소비 대시보드
          </button>
        </div>


        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--label4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>테마</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['dark', 'light'] as Theme[]).map(t => (
              <button key={t} onClick={() => setTheme(t)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 12,
                  background: theme === t ? 'var(--primary)' : 'var(--bg2)',
                  color: theme === t ? '#fff' : 'var(--label3)',
                  border: theme === t ? 'none' : '0.5px solid var(--border)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}>
                {t === 'dark' ? '다크' : '라이트'}
              </button>
            ))}
          </div>
        </div>

        {/* API 키 설정 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--label4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Gemini API</div>
          {apiKeyMasked && (
            <div style={{ fontSize: 11, color: 'var(--label3)', marginBottom: 6, padding: '4px 8px', background: 'var(--bg2)', borderRadius: 6, fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {apiKeyMasked}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="password"
              placeholder="API 키 입력"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveApiKey()}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 10,
                background: 'var(--bg2)',
                border: '0.5px solid var(--border)',
                color: 'var(--label)',
                fontSize: 12,
                outline: 'none',
              }}
            />
            <button
              onClick={handleSaveApiKey}
              disabled={apiKeySaving || !apiKeyInput.trim()}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                background: apiKeyInput.trim() ? 'var(--primary)' : 'var(--bg2)',
                color: apiKeyInput.trim() ? '#fff' : 'var(--label4)',
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: apiKeyInput.trim() ? 'pointer' : 'default',
              }}
            >
              저장
            </button>
          </div>
        </div>

      </div>

      {dashboard === 'spending' && (
        <SpendingDashboard logs={logs} onBack={() => setDashboard(null)} />
      )}

      {feedback && <FeedbackToast key={feedbackKey} message={feedback} onClose={() => setFeedback(null)} />}
      {queryAnswer && <QueryAnswerCard key={queryAnswer} message={queryAnswer} onClose={() => setQueryAnswer(null)} />}

      <div className="w-full max-w-[680px] mx-auto">

        <main className="flex flex-col min-h-screen">

          <header className="sticky top-0 z-20 px-4 pt-5 pb-3"
            style={{ background: 'var(--bg)', borderBottom: '0.5px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setDrawerOpen(true)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{ background: 'var(--surface-bg)', border: '0.5px solid var(--surface-border)', boxShadow: 'var(--surface-shadow)', color: 'var(--label2)' }}>
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                  <path d="M0 1h16M0 6h11M0 11h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
              <div className="flex items-center gap-2">
                {tomorrowSchedules.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
                    style={{
                      background: 'color-mix(in srgb, var(--c-일정) 15%, transparent)',
                      border: '0.5px solid color-mix(in srgb, var(--c-일정) 30%, transparent)',
                      color: 'var(--c-일정)',
                      maxWidth: 180,
                    }}>
                    <span style={{ fontSize: 10 }}>✦</span>
                    <span className="truncate">
                      내일 {tomorrowSchedules[0].parsedData.item}{tomorrowSchedules.length > 1 ? ` 외 ${tomorrowSchedules.length - 1}개` : ''}
                    </span>
                  </div>
                )}
                <SegmentedControl />
              </div>
            </div>
          </header>

          <div className="pt-3">
            <StatsPanel logs={logs} activeFilters={activeFilters} selectedDate={calendarSelectedDate} onClearDate={() => setCalendarSelectedDate(null)} onOpenDashboard={() => setDashboard('spending')} />
          </div>
          <CategoryFilter activeFilters={activeFilters} onToggle={toggleFilter} />

          {viewMode === 'list' ? (
            <div className="flex-1 overflow-y-auto pb-32">
              {displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2">
                  <div className="text-3xl" style={{ color: 'var(--label3)' }}>✦</div>
                  <p className="text-[15px] font-medium" style={{ color: 'var(--label2)' }}>아직 기록이 없어요</p>
                  <p className="text-[13px]" style={{ color: 'var(--label3)' }}>배떡 이만원, 런닝 5km</p>
                </div>
              ) : (
                <div className="px-4 space-y-3 pt-3">
                  {grouped.map(([dateKey, items]) => {
                    const isToday = new Date(dateKey).toDateString() === new Date().toDateString()
                    return (
                    <div key={dateKey}>
                      <div className="text-[12px] font-semibold tracking-wide mb-2 px-1"
                        style={{ color: 'var(--label3)' }}>
                        {sectionLabel(dateKey)}
                      </div>
                      <div className={isToday ? 'card overflow-hidden' : 'card-dim overflow-hidden'}>
                        {/* inputId로 묶기, 없으면 id 단독 */}
                        {(() => {
                          const groups: Log[][] = []
                          const seen = new Set<string>()
                          for (const log of items) {
                            const key = log.inputId ?? log.id
                            if (seen.has(key)) {
                              const g = groups.find(g => (g[0].inputId ?? g[0].id) === key)
                              g?.push(log)
                            } else {
                              seen.add(key)
                              groups.push([log])
                            }
                          }
                          return groups.map((group, i) => (
                            <div key={group[0].id}>
                              {i > 0 && <div className="ml-[52px] mr-4" style={{ height: '0.5px', background: 'var(--sep)' }} />}
                              <LogGroup logs={group} onRefresh={fetchLogs} />
                            </div>
                          ))
                        })()}
                      </div>
                    </div>
                  )})}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <CalendarView logs={logs} activeFilters={activeFilters} onDelete={fetchLogs} viewMode={viewMode as 'month' | 'week'} selectedDate={calendarSelectedDate} onSelectDate={setCalendarSelectedDate} />
            </div>
          )}
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10"
        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', background: 'var(--bar-bg)' }}>
        <div className="max-w-[680px] mx-auto">
          <InputBar onSubmit={handleSubmit} isLoading={isLoading} autoFocus={false} />
        </div>
      </div>
    </div>
  )
}
