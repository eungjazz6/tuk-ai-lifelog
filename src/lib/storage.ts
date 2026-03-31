import fs from 'fs'
import path from 'path'
import { Log } from './types'

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'logs.json')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

interface AppConfig {
  geminiApiKey?: string
}

export function readConfig(): AppConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {}
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) as AppConfig
  } catch {
    return {}
  }
}

export function writeConfig(config: AppConfig): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

export function getGeminiApiKey(): string {
  const config = readConfig()
  return config.geminiApiKey ?? ''
}

function ensureFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8')
  } catch {}
}

export function readLogs(): Log[] {
  try {
    ensureFile()
    if (!fs.existsSync(DATA_FILE)) return []
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as Log[]
  } catch {
    return []
  }
}

export function writeLogs(logs: Log[]): void {
  try {
    ensureFile()
    fs.writeFileSync(DATA_FILE, JSON.stringify(logs, null, 2), 'utf-8')
  } catch {}
}

export function addLog(log: Log): void {
  const logs = readLogs()
  logs.push(log)
  writeLogs(logs)
}

export function updateLog(id: string, updates: Partial<Log>): Log | null {
  const logs = readLogs()
  const idx = logs.findIndex(l => l.id === id)
  if (idx === -1) return null
  logs[idx] = { ...logs[idx], ...updates, isModified: true }
  writeLogs(logs)
  return logs[idx]
}

export function deleteLog(id: string): boolean {
  const logs = readLogs()
  const idx = logs.findIndex(l => l.id === id)
  if (idx === -1) return false
  logs.splice(idx, 1)
  writeLogs(logs)
  return true
}

export function findLastLog(): Log | undefined {
  const logs = readLogs()
  return logs[logs.length - 1]
}

export function findLogByKeyword(keyword: string): Log | undefined {
  const logs = readLogs()
  const todayStr = new Date().toDateString()
  const keywords = keyword.toLowerCase().split(/\s+/)

  const matches = (log: Log) =>
    keywords.some(
      kw =>
        log.sourceText.toLowerCase().includes(kw) ||
        log.parsedData.item.toLowerCase().includes(kw),
    )

  // Today's logs first
  const todayHit = [...logs]
    .reverse()
    .find(l => new Date(l.timestamp).toDateString() === todayStr && matches(l))
  if (todayHit) return todayHit

  // Fall back to any log
  return [...logs].reverse().find(matches)
}
